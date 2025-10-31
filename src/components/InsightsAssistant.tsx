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
    <div className="mt-12 bg-white rounded-lg p-6 shadow-md">
      <h2 className="text-xl font-semibold mb-2">🧠 Ask GPT for Financial Insights</h2>
      <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g., Where did I spend the most?"
          className="border border-gray-300 p-2 rounded"
          required
        />
        <button
          type="submit"
          className="self-start bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Ask GPT
        </button>
      </form>
      {loading && <p className="mt-4 text-sm text-gray-500">Analyzing...</p>}
      {answer && (
        <div className="mt-4 bg-gray-50 border border-gray-200 p-4 rounded">
          <p className="text-gray-800 whitespace-pre-line">{answer}</p>
        </div>
      )}
    </div>
  );
}
