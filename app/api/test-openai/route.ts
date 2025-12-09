import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function GET() {
  console.log('Test endpoint called');
  console.log('OpenAI imported successfully');

  try {
    // Just test if OpenAI can be instantiated
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || 'test-key',
    });

    console.log('OpenAI client created');

    return NextResponse.json({
      success: true,
      message: 'OpenAI SDK loads successfully',
      hasApiKey: !!process.env.OPENAI_API_KEY
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
