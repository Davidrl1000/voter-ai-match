import type { Question } from '@/lib/db/dynamodb';
import { POLICY_AREAS } from '@/lib/constants';
import partisanKeywords from '@/data/partisan-keywords.json';

/**
 * Result of bias detection check
 */
export interface BiasCheckResult {
  passed: boolean;
  score: number; // 0-100, where 100 is completely neutral
  issues: BiasIssue[];
  summary: {
    totalQuestions: number;
    flaggedQuestions: number;
    policyDistribution: Record<string, number>;
    distributionBalance: number; // 0-100, where 100 is perfectly balanced
  };
}

/**
 * Individual bias issue detected
 */
export interface BiasIssue {
  questionId: string;
  questionText: string;
  severity: 'low' | 'medium' | 'high';
  category: string;
  matchedKeywords: string[];
  description: string;
}

/**
 * Configuration for bias detection thresholds
 */
const BIAS_THRESHOLDS = {
  PASS_SCORE: 85, // Minimum score to pass (0-100)
  MAX_FLAGGED_PERCENTAGE: 5, // Max % of questions that can be flagged
  MIN_DISTRIBUTION_BALANCE: 70, // Minimum policy area distribution balance
};

/**
 * Check questions for political bias and neutrality
 *
 * @param questions - Array of questions to analyze
 * @returns Detailed bias check result
 */
export async function checkQuestionNeutrality(
  questions: Question[]
): Promise<BiasCheckResult> {
  const issues: BiasIssue[] = [];
  const policyDistribution: Record<string, number> = {};

  // Initialize policy area counts
  for (const area of POLICY_AREAS) {
    policyDistribution[area] = 0;
  }

  // Check each question for bias
  for (const question of questions) {
    // Count policy area distribution
    policyDistribution[question.policyArea] =
      (policyDistribution[question.policyArea] || 0) + 1;

    // Check for partisan keywords
    const keywordIssues = checkPartisanKeywords(question);
    issues.push(...keywordIssues);

    // Check for leading language
    const leadingIssues = checkLeadingLanguage(question);
    issues.push(...leadingIssues);

    // Check for emotional manipulation
    const emotionalIssues = checkEmotionalLanguage(question);
    issues.push(...emotionalIssues);
  }

  // Calculate policy area distribution balance (0-100)
  const distributionBalance = calculateDistributionBalance(policyDistribution, questions.length);

  // Calculate overall neutrality score (0-100)
  const score = calculateNeutralityScore(issues, questions.length, distributionBalance);

  // Determine if check passed
  const flaggedPercentage = questions.length > 0 ? (issues.length / questions.length) * 100 : 0;

  // Only enforce distribution balance for larger question sets (14+ questions = 2 per area)
  const shouldCheckDistribution = questions.length >= POLICY_AREAS.length * 2;

  const passed =
    score >= BIAS_THRESHOLDS.PASS_SCORE &&
    flaggedPercentage <= BIAS_THRESHOLDS.MAX_FLAGGED_PERCENTAGE &&
    (!shouldCheckDistribution || distributionBalance >= BIAS_THRESHOLDS.MIN_DISTRIBUTION_BALANCE);

  return {
    passed,
    score,
    issues,
    summary: {
      totalQuestions: questions.length,
      flaggedQuestions: issues.length,
      policyDistribution,
      distributionBalance,
    },
  };
}

/**
 * Check if keyword matches with word boundaries (not substring)
 * Example: "PLN" matches "el PLN propone" but not "comPLNeto"
 */
function matchesKeyword(text: string, keyword: string): boolean {
  const lowerText = text.toLowerCase();
  const lowerKeyword = keyword.toLowerCase();

  // For abbreviations (all caps, 2-6 letters), use strict word boundary
  if (/^[A-Z]{2,6}$/.test(keyword)) {
    const regex = new RegExp(`\\b${lowerKeyword}\\b`, 'i');
    return regex.test(text);
  }

  // For phrases/names, check for word boundaries or common separators
  const escaped = lowerKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(^|\\s|[,.:;?!])${escaped}($|\\s|[,.:;?!])`, 'i');
  return regex.test(lowerText);
}

/**
 * Check question for partisan keywords
 */
function checkPartisanKeywords(question: Question): BiasIssue[] {
  const issues: BiasIssue[] = [];

  // Check each category of partisan keywords
  for (const [category, data] of Object.entries(partisanKeywords.categories)) {
    const matched: string[] = [];

    for (const keyword of data.keywords) {
      if (matchesKeyword(question.text, keyword)) {
        matched.push(keyword);
      }
    }

    if (matched.length > 0) {
      issues.push({
        questionId: question.questionId,
        questionText: question.text,
        severity: getSeverityForCategory(category),
        category,
        matchedKeywords: matched,
        description: `Contains partisan ${category}: ${matched.join(', ')}`,
      });
    }
  }

  return issues;
}

/**
 * Check question for leading language that suggests a "correct" answer
 */
function checkLeadingLanguage(question: Question): BiasIssue[] {
  const issues: BiasIssue[] = [];
  const text = question.text.toLowerCase();

  const leadingPhrases = partisanKeywords.categories.leadingLanguage.keywords;
  const matched: string[] = [];

  for (const phrase of leadingPhrases) {
    if (text.includes(phrase.toLowerCase())) {
      matched.push(phrase);
    }
  }

  if (matched.length > 0) {
    issues.push({
      questionId: question.questionId,
      questionText: question.text,
      severity: 'medium',
      category: 'leadingLanguage',
      matchedKeywords: matched,
      description: `Contains leading language: ${matched.join(', ')}`,
    });
  }

  return issues;
}

/**
 * Check question for emotionally manipulative language
 */
function checkEmotionalLanguage(question: Question): BiasIssue[] {
  const issues: BiasIssue[] = [];
  const text = question.text.toLowerCase();

  const emotionalTerms = partisanKeywords.categories.emotionalManipulation.keywords;
  const matched: string[] = [];

  for (const term of emotionalTerms) {
    if (text.includes(term.toLowerCase())) {
      matched.push(term);
    }
  }

  if (matched.length > 0) {
    issues.push({
      questionId: question.questionId,
      questionText: question.text,
      severity: 'medium',
      category: 'emotionalManipulation',
      matchedKeywords: matched,
      description: `Contains emotionally charged language: ${matched.join(', ')}`,
    });
  }

  return issues;
}

/**
 * Calculate policy area distribution balance (0-100)
 * 100 = perfectly even distribution across all policy areas
 * 0 = all questions in one area
 */
function calculateDistributionBalance(
  distribution: Record<string, number>,
  totalQuestions: number
): number {
  const idealPerArea = totalQuestions / POLICY_AREAS.length;
  const counts = Object.values(distribution);

  // Calculate variance from ideal distribution
  const variance = counts.reduce((sum, count) => {
    const diff = Math.abs(count - idealPerArea);
    return sum + (diff / idealPerArea);
  }, 0);

  // Normalize to 0-100 scale (lower variance = higher score)
  const normalizedVariance = variance / POLICY_AREAS.length;
  const balance = Math.max(0, Math.min(100, 100 - (normalizedVariance * 50)));

  return Math.round(balance);
}

/**
 * Calculate overall neutrality score (0-100)
 * Considers number of issues, their severity, and distribution balance
 */
function calculateNeutralityScore(
  issues: BiasIssue[],
  totalQuestions: number,
  distributionBalance: number
): number {
  if (totalQuestions === 0) return 100;

  // Calculate penalty for issues (weighted by severity)
  const severityWeights = { low: 1, medium: 3, high: 5 };
  const totalPenalty = issues.reduce((sum, issue) => {
    return sum + severityWeights[issue.severity];
  }, 0);

  // Normalize penalty to 0-100 scale
  const maxPossiblePenalty = totalQuestions * severityWeights.high;
  const issueScore = Math.max(0, 100 - (totalPenalty / maxPossiblePenalty) * 100);

  // Only factor in distribution balance for larger question sets (14+ questions)
  // For small sets, use issue score only
  const shouldCheckDistribution = totalQuestions >= POLICY_AREAS.length * 2;

  if (!shouldCheckDistribution) {
    return Math.round(issueScore);
  }

  // Combine issue score (70% weight) with distribution balance (30% weight)
  const combinedScore = (issueScore * 0.7) + (distributionBalance * 0.3);

  return Math.round(combinedScore);
}

/**
 * Determine severity level based on keyword category
 */
function getSeverityForCategory(category: string): 'low' | 'medium' | 'high' {
  const highSeverityCategories = ['politicalParties', 'politicians', 'polarizingTerms'];
  const mediumSeverityCategories = ['partisanSlogans', 'regionalBias', 'socioeconomicBias'];

  if (highSeverityCategories.includes(category)) return 'high';
  if (mediumSeverityCategories.includes(category)) return 'medium';
  return 'low';
}

/**
 * Generate human-readable summary of bias check results
 */
export function formatBiasCheckSummary(result: BiasCheckResult): string {
  const { passed, score, summary } = result;

  const lines = [
    `\n${'='.repeat(60)}`,
    `NEUTRALITY CHECK RESULTS`,
    `${'='.repeat(60)}`,
    ``,
    `Status: ${passed ? '✅ PASSED' : '❌ FAILED'}`,
    `Neutrality Score: ${score}/100`,
    ``,
    `Questions Analyzed: ${summary.totalQuestions}`,
    `Flagged Questions: ${summary.flaggedQuestions} (${((summary.flaggedQuestions / summary.totalQuestions) * 100).toFixed(1)}%)`,
    `Distribution Balance: ${summary.distributionBalance}/100`,
    ``,
    `Policy Area Distribution:`,
  ];

  // Add policy area breakdown
  for (const [area, count] of Object.entries(summary.policyDistribution)) {
    const percentage = ((count / summary.totalQuestions) * 100).toFixed(1);
    lines.push(`  - ${area}: ${count} questions (${percentage}%)`);
  }

  if (result.issues.length > 0) {
    lines.push(``, `Issues Detected:`);

    // Group issues by severity
    const grouped = {
      high: result.issues.filter(i => i.severity === 'high'),
      medium: result.issues.filter(i => i.severity === 'medium'),
      low: result.issues.filter(i => i.severity === 'low'),
    };

    for (const severity of ['high', 'medium', 'low'] as const) {
      if (grouped[severity].length > 0) {
        lines.push(``, `  ${severity.toUpperCase()} SEVERITY (${grouped[severity].length}):`);
        for (const issue of grouped[severity].slice(0, 5)) { // Show first 5 of each severity
          lines.push(`    - [${issue.category}] ${issue.description}`);
          lines.push(`      Question: "${issue.questionText.substring(0, 80)}..."`);
        }
        if (grouped[severity].length > 5) {
          lines.push(`    ... and ${grouped[severity].length - 5} more`);
        }
      }
    }
  } else {
    lines.push(``, `No bias issues detected! 🎉`);
  }

  lines.push(``, `${'='.repeat(60)}`, ``);

  return lines.join('\n');
}
