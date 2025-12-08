// Test Setup for AI Logic & Neutrality Tests
// Mock environment variables for training and matching tests

process.env.OPENAI_API_KEY = 'test-api-key';
process.env.ARCH_AWS_REGION = 'us-east-1';
process.env.DYNAMODB_TABLE_QUESTIONS = 'test-questions';
process.env.DYNAMODB_TABLE_POSITIONS = 'test-positions';
