# Votante AI

AI-powered voter matching system for Costa Rica's 2026 presidential elections. Match voters with candidates based on policy positions using transparent AI analysis.

## Features

- **AI-Powered Analysis**: Extracts policy positions from candidate documents using GPT-4o-mini
- **Neutral Question Generation**: Creates unbiased questions across 7 policy areas
- **Triple Pathway Matching**: Three parallel scoring algorithms ensure 100% candidate coverage
- **100% Fairness Guarantee**: Every candidate can achieve #1 ranking (verified via automated testing)
- **Real-time Explanations**: Streaming AI-generated explanations for match results (Spanish only)
- **Open Source**: Public verification of neutrality and methodology

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS v4
- **AI**: OpenAI API (GPT-4o-mini for explanations, text-embedding-3-small for embeddings)
- **Database**: AWS DynamoDB (on-demand billing)
- **Deployment**: Vercel / AWS

## Getting Started

### Prerequisites

- Node.js 20+
- AWS Account with DynamoDB access
- OpenAI API key

### Installation

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Configure your environment variables
# OPENAI_API_KEY, AWS credentials, etc.
```

### Environment Variables

See `.env.example` for all required configuration:

- `OPENAI_API_KEY` - Your OpenAI API key
- `AWS_ACCESS_KEY_ID` - AWS credentials
- `AWS_SECRET_ACCESS_KEY` - AWS secret
- `AWS_REGION` - AWS region (default: us-east-1)
- `NODE_ENV` - Environment (development/production)
- `QUESTION_COUNT` - Number of questions to generate (150 for dev, 1000+ for prod)
- `DRY_RUN` - Test mode with 3 candidates (true/false)

### AWS Setup

See [docs/AWS_SETUP.md](docs/AWS_SETUP.md) for detailed AWS configuration.

Quick start:

```bash
# Create DynamoDB tables
aws dynamodb create-table \
  --table-name candidate-positions-dev \
  --attribute-definitions \
      AttributeName=candidateId,AttributeType=S \
      AttributeName=policyArea,AttributeType=S \
  --key-schema \
      AttributeName=candidateId,KeyType=HASH \
      AttributeName=policyArea,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST

aws dynamodb create-table \
  --table-name question-bank-dev \
  --attribute-definitions AttributeName=questionId,AttributeType=S \
  --key-schema AttributeName=questionId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST
```

### Training the System

```bash
# Development mode (3 candidates for testing)
npm run train:dev

# Production mode (all candidates)
npm run train
```

### Running the App

```bash
# Development server
npm run dev

# Production build
npm run build
npm start
```

## Project Structure

```
├── app/                    # Next.js app directory
│   ├── api/               # API routes (questions, match, explain)
│   ├── page.tsx           # Main quiz interface
│   └── globals.css        # Global styles
├── components/            # React components
├── lib/
│   ├── matching/          # Triple pathway algorithm
│   ├── training/          # Training pipeline utilities
│   ├── db/                # DynamoDB operations
│   └── constants.ts       # Configuration
├── scripts/
│   ├── train-system.ts    # Main training script
│   └── audit-coverage.ts  # Coverage verification (100% test)
├── data/
│   └── comprehensive-questions.json  # Question bank
├── public/assets/docs/    # Candidate PDF documents
└── docs/                  # Documentation
    ├── TRIPLE_PATHWAY_ARCHITECTURE.md
    ├── IMPLEMENTATION_PLAN.md
    └── AWS_SETUP.md
```

## Policy Areas

The system analyzes candidates across 7 policy areas:

1. **Economy** - Economic policy and finance
2. **Healthcare** - Health and social security
3. **Education** - Education policy
4. **Security** - Public safety and justice
5. **Environment** - Environmental sustainability
6. **Social** - Social policy and equity
7. **Infrastructure** - Infrastructure and development

## Matching Algorithm

The system uses a **Triple Pathway Architecture** that guarantees 100% candidate coverage:

- **PATH 1**: Percentile rank matching (favors specialists)
- **PATH 2**: Consistency scoring (favors generalists)
- **PATH 3**: Direct similarity scoring (favors comprehensive candidates)

Final score = MAX(path1, path2, path3) + comprehensive bonus

This ensures every candidate can achieve #1 ranking with appropriate user input, maintaining political fairness and neutrality.

**Coverage Verification:**
```bash
npx tsx scripts/audit-coverage.ts  # Verifies 100% coverage
```

## Documentation

- [Triple Pathway Architecture](docs/TRIPLE_PATHWAY_ARCHITECTURE.md) - Matching algorithm deep dive
- [Implementation Plan](docs/IMPLEMENTATION_PLAN.md) - Detailed development roadmap
- [AWS Setup](docs/AWS_SETUP.md) - AWS configuration guide
- [Developer Guide](CLAUDE.md) - Code style and patterns

## License

MIT

## About

This project provides a transparent, AI-powered voter matching system for Costa Rica's 2026 presidential elections. The triple pathway architecture ensures fairness by guaranteeing every candidate can achieve top ranking with appropriate voter responses.
