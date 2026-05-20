'use client';
import type { ReactNode } from 'react';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  AlertCircle,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  FileText,
  Lightbulb,
  ListChecks,
  Loader2,
  Pencil,
  RotateCcw,
  Wand2,
  Wrench,
} from 'lucide-react';

type RefineMode = 'features' | 'implementation' | 'final-prompt';
type ProviderChoice = 'auto' | 'gemini' | 'groq' | 'openrouter';

type OutputSection = {
  id: 'functionality' | 'implementation' | 'finalPrompt';
  title: string;
  icon: ReactNode;
  value: string;
  setValue: (value: string) => void;
  isLoading: boolean;
  emptyText: string;
  placeholder: string;
};

export default function PromptRefiner() {
  const [idea, setIdea] = useState('');
  const [functionality, setFunctionality] = useState('');
  const [implementation, setImplementation] = useState('');
  const [finalPrompt, setFinalPrompt] = useState('');
  const [provider, setProvider] = useState('');
  const [providerChoice, setProviderChoice] = useState<ProviderChoice>('auto');
  const [error, setError] = useState('');
  const [loadingMode, setLoadingMode] = useState<RefineMode | null>(null);
  const [copied, setCopied] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    functionality: true,
    implementation: true,
    finalPrompt: true,
  });

  const isLoading = loadingMode !== null;
  const copyValue = finalPrompt || implementation || functionality;
  const providerChoiceLabel =
    providerChoice === 'auto'
      ? 'Gemini, then fallback'
      : providerChoice === 'gemini'
        ? 'Gemini only'
        : providerChoice === 'groq'
          ? 'Groq only'
          : 'OpenRouter only';

  const completedSteps = [
    functionality && 'functionality',
    implementation && 'implementation',
    finalPrompt && 'finalPrompt',
  ].filter(Boolean);

  const steps = [
    { id: 'functionality', label: 'Functionality', icon: ListChecks },
    { id: 'implementation', label: 'Implementation', icon: Wrench },
    { id: 'finalPrompt', label: 'Final Prompt', icon: FileText },
  ] as const;

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

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
    if (mode === 'final-prompt' && (!functionality.trim() || !implementation.trim())) return;

    setCopied(false);
    setError('');
    setProvider('');
    setLoadingMode(mode);

    if (mode === 'features') {
      setFunctionality('');
      setImplementation('');
      setFinalPrompt('');
    } else {
      if (mode === 'implementation') {
        setImplementation('');
        setFinalPrompt('');
      } else {
        setFinalPrompt('');
      }
    }

    try {
      const response = await fetch('/api/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea, functionality, implementation, mode, providerChoice }),
      });

      if (!response.ok) throw new Error('Failed to refine prompt');
      setProvider(response.headers.get('X-AI-Provider') ?? '');

      await readTextStream(
        response,
        mode === 'features' ? setFunctionality : mode === 'implementation' ? setImplementation : setFinalPrompt
      );
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
    setFinalPrompt('');
    setProvider('');
    setError('');
    setCopied(false);
    setLoadingMode(null);
    setExpandedSections({ functionality: true, implementation: true, finalPrompt: true });
  };

  const outputSections: OutputSection[] = [
    {
      id: 'functionality',
      title: 'Proposed Functionality',
      icon: <ListChecks size={16} />,
      value: functionality,
      setValue: setFunctionality,
      isLoading: loadingMode === 'features',
      emptyText: 'Generate functionality from your idea.',
      placeholder: 'Core features and user flows will appear here...',
    },
    {
      id: 'implementation',
      title: 'Implementation Suggestion',
      icon: <Wrench size={16} />,
      value: implementation,
      setValue: setImplementation,
      isLoading: loadingMode === 'implementation',
      emptyText: 'Generate implementation guidance after functionality.',
      placeholder: 'Tech stack and architecture recommendations will appear here...',
    },
    {
      id: 'finalPrompt',
      title: 'Final Vibe Coding Prompt',
      icon: <FileText size={16} />,
      value: finalPrompt,
      setValue: setFinalPrompt,
      isLoading: loadingMode === 'final-prompt',
      emptyText: 'Combine all steps into a final prompt.',
      placeholder: 'Your complete AI-ready prompt will appear here...',
    },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl flex-col gap-6">
        {/* Header */}
        <header className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-4 py-1.5 text-sm font-medium text-teal-700">
            <Wand2 size={16} />
            AI-Powered Prompt Engineering
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            Transform Ideas into Build Prompts
          </h1>
          <p className="mt-2 text-base text-zinc-600">
            Turn rough product ideas into clear, actionable AI development prompts.
          </p>
        </header>

        {/* Progress Steps */}
        <div className="flex items-center justify-center">
          <nav className="flex items-center gap-0" aria-label="Progress">
            {steps.map((step, index) => {
              const isCompleted = completedSteps.includes(step.id);
              const isActive = loadingMode !== null;
              const Icon = step.icon;
              return (
                <div key={step.id} className="flex items-center">
                  <div
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 transition ${
                      isCompleted
                        ? 'bg-teal-100 text-teal-700'
                        : isActive
                          ? 'bg-zinc-200 text-zinc-600'
                          : 'text-zinc-400'
                    }`}
                  >
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition ${
                        isCompleted
                          ? 'bg-teal-600 text-white'
                          : isActive
                            ? 'bg-zinc-300 text-zinc-600'
                            : 'bg-zinc-200 text-zinc-400'
                      }`}
                    >
                      {isCompleted ? <Check size={14} /> : index + 1}
                    </span>
                    <span className="hidden text-sm font-medium sm:inline">{step.label}</span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className="mx-2 h-0.5 w-8 bg-zinc-200 sm:w-12" />
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <div className="flex-1">
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          {/* Left Panel - Input */}
          <div className="w-full flex-shrink-0 lg:sticky lg:top-8 lg:w-80">
            <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
              <label htmlFor="idea" className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-800">
                <Lightbulb size={18} className="text-teal-600" />
                Your Idea
              </label>
              <textarea
                id="idea"
                value={idea}
                onChange={(event) => setIdea(event.target.value)}
                placeholder="Describe your app idea in simple terms..."
                rows={8}
                className="w-full resize-none rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm leading-relaxed text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
              />
              <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
                <span>{idea.length} characters</span>
              </div>

              {/* Provider Selection */}
              <div className="mt-4">
                <label htmlFor="provider-choice" className="mb-2 block text-xs font-medium text-zinc-600">
                  AI Model
                </label>
                <select
                  id="provider-choice"
                  value={providerChoice}
                  onChange={(event) => setProviderChoice(event.target.value as ProviderChoice)}
                  disabled={isLoading}
                  className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-700 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 disabled:cursor-not-allowed disabled:bg-zinc-100"
                >
                  <option value="auto">Gemini + fallback</option>
                  <option value="gemini">Gemini Flash-Lite</option>
                  <option value="groq">Groq Llama 3.3 70B</option>
                  <option value="openrouter">OpenRouter Free</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 space-y-3">
                <button
                  onClick={() => refine('features')}
                  disabled={isLoading || !idea.trim()}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500 disabled:shadow-none"
                >
                  {loadingMode === 'features' ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <>
                      <ListChecks size={18} />
                      <ArrowRight size={16} />
                    </>
                  )}
                  {loadingMode === 'features' ? 'Generating...' : '1. Generate Functionality'}
                </button>

                <button
                  onClick={() => refine('implementation')}
                  disabled={isLoading || !idea.trim() || !functionality.trim()}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500 disabled:shadow-none"
                >
                  {loadingMode === 'implementation' ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Wrench size={18} />
                  )}
                  {loadingMode === 'implementation' ? 'Generating...' : '2. Get Implementation'}
                </button>

                <button
                  onClick={() => refine('final-prompt')}
                  disabled={isLoading || !idea.trim() || !functionality.trim() || !implementation.trim()}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500 disabled:shadow-none"
                >
                  {loadingMode === 'final-prompt' ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <FileText size={18} />
                  )}
                  {loadingMode === 'final-prompt' ? 'Generating...' : '3. Create Final Prompt'}
                </button>
              </div>

              {/* Utility Buttons */}
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  onClick={copyToClipboard}
                  disabled={!copyValue}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:border-zinc-100 disabled:text-zinc-400"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
                <button
                  onClick={reset}
                  disabled={isLoading || (!idea && !functionality && !implementation && !finalPrompt && !error)}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:border-zinc-100 disabled:text-zinc-400"
                >
                  <RotateCcw size={16} />
                  Reset
                </button>
              </div>

              {/* Provider Info */}
              {provider && (
                <div className="mt-4 rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-500">
                  Used: <span className="font-medium text-zinc-700">{provider}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Output Sections */}
          <div className="flex-1 space-y-4">
            {outputSections.map((section) => (
              <OutputCard
                key={section.id}
                {...section}
                isExpanded={expandedSections[section.id]}
                onToggle={() => toggleSection(section.id)}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <footer className="py-4 text-center text-xs text-zinc-400">
          <p>Prompt Refiner — Turn ideas into actionable AI prompts</p>
        </footer>
      </div>
    </main>
  );
}

function OutputCard({
  id,
  title,
  icon,
  value,
  setValue,
  isLoading,
  emptyText,
  placeholder,
  isExpanded,
  onToggle,
}: OutputSection & { isExpanded: boolean; onToggle: () => void }) {
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [copiedOutput, setCopiedOutput] = useState(false);

  const copyOutput = async () => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopiedOutput(true);
    setTimeout(() => setCopiedOutput(false), 2000);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition-all">
      {/* Card Header */}
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-zinc-50"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600">
            {icon}
          </span>
          <span className="text-sm font-semibold text-zinc-800">{title}</span>
          {value && (
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">
              {value.length} chars
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isLoading && <Loader2 size={16} className="animate-spin text-teal-600" />}
          {isExpanded ? <ChevronUp size={18} className="text-zinc-400" /> : <ChevronDown size={18} className="text-zinc-400" />}
        </div>
      </button>

      {/* Card Content */}
      {isExpanded && (
        <div className="border-t border-zinc-100 px-5 pb-4">
          {isLoading && (
            <div className="flex items-center justify-center py-12 text-sm text-zinc-500">
              <Loader2 size={20} className="mr-3 animate-spin text-teal-600" />
              <span>AI is generating content...</span>
            </div>
          )}

          {!isLoading && !value && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-3 rounded-full bg-zinc-100 p-3">
                {icon}
              </div>
              <p className="text-sm text-zinc-500">{emptyText}</p>
            </div>
          )}

          {!isLoading && value && (
            <div className="mt-3">
              {/* Toolbar */}
              <div className="mb-3 flex items-center justify-end gap-2">
                <button
                  onClick={copyOutput}
                  className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-800"
                >
                  {copiedOutput ? <Check size={14} /> : <Copy size={14} />}
                  {copiedOutput ? 'Copied' : 'Copy'}
                </button>
                <button
                  onClick={() => setIsPreviewing((current) => !current)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-800"
                >
                  {isPreviewing ? <Pencil size={14} /> : <FileText size={14} />}
                  {isPreviewing ? 'Edit' : 'Preview'}
                </button>
              </div>

              {/* Content Area */}
              {isPreviewing ? (
                <div className="markdown-output rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm leading-relaxed text-zinc-800">
                  <ReactMarkdown>{value}</ReactMarkdown>
                </div>
              ) : (
                <textarea
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                  rows={Math.max(6, value.split('\n').length)}
                  className="w-full resize-y rounded-lg border border-zinc-200 bg-zinc-50 p-4 font-mono text-sm leading-relaxed text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                  placeholder={placeholder}
                  aria-label={`${title} editor`}
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}