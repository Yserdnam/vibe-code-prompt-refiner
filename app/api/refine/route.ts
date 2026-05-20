import { google } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { APICallError, generateText, type LanguageModel } from 'ai';
import { NextRequest } from 'next/server';
import { FINAL_PROMPT_PROMPT, FUNCTIONALITY_PROMPT, IMPLEMENTATION_PROMPT } from '@/app/lib/constants';

type ModelProvider = {
  id: ProviderChoice;
  name: string;
  model: LanguageModel;
};

type ProviderChoice = 'auto' | 'gemini' | 'groq' | 'openrouter';

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

function getConfiguredProviders(providerChoice: ProviderChoice): ModelProvider[] {
  const providers: Array<ModelProvider & { apiKey?: string }> = [
    {
      id: 'gemini',
      name: 'gemini-flash-lite',
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      model: google('gemini-2.5-flash-lite'),
    },
    {
      id: 'groq',
      name: 'groq-llama-3.3-70b',
      apiKey: process.env.GROQ_API_KEY,
      model: groq.chat('llama-3.3-70b-versatile'),
    },
    {
      id: 'openrouter',
      name: 'openrouter-free',
      apiKey: process.env.OPENROUTER_API_KEY,
      model: openrouter.chat('openrouter/free'),
    },
  ];

  const configuredProviders = providers.filter(({ apiKey }) => Boolean(apiKey?.trim()));

  if (providerChoice === 'auto') {
    return configuredProviders;
  }

  return configuredProviders.filter(({ id }) => id === providerChoice);
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
    const { idea, functionality, implementation, mode = 'features', providerChoice = 'auto' } = await req.json();
    if (!idea?.trim()) return Response.json({ error: 'Idea is required' }, { status: 400 });
    if (mode !== 'features' && mode !== 'implementation' && mode !== 'final-prompt') {
      return Response.json({ error: 'Invalid refinement mode' }, { status: 400 });
    }
    if (
      providerChoice !== 'auto' &&
      providerChoice !== 'gemini' &&
      providerChoice !== 'groq' &&
      providerChoice !== 'openrouter'
    ) {
      return Response.json({ error: 'Invalid provider choice' }, { status: 400 });
    }
    if ((mode === 'implementation' || mode === 'final-prompt') && !functionality?.trim()) {
      return Response.json({ error: 'Functionality list is required' }, { status: 400 });
    }
    if (mode === 'final-prompt' && !implementation?.trim()) {
      return Response.json({ error: 'Implementation suggestion is required' }, { status: 400 });
    }

    const providers = getConfiguredProviders(providerChoice);
    if (providers.length === 0) {
      return Response.json(
        {
          error:
            providerChoice === 'auto'
              ? 'No AI provider key configured. Add GOOGLE_GENERATIVE_AI_API_KEY, GROQ_API_KEY, or OPENROUTER_API_KEY.'
              : 'The selected AI provider key is not configured.',
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
        ? `User Idea (detect language from this):\n${idea}\n\nProposed Functionality:\n${functionality}\n\nImplementation Suggestion:\n${implementation}\n\nCreate the final ready-to-paste prompt for an AI coding chatbot. IMPORTANT: Write the entire output in the same language as the user idea above. Translate all headings and content.`
        : mode === 'implementation'
          ? `User Idea (detect language from this):\n${idea}\n\nProposed Functionality:\n${functionality}\n\nSuggest the implementation approach. IMPORTANT: Write the entire output in the same language as the user idea above. Translate all headings and content.`
          : `User Idea (detect language from this):\n${idea}\n\nPropose the functionality for this product. IMPORTANT: Write the entire output in the same language as the user idea above. Translate all headings and content.`;
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
