# AI Logic & Neutrality Test Suite

This test suite focuses exclusively on testing the **core AI logic** and **algorithm neutrality** of the Votante AI matching system.

## Philosophy

These tests are designed to prove that the matching algorithm is:
1. **Deterministic** - Same inputs always produce same outputs
2. **Fair** - All candidates have equal opportunity to match
3. **Neutral** - No hardcoded preferences or hidden bias
4. **Transparent** - Behavior is predictable and verifiable

## Test Structure

### 🧪 Unit Tests

#### Matching Algorithm (`tests/unit/matching-algorithm.test.ts`)
- ✅ Match score calculation
- ✅ Candidate sorting by score
- ✅ Policy area alignment tracking
- ✅ Deterministic behavior verification
- ✅ Empty/neutral answer handling
- ✅ Score range validation (0-100)
- ✅ All candidates have opportunity to be top match

**8 tests** ensuring the core matching logic works correctly.

#### Training Utilities (`tests/unit/training-utils.test.ts`)
- ✅ **cosineSimilarity** - Core AI similarity calculation
  - Identical vectors → 1
  - Orthogonal vectors → 0
  - Opposite vectors → -1
  - Handles edge cases (zero vectors, small values, large dimensions)
  - Commutative property verified

- ✅ **validatePolicyPosition** - Data integrity for candidate positions
  - Required fields validation
  - Policy area validation
  - Embedding validation
  - Prevents invalid data from entering system

- ✅ **validateQuestion** - Data integrity for questions
  - Question type validation (agreement-scale, specific-choice)
  - Options validation for specific-choice questions
  - Embedding validation

- ✅ **detectBiasIndicators** - Bias detection in text
  - Detects absolute language (siempre, nunca, todo, nada)
  - Detects presumptive language (obviamente, claramente)
  - Detects prescriptive language (debe, tienen que)
  - Detects comparative judgments (mejor, peor)
  - Only flags high frequency patterns (>3 occurrences)

- ✅ **chunkText** - Text processing for large documents
  - Chunking with overlap
  - Word boundary preservation
  - Whitespace trimming

- ✅ **estimateCost** - OpenAI API cost estimation
  - Correct pricing for different models
  - Linear scaling with token count

**43 tests** ensuring all training utilities work correctly.

### 🔍 Transparency Tests

#### Neutrality Verification (`tests/transparency/neutrality.test.ts`)

**PUBLIC TESTS** - These tests serve as proof that the system is neutral and fair.

##### Algorithm Determinism
- ✅ Identical inputs → identical outputs (run 10 times)
- ✅ Different inputs → different outputs

##### Equal Opportunity
- ✅ All candidates can be top match with right answers
- ✅ All candidates included in results

##### Score Fairness
- ✅ Scores within valid range (0-100)
- ✅ Reasonable score distribution (not all 0 or 100)

##### Policy Area Coverage
- ✅ Tracks alignment across multiple policy areas
- ✅ Calculates area-specific scores

##### No Hidden Bias
- ✅ No hardcoded candidate preferences
- ✅ Neutral answers produce similar scores across candidates

##### Adversarial Testing - Gaming Prevention
- ✅ Cannot game system by always answering extreme values
- ✅ Handles inconsistent answer patterns
- ✅ Does not favor candidates based on name or party

##### Embedding-Based Fairness
- ✅ Uses semantic similarity, not just answer values
- ✅ Weights both embedding similarity AND answer alignment

##### Opposite User Profiles
- ✅ Opposite answers produce different score distributions

##### Score Distribution Analysis
- ✅ Reasonable score variance (not all clustered)
- ✅ Never produces NaN or Infinity scores

**16 tests** proving the algorithm is neutral and fair.

## Running Tests

```bash
# Run all tests
npm run test:run

# Watch mode (auto-rerun on changes)
npm test

# Run with coverage
npm run test:coverage

# Run only transparency tests
npm run test:transparency

# Interactive UI
npm run test:ui
```

## Test Coverage

Current coverage focuses on:
- ✅ Matching algorithm core logic
- ✅ Training utilities (cosine similarity, validation, bias detection)
- ✅ Neutrality and fairness verification
- ✅ Edge cases and adversarial scenarios

**Not tested** (intentionally):
- ❌ UI components (E2E tests removed - not relevant for AI logic)
- ❌ API routes (just HTTP wrappers - not AI logic)
- ❌ Database operations (infrastructure, not logic)

## CI/CD Integration

Tests run automatically on every pull request via GitHub Actions:
- Type checking
- All unit tests
- All transparency tests
- Coverage report generation

See `.github/workflows/test.yml` for details.

## Test Philosophy

These tests are **public and transparent** - anyone can review them to verify:
1. The algorithm has no hidden bias
2. All candidates are treated fairly
3. Results are deterministic and reproducible
4. The system cannot be gamed

This transparency is core to building trust in the matching system.

## Adding New Tests

When adding new AI logic, add tests that verify:
1. **Correctness** - Does it work as intended?
2. **Neutrality** - Does it treat all candidates fairly?
3. **Edge cases** - What happens with unusual inputs?
4. **Adversarial cases** - Can it be gamed or exploited?

Focus on **logic and neutrality**, not infrastructure or UI.
