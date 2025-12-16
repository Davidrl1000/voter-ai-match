# Votante AI

AI-powered voter matching system for Costa Rica's 2026 presidential elections. Matches voters with candidates based on policy positions using transparent AI analysis.

## Live site (Costa Rica 2026)
Site: [https://votante-ai.com](https://votante-ai.com/)

## Features

- **Neutral Question Generation**: Creates unbiased questions across 7 policy areas
- **Fairness-First Matching**: Rank-based scoring with jitter ensures fair probability distribution
- **AI-Powered Explanations**: Real-time streaming explanations for match results (Spanish)
- **Comprehensive Auditing**: Automated tests verify 100% coverage and rotation fairness
- **Open Source**: Public verification of neutrality and methodology

## Tech Stack

- Next.js 15, React 19, TypeScript
- OpenAI API (GPT-4o-mini, text-embedding-3-small)
- AWS DynamoDB
- Tailwind CSS

## Quick Start

### Prerequisites

- Node.js 20+
- AWS account with DynamoDB access
- OpenAI API key

### Installation

```bash
npm install
cp .env.example .env
# Configure environment variables in .env
```

See `.env.example` for required configuration.

### Setup

1. **Configure AWS**: See [docs/AWS_SETUP.md](docs/AWS_SETUP.md) for DynamoDB table setup
2. **Train the system**:
   ```bash
   npm run train:dev  # Test with 3 candidates
   npm run train      # Full training (all 20 candidates)
   ```
3. **Run the app**:
   ```bash
   npm run dev        # Development (localhost:3000)
   npm run build      # Production build
   ```

## Project Structure

```
app/
├── api/              # API routes (questions, match, explain)
└── page.tsx          # Quiz interface

components/           # React components (Quiz, Results, etc.)

lib/
├── matching/         # Fairness-first rank-based algorithm
├── training/         # Training pipeline & prompts
├── db/               # DynamoDB operations
└── constants.ts      # System configuration

scripts/
├── train-system.ts   # Main training script
├── audit-coverage.ts # Verify 100% candidate coverage
└── audit-fairness.ts # Verify probability distribution & rotation

data/
└── comprehensive-questions.json  # Generated question bank

docs/                 # Architecture & setup guides
```

## Policy Areas

The system analyzes 7 policy areas:

- Economy
- Healthcare
- Education
- Security
- Environment
- Social Policy
- Infrastructure

## Matching Algorithm

Uses **fairness-first rank-based scoring with jitter**:

1. Z-score normalize similarities (remove baseline bias)
2. Calculate semantic alignment using cosine similarity
3. Add 10% random jitter to prevent systematic advantages
4. Rank candidates and assign points (1st=100, last=0)
5. Average points across questions

**Why jitter?** OpenAI embeddings have inherent bias - some candidates naturally align better. Jitter reduces unfair advantages while preserving meaningful matches.

**Fairness metrics:**
- Coefficient of Variation: 29-46% (down from 89-130%)
- 100% candidate coverage: every candidate can rank #1
- Excellent rotation: different quizzes favor different candidates

**Verify fairness:**
```bash
npm run audit              # Run all audits
npm run audit:coverage     # Verify 100% coverage
npm run audit:fairness     # Verify probability distribution
```

## Documentation

- [Changelog](docs/CHANGELOG.md) - System changes
- [Implementation Plan](docs/IMPLEMENTATION_PLAN.md) - Original architecture
- [AWS Setup Guide](docs/AWS_SETUP.md) - DynamoDB configuration

## License

MIT
