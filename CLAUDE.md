# Votante AI - Costa Rica 2026 Voter Matching System

## Quick Commands

```bash
# Development
npm run dev              # Start Next.js dev server (localhost:3000)
npm run build            # Production build
npm run lint             # ESLint + TypeScript type checking
npm run type-check       # TypeScript only (no ESLint)

# Training
npm run train:dev        # Dry run: 3 candidates, ~$0.02, 5 mins
npm run train            # Production: all candidates, ~$85-150, 30-60 mins

# Quality Checks
npm run lint && npm run build    # Full validation before commit
```

## Core Architecture

**Stack:**
- Next.js
- React 19 (with automatic batching)
- TypeScript (strict mode)
- Tailwind CSS
- DynamoDB (AWS)
- OpenAI API (GPT-4o-mini for explanations)

**Key Directories:**
```
app/
├── api/              # API routes
│   ├── questions/    # GET questions for quiz
│   ├── match/        # POST calculate matches
│   └── explain/      # POST streaming AI explanations
├── page.tsx          # Home page
└── globals.css       # Global styles + animations

components/
├── Quiz.tsx          # Question interface
├── Results.tsx       # Match results + streaming AI
└── LoadingSpinner.tsx

lib/
├── constants.ts      # Centralized config (IMPORTANT: single source of truth)
├── matching/
│   └── algorithm.ts  # Cosine similarity matching
├── training/
│   ├── prompts-es-cr.ts  # ALL AI prompts (Spanish only)
│   ├── utils.ts      # Retry, validation, cost tracking
│   ├── candidate-mapper.ts
│   └── progress-tracker.ts
└── db/
    └── dynamodb.ts   # Database operations (includes BatchGet)

scripts/
├── train-system.ts      # Main training script
└── audit-coverage.ts    # Coverage verification (100% test)
```

## Code Style & Patterns

### TypeScript
- **Strict mode enabled** - All types required
- **Const assertions** for literal types: `as const`
- **Explicit typing** when using const values in useState:
  ```typescript
  // ❌ Wrong: Infers literal type
  const [count, setCount] = useState(API_LIMITS.DEFAULT);

  // ✅ Correct: Explicit number type
  const [count, setCount] = useState<number>(API_LIMITS.DEFAULT);
  ```

### Imports
- **ES modules** only (import/export, not require)
- **Destructure** when importing from lib:
  ```typescript
  import { POLICY_AREAS, API_LIMITS } from '@/lib/constants';
  ```

### Centralized Patterns
- **Constants**: ALL config in `lib/constants.ts` (policy areas, limits, models)
- **Prompts**: ALL AI prompts in `lib/training/prompts-es-cr.ts`
- **Validation**: Use shared utils from `lib/training/utils.ts`

### API Routes
- **Validation first**: Validate all inputs before processing
- **Error handling**: Comprehensive try-catch with logging
- **Progress logging**: Use `logProgress()` from utils
- **Type safety**: Import and use TypeScript interfaces

### React Components
- **State-based**: Use React state, not direct DOM manipulation
- **Hooks**: useState, useEffect, useCallback, useRef as needed
- **No emojis**: Unless explicitly requested by user

### Database
- **Efficient queries**: Use BatchGet for specific items, not Scan
- **Composite keys**: candidateId + policyArea for positions
- **Batch limits**: DynamoDB BatchGet max 100 items

## IMPORTANT: Spanish Language Requirements

**ALL user-facing text and AI responses MUST be in Spanish (Costa Rica - es-CR)**

- ✅ Prompts enforce Spanish-only (see `lib/training/prompts-es-cr.ts`)
- ✅ No English mixing allowed
- ✅ Use Costa Rican terminology and expressions
- ✅ "Usted" (formal) for AI explanations

## Key Technical Decisions

### Question Selection: Static (NOT Adaptive)
**IMPORTANT:** The system uses **static question selection**, not adaptive:
- User selects question count: **15, 20, or 25 questions**
- All questions loaded at once via `/api/questions`
- Questions shown sequentially (no dynamic selection)
- **Why:** Better UX, simpler code, proven accuracy
- See `docs/IMPLEMENTATION_PLAN.md` "Completed Phases Summary" for rationale

### Matching Algorithm: Triple Pathway Architecture
**CRITICAL:** The system uses a **Triple Pathway Architecture** that guarantees 100% candidate coverage (every candidate can rank #1):

**Three Parallel Scoring Pathways:**
1. **PATH 1 - Percentile Rank Matching**: Favors specialists with strong positions in specific areas
2. **PATH 2 - Consistency Scoring**: Favors generalists with balanced positions across all areas
3. **PATH 3 - Direct Similarity**: Favors comprehensive candidates with complete policy coverage

**Final score = MAX(path1, path2, path3)**

**Key Features:**
- **Cosine similarity** on embeddings (semantic matching)
- **35-point comprehensive bonus** for candidates with 7/7 policy areas
- **Optimized with Maps** for O(1) lookups (NOT array.find/filter in loops)
- **100% coverage verification** via automated audit script
- **Policy area tracking** for alignment breakdown

**Documentation:** See `docs/TRIPLE_PATHWAY_ARCHITECTURE.md` for detailed explanation

**Coverage Verification:**
```bash
npx tsx scripts/audit-coverage.ts  # Verifies 100% coverage for 15, 20, 25 questions
```

### Streaming
- **React 18+ batching**: Use state updates, not direct DOM manipulation
- **Character-by-character**: Real-time streaming like ChatGPT
- **No flickering**: Automatic batching prevents re-render issues

## Environment Setup

**Required:**
```bash
# .env file (copy from .env.example)
OPENAI_API_KEY=sk-...
ARCH_AWS_ACCESS_KEY_ID=AKIA...
ARCH_AWS_SECRET_ACCESS_KEY=...
ARCH_AWS_REGION=us-east-1

# Optional (defaults shown)
NODE_ENV=development
QUESTION_COUNT=150
DRY_RUN=true
CANDIDATE_POSITIONS_TABLE=candidate-positions-dev
QUESTION_BANK_TABLE=question-bank-dev
```

**DynamoDB Tables:**
- See `docs/ARCH_AWS_SETUP.md` for table creation
- Development: Use `-dev` suffix
- Production: Remove suffix

## Common Issues & Solutions

### TypeScript Errors with Const Types
**Problem:** `Type 'number' is not assignable to type '20'`
**Solution:** Add explicit type annotation
```typescript
const [limit, setLimit] = useState<number>(API_LIMITS.DEFAULT);
```

### Streaming Text Flickering
**Problem:** Text jumps/flickers during streaming
**Solution:** Use React state updates (automatic batching), not direct DOM
```typescript
// ✅ Correct
setAiExplanation((prev) => prev + text);

// ❌ Wrong
textRef.current.textContent = accumulated;
```

### Package.json Merge Conflicts
**Problem:** Git conflict markers in package.json
**Solution:** Keep improved lint script:
```json
"lint": "eslint && npm run type-check"
```

### Baseline-browser-mapping Warning
**Expected:** Warning about 2-month-old data
**Action:** Ignore - package is at latest version, data limitation

## Testing & Validation

**Before Committing:**
```bash
npm run lint             # Must pass
npm run build            # Must succeed
```

**Coverage Verification:**
```bash
npx tsx scripts/audit-coverage.ts  # Verify 100% candidate coverage
# Expected: All three question counts (15, 20, 25) achieve 100% coverage
# This is an ETHICAL REQUIREMENT - all candidates must have fair chance to rank #1
```

**Training Validation:**
```bash
npm run train:dev        # Test with 3 candidates first
# Check output for:
# - Questions generated: 150
# - Positions extracted: ~21 (7 areas × 3 candidates)
# - Cost: ~$0.02
```

## Git Workflow

**Branch Naming:**
- `feature/phase-{number}` for phases
- `fix/description` for bug fixes
- `docs/description` for documentation

**Commits:**
- Use conventional commits when possible
- Include affected files in description
- Phase completions: Reference phase number

**Merging:**
- Resolve conflicts in favor of improved code
- Keep enhanced features (better lint, centralized constants, etc.)

## Performance Expectations

- `/api/questions`: < 200ms
- `/api/match`: < 500ms (optimized with Maps)
- `/api/explain`: 2-4s total streaming time
- Training (dev): ~5 minutes
- Training (prod): 30-60 minutes

## Cost Tracking

**Development (3 candidates):**
- Training: ~$0.02
- Per user: $0.00015 (AI explanation only)

**Production (~20 candidates):**
- Training: $85-150 (one-time)
- Per user: $0.00015
- 5M users: ~$750 + $100 DynamoDB = ~$850

## Phase Status

- ✅ Phase 1: Training & Data Pipeline (Complete)
- ✅ Phase 2-4: Backend, Frontend, UI (Complete)
- ⏳ Phase 5: Testing Suite (Pending)
- ⏳ Phase 6: Analytics (Pending)
- ⏳ Phase 7: Neutrality Verification (Pending)
- ⏳ Phase 8: Deployment (Pending)

## Resources

- `docs/TRIPLE_PATHWAY_ARCHITECTURE.md` - Matching algorithm deep dive (100% coverage)
- `docs/ARCH_AWS_SETUP.md` - DynamoDB setup, IAM permissions
- `docs/IMPLEMENTATION_PLAN.md` - Complete implementation guide
- `.env.example` - Environment variable template

## Quick Fixes Reference

**Linting fails:**
```bash
npm run type-check  # See TypeScript errors first
```

**Build fails:**
- Check for merge conflict markers (`<<<<<<<`)
- Verify all imports resolve
- Run `npm run lint` to catch type errors

**Training fails:**
- Check OpenAI API key
- Verify AWS credentials
- Ensure DynamoDB tables exist
- Check `.env` configuration

## Notes for Future Sessions

- This is a **production-ready** voter matching system
- **Political neutrality** is critical - maintain bias detection
- **Spanish language only** for Costa Rica context
- **Cost efficiency** is built-in - single AI call per user
- **Open source ready** - code quality matters
