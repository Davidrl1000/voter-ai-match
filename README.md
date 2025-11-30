# Votante AI

AI-powered voter matching system for Costa Rica's 2026 presidential elections. Match voters with candidates based on policy positions using transparent AI analysis.

## Features

- **AI-Powered Analysis**: Extracts policy positions from candidate documents using GPT-4o-mini
- **Neutral Question Generation**: Creates unbiased questions across 7 policy areas
- **Transparent Matching**: Deterministic hybrid algorithm (70% embedding similarity + 30% weighted agreement)
- **Real-time Explanations**: Streaming AI-generated explanations for match results
- **Open Source**: Public verification of neutrality and methodology

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS v4
- **AI**: OpenAI API (GPT-4o-mini for dev, o1-pro for production)
- **Database**: AWS DynamoDB (on-demand billing)
- **PDF Processing**: pdfjs-dist (Mozilla PDF.js)
- **Deployment**: AWS Amplify

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
# Development mode (3 candidates, GPT-4o-mini, ~$0.20)
npm run train:dev

# Production mode (all candidates, o1-pro, ~$20)
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
├── lib/
│   └── training/          # Training pipeline utilities
│       ├── utils.ts       # Retry, validation, cost estimation
│       ├── prompts-es-cr.ts # Spanish prompts for Costa Rica
│       ├── candidate-mapper.ts # Data transformation
│       └── progress-tracker.ts # Training progress tracking
├── scripts/
│   └── train-system.ts    # Main training script
├── data/
│   └── candidates.json    # Candidate metadata
├── public/assets/docs/    # Candidate PDF documents
├── types/                 # TypeScript type definitions
└── docs/                  # Documentation
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

## Cost Estimates

### Development (DRY_RUN=true, 3 candidates)
- Training: ~$0.20 (GPT-4o-mini)
- Per user: ~$0.00015 (streaming explanation)
- 5M users: ~$750

### Production (all candidates)
- Training: ~$20 (o1-pro, one-time)
- Per user: ~$0.00015 (streaming explanation)
- 5M users: ~$770 total

## Documentation

- [Implementation Plan](docs/IMPLEMENTATION_PLAN.md) - Detailed development roadmap
- [AWS Setup](docs/AWS_SETUP.md) - AWS configuration guide

## License

MIT

## Contributing

This is an open-source project for Costa Rica's 2026 elections. Contributions welcome!

## Support

For issues or questions, please open an issue on GitHub.
