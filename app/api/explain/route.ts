import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { formatMatchingExplanationPrompt } from '@/lib/training/prompts-es-cr';
import { logProgress } from '@/lib/training/utils';
import { POLICY_AREA_LABELS, OPENAI_MODELS } from '@/lib/constants';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface CandidateMatch {
  candidateId: string;
  name: string;
  party: string;
  score: number;
  alignmentByArea: Record<string, number>;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { matches, questionCount } = body as {
      matches: CandidateMatch[];
      questionCount: number;
    };

    if (!matches || matches.length === 0) {
      logProgress('Error: No matches provided for explanation');
      return new Response('No matches provided', { status: 400 });
    }

    if (!questionCount || questionCount < 1) {
      logProgress('Error: Invalid question count');
      return new Response('Invalid question count', { status: 400 });
    }

    const topMatches = matches.slice(0, 3);

    // Ensure we have at least one match
    if (topMatches.length === 0) {
      return new Response('No matches found', { status: 400 });
    }

    // Format alignment areas for the top candidate
    const topAreas = Object.entries(topMatches[0].alignmentByArea)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([area]) => POLICY_AREA_LABELS[area] || area);

    const alignmentAreas = topAreas.join(', ');

    // Format prompt using centralized template
    const prompt = formatMatchingExplanationPrompt({
      questionCount,
      candidate1Name: topMatches[0].name,
      candidate1Party: topMatches[0].party,
      candidate1Score: Math.round(topMatches[0].score),
      candidate2Name: topMatches[1]?.name || 'N/A',
      candidate2Party: topMatches[1]?.party || 'N/A',
      candidate2Score: Math.round(topMatches[1]?.score || 0),
      candidate3Name: topMatches[2]?.name || 'N/A',
      candidate3Party: topMatches[2]?.party || 'N/A',
      candidate3Score: Math.round(topMatches[2]?.score || 0),
      alignmentAreas,
    });

    logProgress('Generating AI explanation', {
      topCandidate: topMatches[0].name,
      score: Math.round(topMatches[0].score),
      questionCount,
    });

    const stream = await openai.chat.completions.create({
      model: OPENAI_MODELS.EXPLANATION,
      messages: [{ role: 'user', content: prompt }],
      stream: true,
      temperature: 0.7,
      max_tokens: 400,
    });

    const encoder = new TextEncoder();

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content || '';
            if (text) {
              controller.enqueue(encoder.encode(text));
            }
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error) {
    console.error('Error generating explanation:', error);
    return new Response('Failed to generate explanation', { status: 500 });
  }
}
