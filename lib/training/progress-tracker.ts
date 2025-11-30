/**
 * Training Progress Tracker
 * Tracks training progress, handles checkpointing, and provides recovery
 * capabilities in case of failures during the training process.
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Error information during training
 */
export interface TrainingError {
  candidateId?: string;
  policyArea?: string;
  error: string;
  timestamp: Date;
  retryAttempt?: number;
}

/**
 * Progress information for a single candidate
 */
export interface CandidateProgress {
  candidateId: string;
  candidateName: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  policyAreasProcessed: string[];
  startTime?: Date;
  endTime?: Date;
  errors: TrainingError[];
}

/**
 * Progress information for question generation
 */
export interface QuestionGenerationProgress {
  policyArea: string;
  targetCount: number;
  generatedCount: number;
  validatedCount: number;
  status: 'pending' | 'generating' | 'completed' | 'failed';
}

/**
 * Overall training progress
 */
export interface TrainingProgress {
  sessionId: string;
  startTime: Date;
  lastUpdateTime: Date;
  status: 'initializing' | 'processing-candidates' | 'generating-questions' | 'completed' | 'failed';

  // Candidate processing
  candidates: {
    total: number;
    processed: number;
    failed: number;
    details: CandidateProgress[];
  };

  // Question generation
  questions: {
    targetTotal: number;
    generated: number;
    validated: number;
    byPolicyArea: QuestionGenerationProgress[];
  };

  // Cost tracking
  costs: {
    totalEstimated: number;
    byModel: {
      [model: string]: number;
    };
  };

  // Errors
  errors: TrainingError[];

  // Configuration
  config: {
    model: string;
    questionCount: number;
    dryRun: boolean;
    candidateCount: number;
  };
}

/**
 * Progress tracker class
 */
export class ProgressTracker {
  private progress: TrainingProgress;
  private checkpointPath: string;
  private autoSaveInterval: NodeJS.Timeout | null = null;

  constructor(config: {
    model: string;
    questionCount: number;
    dryRun: boolean;
    candidateCount: number;
  }) {
    const sessionId = `training-${Date.now()}`;
    this.checkpointPath = join(process.cwd(), '.training-progress.json');

    this.progress = {
      sessionId,
      startTime: new Date(),
      lastUpdateTime: new Date(),
      status: 'initializing',
      candidates: {
        total: config.candidateCount,
        processed: 0,
        failed: 0,
        details: [],
      },
      questions: {
        targetTotal: config.questionCount,
        generated: 0,
        validated: 0,
        byPolicyArea: [],
      },
      costs: {
        totalEstimated: 0,
        byModel: {},
      },
      errors: [],
      config,
    };

    // Initialize policy areas
    const policyAreas = ['economy', 'healthcare', 'education', 'security', 'environment', 'social', 'infrastructure'];
    const questionsPerArea = Math.floor(config.questionCount / 7);

    this.progress.questions.byPolicyArea = policyAreas.map(area => ({
      policyArea: area,
      targetCount: questionsPerArea,
      generatedCount: 0,
      validatedCount: 0,
      status: 'pending' as const,
    }));
  }

  /**
   * Start auto-saving progress every 30 seconds
   */
  startAutoSave(intervalMs: number = 30000): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }

    this.autoSaveInterval = setInterval(() => {
      this.saveCheckpoint();
    }, intervalMs);
  }

  /**
   * Stop auto-saving
   */
  stopAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  /**
   * Initialize a candidate
   */
  initializeCandidate(candidateId: string, candidateName: string): void {
    this.progress.candidates.details.push({
      candidateId,
      candidateName,
      status: 'pending',
      policyAreasProcessed: [],
      errors: [],
    });
    this.update();
  }

  /**
   * Start processing a candidate
   */
  startCandidate(candidateId: string): void {
    const candidate = this.findCandidate(candidateId);
    if (candidate) {
      candidate.status = 'processing';
      candidate.startTime = new Date();
      this.progress.status = 'processing-candidates';
      this.update();
    }
  }

  /**
   * Mark a policy area as processed for a candidate
   */
  completePolicyArea(candidateId: string, policyArea: string): void {
    const candidate = this.findCandidate(candidateId);
    if (candidate && !candidate.policyAreasProcessed.includes(policyArea)) {
      candidate.policyAreasProcessed.push(policyArea);
      this.update();
    }
  }

  /**
   * Complete a candidate successfully
   */
  completeCandidate(candidateId: string): void {
    const candidate = this.findCandidate(candidateId);
    if (candidate) {
      candidate.status = 'completed';
      candidate.endTime = new Date();
      this.progress.candidates.processed++;
      this.update();
    }
  }

  /**
   * Mark a candidate as failed
   */
  failCandidate(candidateId: string, error: string): void {
    const candidate = this.findCandidate(candidateId);
    if (candidate) {
      candidate.status = 'failed';
      candidate.endTime = new Date();
      candidate.errors.push({
        candidateId,
        error,
        timestamp: new Date(),
      });
      this.progress.candidates.failed++;
      this.addError({ candidateId, error, timestamp: new Date() });
      this.update();
    }
  }

  /**
   * Update question generation progress
   */
  updateQuestionGeneration(
    policyArea: string,
    generated: number,
    validated?: number
  ): void {
    const area = this.progress.questions.byPolicyArea.find(
      a => a.policyArea === policyArea
    );

    if (area) {
      area.generatedCount = generated;
      if (validated !== undefined) {
        area.validatedCount = validated;
      }
      area.status = generated >= area.targetCount ? 'completed' : 'generating';
    }

    // Update totals
    this.progress.questions.generated = this.progress.questions.byPolicyArea
      .reduce((sum, area) => sum + area.generatedCount, 0);
    this.progress.questions.validated = this.progress.questions.byPolicyArea
      .reduce((sum, area) => sum + area.validatedCount, 0);

    this.update();
  }

  /**
   * Add cost tracking
   */
  addCost(model: string, cost: number): void {
    this.progress.costs.totalEstimated += cost;
    this.progress.costs.byModel[model] =
      (this.progress.costs.byModel[model] || 0) + cost;
    this.update();
  }

  /**
   * Add an error
   */
  addError(error: TrainingError): void {
    this.progress.errors.push(error);
    this.update();
  }

  /**
   * Mark training as completed
   */
  complete(): void {
    this.progress.status = 'completed';
    this.progress.lastUpdateTime = new Date();
    this.saveCheckpoint();
    this.stopAutoSave();
  }

  /**
   * Mark training as failed
   */
  fail(reason: string): void {
    this.progress.status = 'failed';
    this.addError({ error: reason, timestamp: new Date() });
    this.saveCheckpoint();
    this.stopAutoSave();
  }

  /**
   * Save checkpoint to disk
   */
  saveCheckpoint(): void {
    try {
      writeFileSync(
        this.checkpointPath,
        JSON.stringify(this.progress, null, 2),
        'utf-8'
      );
    } catch (error) {
      console.error('Failed to save checkpoint:', error);
    }
  }

  /**
   * Load checkpoint from disk
   */
  static loadCheckpoint(checkpointPath?: string): TrainingProgress | null {
    const path = checkpointPath || join(process.cwd(), '.training-progress.json');

    if (!existsSync(path)) {
      return null;
    }

    try {
      const data = readFileSync(path, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to load checkpoint:', error);
      return null;
    }
  }

  /**
   * Get current progress
   */
  getProgress(): TrainingProgress {
    return { ...this.progress };
  }

  /**
   * Print progress summary
   */
  printSummary(): void {
    const { candidates, questions, costs, errors } = this.progress;

    console.log('\n' + '='.repeat(60));
    console.log('TRAINING PROGRESS SUMMARY');
    console.log('='.repeat(60));

    console.log('\n📊 CANDIDATES:');
    console.log(`  Total: ${candidates.total}`);
    const candidatePercentage = candidates.total > 0 ? Math.round((candidates.processed / candidates.total) * 100) : 0;
    console.log(`  Processed: ${candidates.processed} (${candidatePercentage}%)`);
    console.log(`  Failed: ${candidates.failed}`);

    console.log('\n❓ QUESTIONS:');
    console.log(`  Target: ${questions.targetTotal}`);
    const questionPercentage = questions.targetTotal > 0 ? Math.round((questions.generated / questions.targetTotal) * 100) : 0;
    console.log(`  Generated: ${questions.generated} (${questionPercentage}%)`);
    console.log(`  Validated: ${questions.validated}`);

    console.log('\n💰 COSTS:');
    console.log(`  Total Estimated: $${costs.totalEstimated.toFixed(4)}`);
    Object.entries(costs.byModel).forEach(([model, cost]) => {
      console.log(`  ${model}: $${cost.toFixed(4)}`);
    });

    if (errors.length > 0) {
      console.log(`\n⚠️  ERRORS: ${errors.length}`);
      errors.slice(0, 5).forEach((err, i) => {
        console.log(`  ${i + 1}. ${err.error}`);
      });
      if (errors.length > 5) {
        console.log(`  ... and ${errors.length - 5} more`);
      }
    }

    console.log('\n' + '='.repeat(60) + '\n');
  }

  /**
   * Update internal state
   */
  private update(): void {
    this.progress.lastUpdateTime = new Date();
  }

  /**
   * Find candidate by ID
   */
  private findCandidate(candidateId: string): CandidateProgress | undefined {
    return this.progress.candidates.details.find(
      c => c.candidateId === candidateId
    );
  }
}
