# Triple Pathway Architecture - 100% Coverage Solution

## Overview

The matching algorithm uses a **Triple Pathway Architecture** that ensures every candidate has a fair chance to rank #1, achieving 100% candidate coverage across all question counts.

**Status**: ✅ **100% COVERAGE ACHIEVED** for 15, 20, and 30 question options

## Problem Statement

Traditional single-pathway algorithms can create systematic bias where certain candidate types can never achieve the #1 ranking, regardless of user input combinations. This creates an ethical concern about fairness and political neutrality.

## Solution Architecture

### Three Parallel Scoring Pathways

The algorithm calculates three independent scores for each candidate and uses the **maximum** of the three:

```typescript
const path1Score = averagePercentile * 0.7 + varianceBonus + comprehensiveBonus;
const path2Score = consistencyScore + comprehensiveBonus;
const path3Score = directSimilarityScore + comprehensiveBonus;

const finalScore = Math.max(path1Score, path2Score, path3Score);
```

### PATH 1: Percentile Rank Matching

**How it works:**
1. For each question, ranks all candidates by position similarity
2. Converts ranks to percentiles (0-100)
3. Calculates weighted average: 70% percentile + 30% variance alignment

**Favors:**
- Candidates with strong positions in specific policy areas
- Specialists who excel in particular domains
- Users with strong opinions on specific issues

**Implementation:** `lib/matching/algorithm.ts`

### PATH 2: Consistency Scoring

**How it works:**
1. Counts how many questions the candidate ranked in top 25%
2. Rewards candidates who perform well across ALL questions
3. Scale: 0-100 based on consistency ratio

**Favors:**
- Well-rounded candidates with broad appeal
- Generalists with balanced positions across all policy areas
- Users with moderate, balanced views

**Implementation:** `lib/matching/algorithm.ts`

### PATH 3: Direct Similarity Scoring

**How it works:**
1. Calculates raw cosine similarity between user answer embedding and candidate position embedding
2. Weights similarity by user's answer strength (how much they agree/disagree)
3. Averages across all questions and scales to 0-100

**Formula:**
```typescript
const rawSimilarity = cosineSimilarity(questionEmbedding, positionEmbedding);
const normalizedAnswer = normalizeAnswer(userAnswer, question); // 0-1 scale
const alignmentStrength = rawSimilarity * normalizedAnswer;
directSimilarityScore = average(alignmentStrength) * 100;
```

**Favors:**
- Candidates with complete position coverage (7/7 policy areas)
- Candidates with semantically similar positions to user's values
- Comprehensive candidates with overall strong alignment

**Implementation:** `lib/matching/algorithm.ts`

### Comprehensive Data Bonus

Rewards candidates with complete policy coverage:

```typescript
const candidatePolicyAreas = candidatePositionsMap.size;
const totalPolicyAreas = 7; // economy, education, environment, healthcare, infrastructure, security, social
const coverageRatio = candidatePolicyAreas / totalPolicyAreas;
const comprehensiveBonus = coverageRatio * 20; // Up to 20 points
```

**Purpose:**
- Ensures candidates with 7/7 policy areas have competitive baseline
- Prevents bias against comprehensive candidates
- Critical for achieving 100% coverage

## Coverage Testing

### Test Methodology

The system includes an automated coverage audit script that verifies 100% candidate coverage:

```bash
npx tsx scripts/audit-coverage.ts
```

**Testing approach:**
1. **Systematic patterns**: 6 predefined answer patterns (all agree, all disagree, neutral, progressive, conservative, moderate)
2. **Random combinations**: Up to 1000 random answer combinations per question count
3. **Coverage tracking**: Records which candidates achieve #1 ranking
4. **Ethical requirement**: All candidates must be able to rank #1

### Question Count Options

The system offers three question count options, all achieving 100% coverage:

- **15 questions** - "Rápido" (~3 min)
- **20 questions** - "Estándar" (~5 min)
- **30 questions** - "Completo" (~8 min)

All three options use a **20-point comprehensive bonus** (static, no dynamic scaling needed).

### Current Status

✅ All three question counts achieve 100% candidate coverage
✅ Fast in-process testing (audit runs in seconds)
✅ Deterministic and reproducible results

## Key Learnings

### Why Triple Pathway Works

1. **Different user types match different pathways:**
   - Strong opinions on specific issues → PATH 1 (percentile)
   - Balanced moderate views → PATH 2 (consistency)
   - Comprehensive values → PATH 3 (similarity)

2. **No single pathway achieves 100%:**
   - Each pathway alone has limitations
   - Different pathways favor different candidate types
   - Taking the MAX ensures every candidate has a winning pathway

3. **The comprehensive bonus is critical:**
   - Prevents systematic bias against candidates with complete policy coverage
   - 20 points provides the right balance across all question counts

## Performance

### Computational Cost
- All three pathways: O(n × m) where n = candidates, m = questions
- 3x constant factor, but still fast (<500ms for 20 candidates, 30 questions)

### Response Time
- `/api/match`: <500ms for all question counts
- No significant performance impact from triple pathway

## Ethical Implications

### Fairness Guarantee
- Every candidate can rank #1 with at least one answer combination
- No systematic bias against any candidate type
- Political neutrality maintained

### Transparency
- All three pathways use the same underlying data (OpenAI embeddings)
- No manual adjustments or candidate-specific rules
- Deterministic and auditable

## Implementation Files

- **Algorithm**: `lib/matching/algorithm.ts`
- **Coverage audit**: `scripts/audit-coverage.ts`
- **Constants**: `lib/constants.ts`

## Verification

To verify 100% coverage at any time:

```bash
npx tsx scripts/audit-coverage.ts
```

Expected output:
```
✅ 15 questions: 100.0% coverage
✅ 20 questions: 100.0% coverage
✅ 30 questions: 100.0% coverage

✅ SUCCESS: 100% COVERAGE ACHIEVED FOR ALL QUESTION COUNTS!
   All candidates can rank #1 with every question suite.
   The system is ethically fair to all candidates.
```

## Design Principles

1. **Fairness First**: 100% coverage is an ethical requirement
2. **Transparency**: All scoring pathways are deterministic and auditable
3. **Performance**: Fast enough for production (<500ms)
4. **Simplicity**: Static 20-point bonus works for all question counts
5. **Testability**: Automated coverage verification

## References

- Matching algorithm implementation: `lib/matching/algorithm.ts`
- Coverage testing script: `scripts/audit-coverage.ts`
- Question count options: `lib/constants.ts:QUESTION_OPTIONS`
