# Votante AI - Implementation Plan
## Next-Level AI-Powered Voter Matching System for Costa Rica 2026 Elections

---

## Project Vision

Building a **genuinely AI-powered**, transparent voter matching system that will elevate your career by showcasing cutting-edge AI capabilities while maintaining complete political neutrality. This is a career-defining project designed to handle viral scale (5M+ users) with predictable costs (~$1,200) and zero downtime.

### Key Innovation: Real AI Experience

- **Training**: AI extracts policies and generates questions (GPT-4o-mini / o1-pro)
- **Adaptive Questioning**: Intelligent question selection using embeddings (no AI calls, pure computation)
- **Deterministic Matching**: Transparent, reproducible hybrid algorithm (embedding + weighted scoring)
- **AI Explanation**: Fresh, streaming AI-generated explanation for every user (GPT-4o-mini)
- **Modern UX**: Real-time streaming response (ChatGPT-style), short engaging content
- **Public Verification**: Open-source code, automated neutrality tests, public results aggregation

### Key Technical Decisions

- **Models**: GPT-4o-mini for development, o1-pro for production training
- **Matching Algorithm**: Deterministic hybrid (70% embedding similarity + 30% weighted agreement) - transparent & provable neutrality
- **AI Explanation**: Real-time streaming with GPT-4o-mini - fresh explanation every time, no caching
- **Adaptive Questions**: Embedding-based selection (information gain maximization) - no AI API calls
- **Cost Protection**: Predictable architecture - $1,242 for 5M users, no surprise bills
- **Development Environment**: AWS development account with DynamoDB
- **Tech Stack**: Next.js 16, React 19, TypeScript, DynamoDB, OpenAI API, Server-Sent Events (streaming)

---

## Implementation Phases

**Total Phases**: 8 phases (1-3: Core System, 4-5: Testing & Analytics, 6-8: Deployment & Verification)

---

### PHASE 1: Training Script Improvements & Data Pipeline ✅ COMPLETED

**Status**: ✅ Completed on 2025-11-30

**Objective**: Adapt existing `scripts/train-system.ts` to process 20 Spanish candidate PDFs, extract policy positions, generate neutral questions, and populate DynamoDB.

#### Files to Create

1. **`lib/training/utils.ts`** - Utility functions
   - `retryWithBackoff<T>()` - Exponential backoff retry wrapper
   - `validatePolicyPosition()` - Data validation
   - `validateQuestion()` - Question validation
   - `estimateCost()` - Cost tracking
   - `logProgress()` - Structured logging

2. **`lib/training/prompts.ts`** - Centralized AI prompts
   - `POLICY_EXTRACTION_PROMPT` - Extract positions from Spanish PDFs
   - `QUESTION_GENERATION_PROMPT` - Generate neutral Spanish questions
   - `BIAS_CHECK_PROMPT` - Validate question neutrality

3. **`lib/training/candidate-mapper.ts`** - Transform candidates.json structure
   ```typescript
   function mapCandidateData(rawCandidate: RawCandidate): Candidate
   ```

4. **`lib/training/progress-tracker.ts`** - Enable resumable training
   ```typescript
   interface TrainingProgress {
     candidatesProcessed: string[];
     questionsGenerated: { [policyArea: string]: number };
     lastCheckpoint: Date;
     errors: Array<{ candidateId?: string, error: string, timestamp: Date }>;
   }
   ```

#### Files to Modify

1. **`scripts/train-system.ts`**
   - Switch from `o1-pro` to `gpt-4o-mini` for development
   - Add model configuration system (dev vs production)
   - Implement retry logic with exponential backoff
   - Add progress persistence (resume from failure)
   - Enhance logging with timestamps and cost tracking
   - Add Spanish language hints to prompts

   **Key configuration:**
   ```typescript
   const CONFIG = {
     model: {
       extraction: process.env.NODE_ENV === 'production' ? 'o1-pro' : 'gpt-4o-mini',
       questions: process.env.NODE_ENV === 'production' ? 'o1-pro' : 'gpt-4o-mini',
     },
     language: 'es',
     retries: 3,
     backoffMs: 1000,
     questionCount: parseInt(process.env.QUESTION_COUNT || '150'), // 150 for dev, 1000+ for prod
     questionsPerPolicyArea: Math.floor(parseInt(process.env.QUESTION_COUNT || '150') / 7),
   };
   ```

#### Dependencies to Install

```bash
npm install --save pdf-parse openai @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb
npm install --save-dev @types/pdf-parse
```

#### Expected Outputs

- DynamoDB `candidate-positions` table with 20 candidates
- DynamoDB `question-bank` table with 1000+ Spanish questions
- Backup files in `data/`:
  - `candidate-positions-backup-{timestamp}.json`
  - `question-bank-backup-{timestamp}.json`
  - `training-progress-{timestamp}.json`

#### Cost Estimates

- **Development (GPT-4o-mini)**: ~$10-15
- **Production (o1-pro)**: ~$85-150

---

### PHASE 2: Database & Infrastructure

**Objective**: Design DynamoDB schemas, set up AWS infrastructure, configure environment variables.

#### Files to Create

1. **`lib/db/schemas.ts`** - TypeScript interfaces and table definitions
   ```typescript
   export const TABLES = {
     CANDIDATE_POSITIONS: 'voter-ai-candidate-positions',
     QUESTION_BANK: 'voter-ai-question-bank',
     MATCH_RESULTS: 'voter-ai-match-results',
     EXPLANATION_FEEDBACK: 'voter-ai-explanation-feedback',
   };

   export interface CandidatePositionItem { /* ... */ }
   export interface QuestionItem { /* ... */ }
   export interface MatchResultItem {
     resultId: string; // Partition key (UUID)
     timestamp: string; // Sort key (ISO timestamp)
     matches: Array<{
       candidateId: string;
       matchPercentage: number;
     }>;
     topMatchId: string; // candidateId of top match
     questionCount: number;
     ttl: number; // Optional: expire after 90 days
   }
   export interface ExplanationFeedbackItem {
     feedbackId: string; // Partition key (UUID)
     timestamp: string; // ISO timestamp
     rating: 'positive' | 'negative';
     explanationHash: string; // Hash of the explanation content
     topMatchId: string; // candidateId of top match
   }
   ```

2. **`lib/db/client.ts`** - DynamoDB client setup
   ```typescript
   export const dynamoClient = new DynamoDBClient({ /* ... */ });
   export const docClient = DynamoDBDocumentClient.from(dynamoClient);
   ```

3. **`infrastructure/dynamodb-tables.json`** - Table definitions for AWS
   - Tables: candidate-positions, question-bank, semantic-cache, analytics
   - Includes GSI for question-bank (policyArea-index)
   - TTL enabled for semantic-cache (30 days)

4. **`scripts/setup-infrastructure.ts`** - Creates DynamoDB tables
5. **`scripts/migrate-data.ts`** - Migrate JSON backups to DynamoDB
6. **`scripts/backup-data.ts`** - Backup DynamoDB to JSON files

#### Files to Modify

1. **`.env`** - Add all required environment variables
   ```bash
   OPENAI_API_KEY=sk-...
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=...
   AWS_SECRET_ACCESS_KEY=...
   CANDIDATE_POSITIONS_TABLE=voter-ai-candidate-positions
   QUESTION_BANK_TABLE=voter-ai-question-bank
   MATCH_RESULTS_TABLE=voter-ai-match-results
   EXPLANATION_FEEDBACK_TABLE=voter-ai-explanation-feedback
   NODE_ENV=development
   QUESTION_COUNT=150  # Development: 150 (~20 per policy area), Production: 1000+
   ELECTION_DAY_DATETIME=2026-02-01T19:00:00-06:00  # Election day at 7pm Costa Rica time
   ```

2. **`example.env`** - Template with all variables

#### Implementation Steps

1. Create schemas.ts with TypeScript interfaces
2. Update .env and example.env
3. Create database client
4. Create infrastructure JSON definitions
5. Create setup-infrastructure.ts script
6. Run setup script to create tables in AWS
7. Verify tables in AWS console
8. Create migration and backup scripts

---

### PHASE 3: Backend API Development

**Objective**: Build Next.js API routes for adaptive question selection, deterministic matching, and streaming AI explanations.

#### Files to Create

1. **`app/api/questions/start/route.ts`** - GET initial question
   - Returns first question (randomly selected from question bank)
   - Initializes session context
   ```typescript
   // GET /api/questions/start
   interface StartQuizResponse {
     question: Question;
     questionNumber: 1;
     totalQuestions: number; // User's selected count (10-50)
   }
   ```

2. **`app/api/questions/next/route.ts`** - POST get next adaptive question
   - Uses embedding-based adaptive selection
   - Maximizes information gain based on previous answers
   ```typescript
   // POST /api/questions/next
   interface NextQuestionRequest {
     previousAnswers: UserAnswer[];
     questionCount: number;
   }

   interface NextQuestionResponse {
     question: Question;
     questionNumber: number;
     isComplete: boolean; // true if this was the last question
   }
   ```

3. **`app/api/matches/route.ts`** - POST calculate matches
   - Implements deterministic hybrid matching algorithm
   - Returns top 3 matches with percentages
   ```typescript
   // POST /api/matches
   interface CalculateMatchesRequest {
     answers: UserAnswer[];
   }

   interface CalculateMatchesResponse {
     topMatches: Array<{
       candidateId: string;
       name: string;
       party: string;
       matchPercentage: number; // 0-100
       policyAreaBreakdown: { [area: string]: number };
       image: string;
       logo: string;
     }>;
   }
   ```

4. **`app/api/explanation/route.ts`** - GET streaming AI explanation
   - Generates fresh AI explanation every time (no caching)
   - Streams response in real-time using Server-Sent Events
   ```typescript
   // GET /api/explanation?answersHash=xxx&top3=candidate1,candidate2,candidate3
   // Returns: text/event-stream (Server-Sent Events)
   // Streams AI-generated explanation in real-time
   ```

5. **`lib/api/adaptive-selection.ts`** - Adaptive question selection logic
   ```typescript
   export async function selectNextQuestion(
     previousAnswers: UserAnswer[],
     availableQuestions: Question[],
     askedQuestionIds: Set<string>
   ): Promise<Question>
   ```

   **Algorithm:**
   - Calculate user's current position embedding (average of answer embeddings)
   - For each unasked question, calculate information gain potential
   - Select question that maximizes coverage of unexplored policy space
   - Ensures balanced distribution across policy areas

6. **`lib/api/matching-algorithm.ts`** - Deterministic matching logic
   ```typescript
   export async function calculateMatches(
     userAnswers: UserAnswer[],
     questions: Question[],
     candidates: CandidatePositionItem[]
   ): Promise<MatchResult[]>
   ```

   **Algorithm:**
   - Calculate embedding similarity (cosine similarity between user answer embeddings and candidate position embeddings)
   - Calculate weighted agreement (direct answer comparison with question weights)
   - Combine: `final_score = (embedding * 0.7) + (weighted * 0.3)`
   - Calculate policy area breakdown per candidate
   - Sort by match percentage
   - Return top 3 matches

7. **`lib/api/explanation-generator.ts`** - Streaming AI explanation
   ```typescript
   export async function generateStreamingExplanation(
     userAnswers: UserAnswer[],
     topMatches: MatchResult[]
   ): Promise<ReadableStream>
   ```

   **Implementation:**
   - Creates prompt with user answers summary + top 3 candidates
   - Calls GPT-4o-mini with streaming enabled
   - Returns ReadableStream for Server-Sent Events
   - Short, engaging explanation (200-250 tokens)

8. **`lib/utils/vector-math.ts`** - Vector operations
   - `cosineSimilarity(a, b)` - Calculate cosine similarity
   - `normalizeVector(vector)` - Normalize to unit vector
   - `averageEmbedding(embeddings)` - Calculate centroid
   - `calculateInformationGain(userEmbedding, questionEmbedding)` - Adaptive selection metric

9. **`lib/utils/validation.ts`** - Request validation
   - `validateAnswers(answers)` - Validate user answer format
   - `validateQuestionCount(count)` - Ensure 10-50 range

#### Implementation Steps

1. Create utility functions (vector-math.ts, validation.ts)
2. Create adaptive selection algorithm (adaptive-selection.ts)
3. Create matching algorithm (matching-algorithm.ts)
4. Create streaming explanation generator (explanation-generator.ts)
5. Create API route: GET /api/questions/start
6. Create API route: POST /api/questions/next
7. Create API route: POST /api/matches
8. Create API route: GET /api/explanation (streaming)
9. Test each route individually
10. Test end-to-end flow with streaming

#### Expected Performance

- GET /api/questions/start: < 200ms
- POST /api/questions/next: < 300ms (embedding calculations)
- POST /api/matches: < 1s (calculate all 20 candidates)
- GET /api/explanation: 2-4s total streaming time (progressive display)
- Cost per user: $0.00015 (single AI call for explanation)

---

### PHASE 4: Frontend Development

**Objective**: Build responsive, mobile-first Spanish-language UI with home page, quiz interface, results page, and candidate details.

#### Files to Create

1. **`components/QuestionCard.tsx`** - Quiz question display
   - Policy area badge
   - Question text
   - Answer options (buttons)
   - "No es importante para mí" option
   - Previous/Next navigation

2. **`components/CandidateMatchCard.tsx`** - Match result card
   - Rank badge (1st, 2nd, 3rd)
   - Candidate photo and party logo
   - Match percentage (large display)
   - View details button

3. **`components/ProgressBar.tsx`** - Quiz progress indicator

4. **`components/StreamingExplanation.tsx`** - Streaming AI response display (NEW)
   ```typescript
   interface StreamingExplanationProps {
     answersHash: string;
     topMatches: MatchResult[];
     onComplete?: () => void;
   }
   ```
   - Uses EventSource API for Server-Sent Events
   - Displays text progressively as it streams from API
   - Shows typing indicator while streaming
   - Handles stream errors gracefully
   - Modern ChatGPT-like experience

5. **`components/FeedbackButtons.tsx`** - Thumbs up/down for AI response (NEW)
   ```typescript
   interface FeedbackButtonsProps {
     explanationId: string;
   }
   ```
   - Thumbs up / thumbs down buttons
   - Records feedback to DynamoDB for quality monitoring
   - Shows "Gracias por tu opinión" message after feedback

6. **`components/PolicyAreaChart.tsx`** - Visual breakdown (using recharts)
7. **`components/DetailedBreakdown.tsx`** - Expandable answer comparison
8. **`components/TransparencyInfo.tsx`** - Home page transparency section
9. **`components/Header.tsx`** - Site header with navigation
10. **`components/LoadingSpinner.tsx`** - Loading states

11. **`lib/translations.ts`** - Spanish translations
   ```typescript
   export const translations = {
     policyAreas: {
       economy: 'Economía',
       healthcare: 'Salud',
       education: 'Educación',
       security: 'Seguridad',
       environment: 'Medio Ambiente',
       social: 'Asuntos Sociales',
       infrastructure: 'Infraestructura',
     },
     ui: { /* ... */ }
   };
   ```

10. **`app/quiz/page.tsx`** - Quiz interface (NEW)
    - Start with GET /api/questions/start
    - Display current question with QuestionCard component
    - Save answers to state
    - **Adaptive navigation**: POST /api/questions/next with previous answers
    - Submit to POST /api/matches when complete

11. **`app/results/page.tsx`** - Results page (NEW)
    - Display top 3 matches with percentages
    - **StreamingExplanation component** (real-time AI generation)
    - Thumbs up/down feedback after explanation completes
    - Detailed answer breakdown (expandable)
    - Policy area comparison chart
    - Share and retry options
    - Automatically record match (POST /api/record-match in background)

12. **`app/candidates/[id]/page.tsx`** - Candidate detail page (NEW)
    - Photo and party logo
    - Policy positions by area
    - Link to full plan PDF

#### Files to Modify

1. **`app/page.tsx`** - Home page
   - Hero section with title and description
   - Question count selector (10-50, default 20)
   - Optional policy area filters
   - "Comenzar Quiz" button
   - How it works / transparency section

2. **`app/globals.css`** - Custom styles for components

#### Dependencies to Install

```bash
npm install --save recharts react-icons
```

#### Implementation Steps

1. Create translation system
2. Create reusable components (Header, LoadingSpinner, ProgressBar)
3. Update home page with question selector
4. Create quiz interface with adaptive question fetching
5. Create QuestionCard component
6. **Create StreamingExplanation component** (EventSource API)
7. **Create FeedbackButtons component**
8. Create results page with streaming explanation
9. Create CandidateMatchCard and other result components
10. Create candidate detail page
11. Add responsive styles and animations
12. Test on mobile devices
13. **Test streaming functionality** across different browsers

---

### PHASE 5: Testing Suite

**Objective**: Build comprehensive testing covering unit tests, integration tests, E2E tests, and public transparency tests.

#### Files to Create

1. **Test Infrastructure**
   - `tests/setup.ts` - Global test setup and mocks
   - `tests/fixtures/candidates.ts` - Mock candidate data
   - `tests/fixtures/questions.ts` - Mock question data

2. **Unit Tests**
   - `tests/unit/training/utils.test.ts` - Training utilities
   - `tests/unit/matching/algorithm.test.ts` - Matching algorithm
   - `tests/unit/cache/semantic-cache.test.ts` - Semantic caching
   - `tests/unit/utils/vector-math.test.ts` - Vector operations

3. **Integration Tests**
   - `tests/integration/api/questions.test.ts` - Questions endpoint
   - `tests/integration/api/matches.test.ts` - Matches endpoint
   - `tests/integration/api/explanation.test.ts` - Explanation endpoint

4. **E2E Tests**
   - `tests/e2e/complete-flow.test.ts` - Full user journey (Playwright)

5. **Public Transparency Tests**
   - `tests/transparency/neutrality.test.ts` - Neutrality verification
     - All candidates have equal chance of being top match
     - Question bank has no partisan bias
     - Matching algorithm is deterministic
     - All policy areas represented equally
   - `tests/transparency/bias-detection.test.ts` - Automated bias checks
     - No partisan keywords in questions
     - Neutral sentiment scores

6. **Test Configuration**
   - `vitest.config.ts` - Vitest configuration
   - `playwright.config.ts` - Playwright configuration

#### Dependencies to Install

```bash
npm install --save-dev vitest @vitest/ui @playwright/test
npm install --save-dev @testing-library/react @testing-library/jest-dom
npm install --save-dev msw  # Mock Service Worker
```

#### Package.json Scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:e2e": "playwright test",
    "test:transparency": "vitest run tests/transparency",
    "test:all": "npm run test && npm run test:e2e",
    "test:coverage": "vitest --coverage"
  }
}
```

#### Testing Strategy

- **Unit Tests**: 80%+ coverage for business logic
- **Integration Tests**: All API routes, database operations
- **E2E Tests**: Critical user paths (home → quiz → results)
- **Transparency Tests**: Public, documented, run in CI/CD

---

### PHASE 6: Analytics & Results Aggregation

**Objective**: Record every match result server-side and create public visualization showing aggregated percentages (grayed out, no party identification) with election day reveal mechanism.

#### Files to Create

1. **`app/api/record-match/route.ts`** - POST endpoint to record match results
   ```typescript
   // POST /api/record-match
   interface RecordMatchRequest {
     matches: Array<{
       candidateId: string;
       matchPercentage: number;
     }>;
     topMatchId: string;
     questionCount: number;
   }
   ```
   - Generates UUID for resultId
   - Stores in match-results DynamoDB table
   - Returns success confirmation
   - No PII stored - completely anonymous

2. **`app/api/aggregated-results/route.ts`** - GET endpoint for aggregated statistics
   ```typescript
   // GET /api/aggregated-results
   interface AggregatedResultsResponse {
     totalMatches: number;
     candidateStats: Array<{
       percentage: number; // % of users who matched with this candidate (no candidateId!)
       rank: number; // 1-20
     }>;
     lastUpdated: string;
     revealTime: string; // Election day 7pm
     isRevealed: boolean; // false until election day
   }
   ```
   - Scans match-results table
   - Calculates percentage of users who got each candidate as top match
   - Returns stats WITHOUT candidate identification (just percentages)
   - After election day, includes candidateId in response

3. **`lib/api/results-aggregation.ts`** - Aggregation logic
   ```typescript
   export async function calculateAggregatedResults(
     includeIdentification: boolean
   ): Promise<AggregatedResults>
   ```
   - Scans all match results from DynamoDB
   - Groups by topMatchId
   - Calculates percentages
   - Sorts by percentage (highest to lowest)
   - Optionally includes candidate identification

4. **`app/resultados-agregados/page.tsx`** - Public results page (NEW)
   - Large heading: "Resultados Agregados de Votante AI"
   - Bar chart or visualization showing percentages (grayed out bars, no labels)
   - Total number of users who completed the quiz
   - Message: "Los candidatos específicos se revelarán el [election day] a las 7:00 PM"
   - Countdown timer until election day
   - After election day: reveal candidate names on each bar

5. **`components/AggregatedResultsChart.tsx`** - Visualization component
   - Uses recharts for bar chart
   - Gray bars before reveal, colored bars after
   - No candidate identification until election day
   - Shows only percentages and rank

6. **`lib/utils/date-utils.ts`** - Election day utilities
   ```typescript
   export function isElectionDayRevealed(): boolean {
     const electionDay = new Date(process.env.ELECTION_DAY_DATETIME!);
     return new Date() >= electionDay;
   }

   export function getTimeUntilReveal(): {
     days: number;
     hours: number;
     minutes: number;
   }
   ```

#### Files to Modify

1. **`app/results/page.tsx`** - Add match recording call
   - After displaying results to user, call POST /api/record-match
   - Store match data anonymously
   - Don't block user experience (fire and forget or background)

2. **`components/Header.tsx`** - Add link to aggregated results page

#### Implementation Steps

1. Create match recording endpoint
2. Modify results page to record matches
3. Create aggregation logic
4. Create aggregated results endpoint
5. Create visualization component
6. Create public results page with countdown
7. Implement election day reveal mechanism
8. Test data aggregation with mock data
9. Test reveal mechanism by temporarily changing election date

#### Privacy Considerations

- Zero PII collected - no IP addresses, no user IDs, no session tracking
- Each record is a standalone anonymous match result
- Cannot link multiple quiz attempts from same user
- TTL of 90 days to auto-delete old data
- Fully compliant with privacy-first approach

#### Expected Data Flow

1. User completes quiz → sees personalized results
2. Frontend calls POST /api/record-match (background)
3. Server stores anonymous match record to DynamoDB
4. Public can visit /resultados-agregados anytime
5. Aggregation endpoint scans all records and calculates percentages
6. Before election day: show grayed bars with no identification
7. After election day 7pm: reveal candidate names on visualization

---

### PHASE 7: Neutrality Verification

**Objective**: Implement automated bias detection, prompt logging, and public documentation to prove system neutrality.

#### Files to Create

1. **`lib/neutrality/bias-checker.ts`** - Automated bias detection
   ```typescript
   export async function checkQuestionNeutrality(
     questions: Question[]
   ): Promise<BiasCheckResult>
   ```
   - Check for partisan keywords
   - Analyze sentiment balance
   - Verify policy area distribution

2. **`lib/neutrality/prompt-logger.ts`** - AI prompt logging
   ```typescript
   export async function trackedCompletion(
     prompt: string,
     type: 'policy_extraction' | 'question_generation' | 'explanation'
   ): Promise<string>
   ```
   - Log all AI interactions to file
   - Store in DynamoDB for searchability

3. **`data/partisan-keywords.json`** - Prohibited keywords list

4. **`app/transparency/page.tsx`** - Public transparency page
   - Daily test results display
   - Algorithm documentation link
   - GitHub repository link
   - Neutrality commitment statement

5. **`docs/ALGORITHM.md`** - Complete algorithm documentation
   - Step-by-step explanation
   - Mathematical formulas
   - Neutrality guarantees
   - Transparency commitments

6. **`scripts/generate-neutrality-report.ts`** - Daily report generation
   - Run bias detection tests
   - Run fairness tests
   - Generate statistics
   - Alert if tests fail

#### Implementation Steps

1. Create bias checker with keyword and sentiment analysis
2. Implement prompt logging system
3. Write comprehensive algorithm documentation
4. Create transparency page in UI
5. Set up daily neutrality report script
6. Integrate GitHub for public code access

---

### PHASE 8: Deployment & Documentation

**Objective**: Deploy to AWS Amplify, configure production environment, create comprehensive documentation.

#### Files to Create

1. **`amplify.yml`** - Amplify build configuration
   ```yaml
   version: 1
   frontend:
     phases:
       preBuild:
         commands:
           - npm ci
       build:
         commands:
           - npm run build
     artifacts:
       baseDirectory: .next
       files:
         - '**/*'
   ```

2. **`docs/DEPLOYMENT.md`** - Deployment guide
   - AWS Amplify setup
   - Environment variables configuration
   - Custom domain setup
   - Monitoring setup

3. **`docs/TRAINING.md`** - Training script execution guide
   - Cost estimates (dev vs production)
   - Step-by-step execution
   - Troubleshooting common issues
   - Post-training verification

4. **`docs/AWS_SETUP.md`** - AWS infrastructure setup
   - IAM user creation
   - DynamoDB table creation
   - S3 bucket configuration

5. **`docs/USER_GUIDE.md`** - Spanish user guide
   - What is Votante AI?
   - How it works
   - Privacy guarantees
   - FAQ

#### Files to Modify

1. **`README.md`** - Complete project documentation
   - Project overview
   - Quick start guide
   - Project structure
   - Available scripts
   - Testing instructions
   - Transparency statement
   - License and contact info

2. **`package.json`** - Complete scripts
   ```json
   {
     "scripts": {
       "dev": "next dev",
       "build": "next build",
       "start": "next start",
       "train:system": "tsx scripts/train-system.ts data/candidates.json",
       "setup:infrastructure": "tsx scripts/setup-infrastructure.ts",
       "migrate:data": "tsx scripts/migrate-data.ts",
       "backup:data": "tsx scripts/backup-data.ts",
       "test": "vitest",
       "test:e2e": "playwright test",
       "test:transparency": "vitest run tests/transparency",
       "report:neutrality": "tsx scripts/generate-neutrality-report.ts"
     }
   }
   ```

#### Deployment Steps

1. Create Amplify configuration
2. Write all documentation
3. Set up AWS Amplify
4. Configure environment variables in Amplify Console
5. Deploy to production
6. Run post-deployment verification tests
7. Monitor for issues

#### Post-Deployment Checklist

- [ ] All tests pass (`npm run test:all`)
- [ ] Build succeeds (`npm run build`)
- [ ] Training script works (dry run)
- [ ] Neutrality tests pass
- [ ] Health check responds
- [ ] API endpoints accessible
- [ ] E2E smoke tests pass

---

## Manual vs Automated Tasks

### Tasks You Will Do Manually
1. Create DynamoDB tables in AWS Console (using schemas from `infrastructure/dynamodb-tables.json`)
2. Deploy project to AWS Amplify
3. Create cache layers in AWS if necessary
4. Configure environment variables in AWS Amplify Console

### Tasks the Agent Will Implement
Everything else - all code, scripts, components, tests, and documentation. The plan below is structured to be followed step-by-step by any AI agent.

---

## Implementation Sequence

**Note**: Phases are ordered for logical dependency, not time estimates. Each phase should be completed fully before moving to the next.

### Phase 1: Data Pipeline
1. Install dependencies
2. Create training utilities
3. Update training script with environment-based question count
4. Create DynamoDB infrastructure definitions (JSON schemas)
5. **[MANUAL]** Create DynamoDB tables in AWS Console
6. Run training script (development mode with small question count)
7. Verify data in DynamoDB

### Phase 2: Backend Development
1. Create adaptive question selection algorithm
2. Create deterministic matching algorithm
3. Create streaming explanation generator
4. Build API routes (questions/start, questions/next, matches, explanation with streaming)
5. Build analytics recording endpoint (POST /api/record-match)
6. Build feedback recording endpoint (POST /api/feedback)
7. Test API endpoints
8. Test streaming functionality
9. Optimize performance

### Phase 3: Frontend Core Features
1. Create reusable components
2. Build home page
3. Build quiz interface
4. Build results page
5. Build candidate detail pages
6. Test on mobile devices

### Phase 4: Testing & Neutrality
1. Write unit tests
2. Write integration tests
3. Write E2E tests
4. Implement transparency tests
5. Create bias detection system
6. Build transparency page

### Phase 5: Analytics & Results Aggregation
1. Create match recording endpoint (POST /api/record-match)
2. Modify results page to record matches after display
3. Create aggregation logic and endpoint (GET /api/aggregated-results)
4. Create visualization component (AggregatedResultsChart)
5. Create public results page (/resultados-agregados)
6. Implement countdown timer and election day reveal mechanism
7. Test aggregation with mock data
8. Test reveal mechanism

### Phase 6: Deployment Preparation
1. Write documentation
2. Create Amplify configuration
3. **[MANUAL]** Set up AWS Amplify
4. **[MANUAL]** Configure environment variables
5. **[MANUAL]** Deploy to production
6. Run production training (with o1-pro and QUESTION_COUNT=1000+)
7. Monitor and optimize

---

## Critical Files to Read Before Implementation

1. **`scripts/train-system.ts`** - Existing training logic to adapt
2. **`data/candidates.json`** - Candidate data structure
3. **`package.json`** - Current dependencies
4. **`app/layout.tsx`** - App structure and Spanish setup
5. **`tsconfig.json`** - TypeScript configuration

---

## Success Criteria

- [ ] 20 candidates processed with 1000+ questions generated (production)
- [ ] All DynamoDB tables populated and accessible
- [ ] Matching algorithm returns consistent, accurate results (deterministic)
- [ ] Streaming AI explanations working smoothly (EventSource API)
- [ ] All transparency tests pass (public verification)
- [ ] Mobile-responsive UI works on all devices
- [ ] Production deployment successful on AWS Amplify
- [ ] **Cost per user: $0.00015** (streaming AI explanation only)
- [ ] **5M users scenario: ~$1,242 total** (predictable, no surprises)
- [ ] Zero partisan bias detected in automated tests
- [ ] Complete documentation published

---

## Cost Estimates (Revised - Simplified Architecture)

### One-Time Training Costs
- **Development** (GPT-4o-mini, 150 questions): ~$17
- **Production** (o1-pro, 1000+ questions): ~$85-150

### Per-User Runtime Costs (The Key Numbers!)

**Normal Flow (10k users/month):**
- Adaptive question selection: $0 (uses embeddings, no AI calls)
- Deterministic matching: $0 (pure computation)
- Streaming AI explanation (GPT-4o-mini): $0.00015 per user
- **Cost: $1.50/month for 10k users**

**Viral Scenario (5M users total):**
- AI Explanations (5M × $0.00015): **$750**
- DynamoDB (on-demand): **~$100**
- AWS Amplify (hosting): **~$375**
- Feedback storage: **~$17**
- **TOTAL: ~$1,242 for 5 million users** ✨

### Infrastructure Costs (Monthly, scales automatically)
- DynamoDB on-demand: $0.25 per million reads + $1.25 per million writes (first 1M free)
- AWS Amplify: $0.15/GB data transfer (first 15GB free)
- S3 storage: ~$0.50/month for images/assets

### Cost Protection Built Into Architecture
1. ✅ **No caching complexity** - Fresh AI every time, still cheap
2. ✅ **GPT-4o-mini** - 10x cheaper than GPT-4o, excellent quality
3. ✅ **Single AI call per user** - Only for final explanation
4. ✅ **Deterministic matching** - No AI costs for core algorithm
5. ✅ **Adaptive selection via embeddings** - No AI costs for question selection
6. ✅ **On-demand scaling** - AWS handles traffic spikes automatically
7. ✅ **Predictable math**: Users × $0.00015 = Total AI cost

### Cost Comparison: This vs Cached Approach
- **Cached approach** (old plan): Complex caching logic, variation generation, still ~$0.0002/user
- **This approach**: Simpler code, genuine AI every time, **$0.00015/user**
- **Winner**: This approach is cheaper AND better! 🎉

---

## Risk Mitigation

| Risk | Mitigation Strategy |
|------|-------------------|
| OpenAI rate limits | Retry with exponential backoff, progress tracking for resumption, rate limiting per IP (3/day) |
| Viral cost spike ($50k scenario) | Architecture designed for predictability: 5M users = $1,242 (not $50k!). Math is simple: users × $0.00015 |
| Bias in questions | Automated bias detection, manual review, public test suite |
| DynamoDB performance | On-demand pricing scales automatically, GSI for efficient queries |
| User privacy concerns | No authentication, ephemeral sessions, public privacy policy, anonymous analytics only |
| Election integrity questions | Complete transparency, open source code, deterministic matching algorithm, public test results |
| Streaming failures | Fallback to non-streaming if EventSource fails, graceful error handling |
| Developer scrutiny | Real AI (not templates), open source code proves genuine AI usage |

---

## Notes

- All Spanish language content should be reviewed by native Costa Rican Spanish speaker
- Training script should be run in dry-run mode first (3 candidates) to verify before full run
- Transparency page and tests are critical for public trust - prioritize these
- Consider beta testing with small group before public launch
- Plan for traffic spikes near election day - monitor AWS costs closely
