'use client';
import type { ReactNode } from 'react';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  AlertCircle,
  Check,
  Copy,
  Lightbulb,
  ListChecks,
  Loader2,
  RotateCcw,
  Wrench,
} from 'lucide-react';

type RefineMode = 'features' | 'implementation';

export default function PromptRefiner() {
  const [idea, setIdea] = useState('');
  const [functionality, setFunctionality] = useState('');
  const [implementation, setImplementation] = useState('');
  const [provider, setProvider] = useState('');
  const [error, setError] = useState('');
  const [loadingMode, setLoadingMode] = useState<RefineMode | null>(null);
  const [copied, setCopied] = useState(false);

  const isLoading = loadingMode !== null;
  const copyValue = implementation || functionality;

  const readTextStream = async (response: Response, onChunk: (value: string) => void) => {
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let result = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      result += decoder.decode(value, { stream: true });
      onChunk(result);
    }
  };

  const refine = async (mode: RefineMode) => {
    if (!idea.trim() || isLoading) return;
    if (mode === 'implementation' && !functionality.trim()) return;

    setCopied(false);
    setError('');
    setProvider('');
    setLoadingMode(mode);

    if (mode === 'features') {
      setFunctionality('');
      setImplementation('');
    } else {
      setImplementation('');
    }

    try {
      const response = await fetch('/api/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea, functionality, mode }),
      });

      if (!response.ok) throw new Error('Failed to refine prompt');
      setProvider(response.headers.get('X-AI-Provider') ?? '');

      await readTextStream(response, mode === 'features' ? setFunctionality : setImplementation);
    } catch (error) {
      console.error('Error:', error);
      setError('Could not generate this step. Please check your provider keys or try again.');
    } finally {
      setLoadingMode(null);
    }
  };

  const copyToClipboard = async () => {
    if (!copyValue) return;
    await navigator.clipboard.writeText(copyValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const reset = () => {
    setIdea('');
    setFunctionality('');
    setImplementation('');
    setProvider('');
    setError('');
    setCopied(false);
    setLoadingMode(null);
  };

  return (
    <main className="min-h-screen px-4 py-6 text-zinc-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl flex-col gap-5">
        <header className="flex flex-col gap-2 border-b border-zinc-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase text-teal-700">Prompt Refiner</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-normal text-zinc-950 sm:text-4xl">
              Idea to features to implementation.
            </h1>
          </div>
          <div className="text-sm text-zinc-600">
            {provider ? `Model: ${provider}` : 'Gemini, Groq, OpenRouter fallback'}
          </div>
        </header>

        <section className="grid flex-1 gap-5 lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.2fr)]">
          <div className="flex min-h-[340px] flex-col rounded-lg border border-zinc-200 bg-white">
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
              <label htmlFor="idea" className="flex items-center gap-2 text-sm font-medium text-zinc-800">
                <Lightbulb size={17} />
                Idea
              </label>
              <span className="text-xs text-zinc-500">{idea.length} chars</span>
            </div>

            <textarea
              id="idea"
              value={idea}
              onChange={(event) => setIdea(event.target.value)}
              placeholder="I want a task manager with boards, drag and drop tasks, dark mode, offline sync, and PDF export."
              className="min-h-72 flex-1 resize-none bg-transparent p-4 text-base leading-7 text-zinc-900 outline-none placeholder:text-zinc-400"
            />

            <div className="space-y-3 border-t border-zinc-200 p-3">
              <button
                onClick={() => refine('features')}
                disabled={isLoading || !idea.trim()}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 text-sm font-medium text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-600"
              >
                {loadingMode === 'features' ? <Loader2 size={18} className="animate-spin" /> : <ListChecks size={18} />}
                {loadingMode === 'features' ? 'Generating functionality' : 'Generate functionality'}
              </button>

              <button
                onClick={() => refine('implementation')}
                disabled={isLoading || !idea.trim() || !functionality.trim()}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-600"
              >
                {loadingMode === 'implementation' ? <Loader2 size={18} className="animate-spin" /> : <Wrench size={18} />}
                {loadingMode === 'implementation' ? 'Generating implementation' : 'Suggest implementation'}
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={copyToClipboard}
                  disabled={!copyValue}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:border-zinc-200 disabled:text-zinc-400"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
                <button
                  onClick={reset}
                  disabled={isLoading || (!idea && !functionality && !implementation && !error)}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:border-zinc-200 disabled:text-zinc-400"
                >
                  <RotateCcw size={16} />
                  Reset
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-5">
            {error && (
              <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <OutputPanel
              icon={<ListChecks size={17} />}
              title="Proposed Functionality"
              value={functionality}
              isLoading={loadingMode === 'features'}
              emptyText="Generate functionality from your idea first."
            />

            <OutputPanel
              icon={<Wrench size={17} />}
              title="Implementation Suggestion"
              value={implementation}
              isLoading={loadingMode === 'implementation'}
              emptyText="Use the proposed functionality to generate an implementation suggestion."
            />
          </div>
        </section>
      </div>
    </main>
  );
}

function OutputPanel({
  icon,
  title,
  value,
  isLoading,
  emptyText,
}: {
  icon: ReactNode;
  title: string;
  value: string;
  isLoading: boolean;
  emptyText: string;
}) {
  return (
    <div className="flex min-h-[270px] flex-col rounded-lg border border-zinc-200 bg-zinc-950 text-zinc-100">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-medium">
          {icon}
          {title}
        </h2>
        {value && <p className="text-xs text-zinc-400">{value.length} chars</p>}
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-5">
        {isLoading && (
          <div className="flex h-full min-h-48 items-center justify-center text-sm text-zinc-400">
            <Loader2 size={18} className="mr-2 animate-spin" />
            Working on this step
          </div>
        )}

        {!isLoading && !value && (
          <div className="flex h-full min-h-48 items-center justify-center text-center text-sm text-zinc-500">
            {emptyText}
          </div>
        )}

        {!isLoading && value && (
          <div className="markdown-output text-sm leading-7 text-zinc-100">
            <ReactMarkdown>{value}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
