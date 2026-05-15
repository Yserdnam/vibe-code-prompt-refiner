import { google } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { APICallError, generateText, type LanguageModel } from 'ai';
import { NextRequest } from 'next/server';
import { FINAL_PROMPT_PROMPT, FUNCTIONALITY_PROMPT, IMPLEMENTATION_PROMPT } from '@/app/lib/constants';

type ModelProvider = {
  name: string;
  model: LanguageModel;
};

const groq = createOpenAI({
  name: 'groq',
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

const openrouter = createOpenAI({
  name: 'openrouter',
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
  headers: {
    'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
    'X-Title': 'Prompt Refiner',
  },
});

function getConfiguredProviders(): ModelProvider[] {
  const providers: Array<ModelProvider & { apiKey?: string }> = [
    {
      name: 'gemini-flash-lite',
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      model: google('gemini-2.5-flash-lite'),
    },
    {
      name: 'groq-llama-3.3-70b',
      apiKey: process.env.GROQ_API_KEY,
      model: groq.chat('llama-3.3-70b-versatile'),
    },
    {
      name: 'openrouter-free',
      apiKey: process.env.OPENROUTER_API_KEY,
      model: openrouter.chat('openrouter/free'),
    },
  ];

  return providers.filter(({ apiKey }) => Boolean(apiKey?.trim()));
}

function shouldFallback(error: unknown) {
  if (APICallError.isInstance(error)) {
    return (
      error.statusCode === 408 ||
      error.statusCode === 409 ||
      error.statusCode === 429 ||
      (error.statusCode != null && error.statusCode >= 500)
    );
  }

  const message = error instanceof Error ? error.message.toLowerCase() : '';
  return message.includes('quota') || message.includes('rate limit');
}

export async function POST(req: NextRequest) {
  try {
    const { idea, functionality, implementation, mode = 'features' } = await req.json();
    if (!idea?.trim()) return Response.json({ error: 'Idea is required' }, { status: 400 });
    if (mode !== 'features' && mode !== 'implementation' && mode !== 'final-prompt') {
      return Response.json({ error: 'Invalid refinement mode' }, { status: 400 });
    }
    if ((mode === 'implementation' || mode === 'final-prompt') && !functionality?.trim()) {
      return Response.json({ error: 'Functionality list is required' }, { status: 400 });
    }
    if (mode === 'final-prompt' && !implementation?.trim()) {
      return Response.json({ error: 'Implementation suggestion is required' }, { status: 400 });
    }

    const providers = getConfiguredProviders();
    if (providers.length === 0) {
      return Response.json(
        {
          error:
            'No AI provider key configured. Add GOOGLE_GENERATIVE_AI_API_KEY, GROQ_API_KEY, or OPENROUTER_API_KEY.',
        },
        { status: 500 }
      );
    }

    const system =
      mode === 'final-prompt'
        ? FINAL_PROMPT_PROMPT
        : mode === 'implementation'
          ? IMPLEMENTATION_PROMPT
          : FUNCTIONALITY_PROMPT;
    const prompt =
      mode === 'final-prompt'
        ? `User Idea:\n${idea}\n\nProposed Functionality:\n${functionality}\n\nImplementation Suggestion:\n${implementation}\n\nCreate the final ready-to-paste prompt for an AI coding chatbot.`
        : mode === 'implementation'
          ? `User Idea:\n${idea}\n\nProposed Functionality:\n${functionality}\n\nSuggest the implementation approach.`
          : `User Idea:\n${idea}\n\nPropose the functionality for this product.`;
    let lastError: unknown;

    for (const provider of providers) {
      try {
        const result = await generateText({
          model: provider.model,
          system,
          prompt,
          temperature: 0.3,
          maxRetries: 0,
        });

        return new Response(result.text, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'X-AI-Provider': provider.name,
          },
        });
      } catch (error) {
        lastError = error;
        console.warn(`Provider ${provider.name} failed:`, error);

        if (!shouldFallback(error)) {
          break;
        }
      }
    }

    throw lastError;
  } catch (error) {
    console.error('Prompt refinement failed:', error);
    return Response.json({ error: 'Failed to refine prompt' }, { status: 500 });
  }
}
