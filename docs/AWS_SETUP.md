# AWS Setup Guide

This guide covers setting up AWS resources for Votante AI.

## DynamoDB Tables

### 1. Candidate Positions Table

Stores policy positions for each candidate (one item per policy area per candidate).

```bash
aws dynamodb create-table \
  --table-name candidate-positions-dev \
  --attribute-definitions \
      AttributeName=candidateId,AttributeType=S \
      AttributeName=policyArea,AttributeType=S \
  --key-schema \
      AttributeName=candidateId,KeyType=HASH \
      AttributeName=policyArea,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

**Table Structure**:
- Partition Key: `candidateId` (String) - e.g., "abc-xyz"
- Sort Key: `policyArea` (String) - e.g., "economy", "healthcare"
- Attributes: `name`, `party`, `position`, `embedding`, `extractedAt`

### 2. Question Bank Table

Stores generated questions for the voter quiz.

```bash
aws dynamodb create-table \
  --table-name question-bank-dev \
  --attribute-definitions AttributeName=questionId,AttributeType=S \
  --key-schema AttributeName=questionId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

**Table Structure**:
- Partition Key: `questionId` (String) - e.g., "q-economy-001"
- Attributes: `text`, `policyArea`, `type`, `options`, `embedding`, `weight`

### 3. Match Results Table

Stores individual match results from completed quizzes.

```bash
aws dynamodb create-table \
  --table-name match-results-dev \
  --attribute-definitions AttributeName=resultId,AttributeType=S \
  --key-schema AttributeName=resultId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

**Table Structure**:
- Partition Key: `resultId` (String) - UUID
- Attributes: `timestamp`, `topCandidateId`, `questionCount`

### 4. Aggregated Stats Table

Stores pre-calculated aggregated statistics using **write sharding** for scalability.

```bash
aws dynamodb create-table \
  --table-name aggregated-stats-dev \
  --attribute-definitions AttributeName=statsId,AttributeType=S \
  --key-schema AttributeName=statsId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

**Table Structure**:
- Partition Key: `statsId` (String) - Sharded: "global-0" to "global-99"
- Attributes: `totalMatches`, `totalQuestions`, `candidateStats`, `lastUpdated`

**Sharding Architecture**:
- Uses **100 shards** to distribute writes across partitions
- Prevents hot partition issues during viral traffic spikes
- Each shard can handle ~1000 writes/second
- Total capacity: **100,000 writes/second** (handles 2.5M+ concurrent users)
- Reads aggregate all shards in parallel using BatchGetCommand
- Results cached for 30 seconds to reduce read costs

## IAM Permissions

Create an IAM policy with these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DynamoDBAccess",
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem",
        "dynamodb:GetItem",
        "dynamodb:UpdateItem",
        "dynamodb:BatchWriteItem",
        "dynamodb:Query",
        "dynamodb:Scan",
        "dynamodb:DescribeTable",
        "dynamodb:BatchGetItem"
      ],
      "Resource": [
        "arn:aws:dynamodb:us-east-1:*:table/candidate-positions-*",
        "arn:aws:dynamodb:us-east-1:*:table/question-bank-*",
        "arn:aws:dynamodb:us-east-1:*:table/match-results-*",
        "arn:aws:dynamodb:us-east-1:*:table/aggregated-stats-*"
      ]
    }
  ]
}
```

### Attach Policy

**Via AWS CLI**:
```bash
aws iam put-user-policy \
  --user-name YOUR_USERNAME \
  --policy-name VotanteAIPolicy \
  --policy-document file://iam-policy.json
```

**Via AWS Console**:
1. Go to IAM → Users → [Your User]
2. Add permissions → Create inline policy
3. Paste the JSON above
4. Name: `VotanteAIPolicy`
5. Create policy

## Production Tables

For production, create tables with `-prod` suffix:

```bash
# Candidate positions (production)
aws dynamodb create-table \
  --table-name candidate-positions-prod \
  --attribute-definitions \
      AttributeName=candidateId,AttributeType=S \
      AttributeName=policyArea,AttributeType=S \
  --key-schema \
      AttributeName=candidateId,KeyType=HASH \
      AttributeName=policyArea,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1

# Question bank (production)
aws dynamodb create-table \
  --table-name question-bank-prod \
  --attribute-definitions AttributeName=questionId,AttributeType=S \
  --key-schema AttributeName=questionId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1

# Match results (production)
aws dynamodb create-table \
  --table-name match-results-prod \
  --attribute-definitions AttributeName=resultId,AttributeType=S \
  --key-schema AttributeName=resultId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1

# Aggregated stats (production)
aws dynamodb create-table \
  --table-name aggregated-stats-prod \
  --attribute-definitions AttributeName=statsId,AttributeType=S \
  --key-schema AttributeName=statsId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

## Cost Considerations

### DynamoDB On-Demand Pricing (us-east-1)
- **Write**: $1.25 per million write request units
- **Read**: $0.25 per million read request units
- **Storage**: $0.25 per GB-month

### Estimated Costs

**Training (one-time)**:
- ~300 writes (3 candidates × 7 policy areas × 15 positions avg) = $0.0004
- ~150 writes (questions) = $0.0002
- Total: < $0.01

**Per User**:
- ~10 reads (adaptive questions) = $0.0000025
- 1 read (match results) = $0.00000025
- Total per user: < $0.000003

**5M Users**:
- DynamoDB: ~$15
- OpenAI (explanations): ~$750
- **Total: ~$765**

## Verification

```bash
# List tables
aws dynamodb list-tables --region us-east-1

# Describe table
aws dynamodb describe-table \
  --table-name candidate-positions-dev \
  --region us-east-1 \
  --query 'Table.[TableName,TableStatus,ItemCount]'
```

## Troubleshooting

### "ResourceNotFoundException"
- Table doesn't exist or wrong region
- Check table name matches `.env` configuration

### "AccessDeniedException"
- IAM permissions not attached
- Verify policy is attached to your user

### "ProvisionedThroughputExceededException"
- Should not happen with on-demand billing
- Check billing mode is set to PAY_PER_REQUEST

## Cleanup

To delete tables (careful!):

```bash
aws dynamodb delete-table --table-name candidate-positions-dev
aws dynamodb delete-table --table-name question-bank-dev
aws dynamodb delete-table --table-name match-results-dev
aws dynamodb delete-table --table-name aggregated-stats-dev
```
