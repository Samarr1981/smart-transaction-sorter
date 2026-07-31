'use client';

import { useState } from 'react';

export default function InsightsAssistant({ transactions }: { transactions: any[] }) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setAnswer('');

    const res = await fetch('/api/insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactions, question }),
    });

    const data = await res.json();
    setAnswer(data.answer);
    setLoading(false);
  }

  return (
    <div className="bg-surface border border-line rounded-md p-4">
      <h2 className="text-base font-semibold text-ink mb-3">Ask a question about your spending</h2>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. Where did I spend the most?"
          className="flex-1 border border-line bg-paper text-ink text-sm p-2.5 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          required
        />
        <button
          type="submit"
          className="bg-accent text-surface font-semibold text-sm px-4 py-2.5 rounded-md hover:opacity-90 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          Ask
        </button>
      </form>
      {loading && <p className="mt-3 text-xs text-ink-muted">Analyzing…</p>}
      {answer && (
        <div className="mt-3 bg-paper border border-line p-3 rounded-md">
          <p className="text-sm text-ink whitespace-pre-line">{answer}</p>
        </div>
      )}
    </div>
  );
}
