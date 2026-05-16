# Prompt Refiner

Prompt Refiner turns a rough product idea into a structured AI coding prompt.

The app guides you through three steps:

1. Generate proposed functionality from a simple idea.
2. Generate implementation suggestions from the edited functionality.
3. Generate a final ready-to-paste prompt for coding chatbots like Claude, Cursor, Codex, or similar tools.

Outputs are editable, copyable, and can be previewed as markdown.

## Features

- Three-step prompt refinement workflow
- Editable generated outputs
- Markdown preview toggle for every output
- Copy button for every output
- Automatic language matching based on the user's idea
- LLM selector with Gemini fallback mode by default
- Free-model focused provider setup:
  - Gemini Flash-Lite
  - Groq Llama 3.3 70B
  - OpenRouter Free

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Vercel AI SDK
- Google, Groq, and OpenRouter-compatible providers

## Setup

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
copy .env.example .env.local
```

Then add your provider keys:

```env
GOOGLE_GENERATIVE_AI_API_KEY=...
GROQ_API_KEY=gsk_...
OPENROUTER_API_KEY=sk-or-...

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

You do not need every key to run the app. The app skips providers whose keys are missing.

## Running Locally

Start the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Model Selection

The LLM selector supports:

- `Gemini + fallback`: uses Gemini first, then Groq, then OpenRouter if a provider hits a limit or transient error.
- `Gemini Flash-Lite`: uses only Gemini.
- `Groq Llama 3.3 70B`: uses only Groq.
- `OpenRouter Free`: uses only OpenRouter's free model router.

The default option is `Gemini + fallback`.

## Workflow

1. Enter a rough idea.
2. Choose an LLM mode.
3. Click `Generate functionality`.
4. Edit the proposed functionality if needed.
5. Click `Suggest implementation`.
6. Edit the implementation suggestion if needed.
7. Click `Generate final prompt`.
8. Copy the final vibe coding prompt into your coding assistant.

Each generated panel has:

- editable markdown
- `Preview MD`
- `Copy`

## Project Structure

```text
app/
  api/refine/route.ts          AI generation endpoint and provider fallback
  components/PromptRefiner.tsx Main interactive UI
  lib/constants.ts             System prompts for each generation step
  page.tsx                     App entry page
  layout.tsx                   Metadata and root layout
```

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Notes

- Do not commit real API keys.
- The app asks the model to answer in the same language as the original idea.
- If a specific provider is selected and its key is missing, the API returns a configuration error.
- If fallback mode is selected, at least one provider key must be configured.
