import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { NextRequest } from 'next/server';
import { SYSTEM_PROMPT } from '@/app/lib/constants';

export async function POST(req: NextRequest) {
  try {
    const { idea } = await req.json();
    if (!idea?.trim()) return Response.json({ error: 'Idea is required' }, { status: 400 });

    const result = streamText({
      model: openai('gpt-4o'), // Swap to anthropic/claude-3-5-sonnet-20241022 or xai/grok-2 if preferred
      system: SYSTEM_PROMPT,
      prompt: `User Idea:\n${idea}\n\nRefine this into a complete AI development prompt.`,
      temperature: 0.3,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error('Prompt refinement failed:', error);
    return Response.json({ error: 'Failed to refine prompt' }, { status: 500 });
  }
}