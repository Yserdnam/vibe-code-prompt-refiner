'use client';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Copy, Sparkles, Loader2 } from 'lucide-react';

export default function PromptRefiner() {
  const [idea, setIdea] = useState('');
  const [completion, setCompletion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleRefine = async () => {
    if (!idea.trim() || isLoading) return;
    setCopied(false);
    setIsLoading(true);
    setCompletion('');

    try {
      const response = await fetch('/api/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea }),
      });

      if (!response.ok) throw new Error('Failed to refine prompt');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let result = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        result += decoder.decode(value, { stream: true });
        setCompletion(result);
      }
    } catch (error) {
      console.error('Error:', error);
      setCompletion('Error refining prompt. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(completion);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold text-center">AI Prompt Refiner for Developers</h1>
      <p className="text-center text-gray-500">Paste a rough idea. Get a production-ready AI dev prompt.</p>

      <textarea
        value={idea}
        onChange={(e) => setIdea(e.target.value)}
        placeholder="e.g., I want a task manager where users can create boards, drag-drop tasks, and export to PDF. Support dark mode and offline sync."
        className="w-full h-32 p-4 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 resize-none"
      />

      <button
        onClick={handleRefine}
        disabled={isLoading || !idea.trim()}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2"
      >
        {isLoading ? <Loader2 className="animate-spin" /> : <Sparkles size={18} />}
        {isLoading ? 'Refining...' : 'Refine Prompt'}
      </button>

      {completion && (
        <div className="relative bg-gray-900 text-gray-100 p-6 rounded-lg space-y-2">
          <button
            onClick={copyToClipboard}
            className="absolute top-3 right-3 p-2 hover:bg-gray-700 rounded transition"
            title="Copy to clipboard"
          >
            <Copy size={18} />
          </button>
          {copied && <span className="absolute top-3 right-14 text-xs text-green-400">Copied!</span>}
          <div className="prose prose-invert max-w-none">
            <ReactMarkdown>{completion}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}