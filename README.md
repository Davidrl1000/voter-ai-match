# Votante AI

AI-powered voter matching system for Costa Rica's 2026 presidential elections. Matches voters with candidates based on policy positions using transparent AI analysis.

## Features

- **Neutral Question Generation**: Creates unbiased questions across 7 policy areas
- **Triple Pathway Matching**: Three parallel scoring algorithms ensure every candidate can rank #1
- **AI-Powered Explanations**: Real-time streaming explanations for match results (Spanish)
- **Automated Fairness Testing**: 100% candidate coverage verified via comprehensive test suite
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
├── matching/         # Triple pathway algorithm
├── training/         # Training pipeline & prompts
├── db/               # DynamoDB operations
└── constants.ts      # System configuration

scripts/
├── train-system.ts   # Main training script
└── audit-coverage.ts # Fairness verification tests

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

Uses **Triple Pathway Architecture** to guarantee fairness:

- **PATH 1**: Percentile rank matching (favors specialists)
- **PATH 2**: Consistency scoring (favors generalists)
- **PATH 3**: Direct similarity (favors comprehensive data)

Final score = MAX(path1, path2, path3) + comprehensive bonus

This ensures every candidate can achieve #1 ranking depending on voter responses.

**Verify fairness:**
```bash
npx tsx scripts/audit-coverage.ts
```

## Documentation

- [Triple Pathway Architecture](docs/TRIPLE_PATHWAY_ARCHITECTURE.md)
- [Implementation Plan](docs/IMPLEMENTATION_PLAN.md)
- [AWS Setup Guide](docs/AWS_SETUP.md)

## License

MIT
