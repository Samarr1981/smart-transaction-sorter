'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';

interface DeleteAllTransactionsButtonProps {
  onDeleteComplete: () => void;
}

export default function DeleteAllTransactionsButton({ onDeleteComplete }: DeleteAllTransactionsButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDeleteAll = async () => {
    setIsDeleting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/transactions/delete-all', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Successfully deleted ${data.deletedCount} transaction${data.deletedCount !== 1 ? 's' : ''}`);
        onDeleteComplete();
      } else {
        alert('Failed to delete transactions');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred while deleting transactions');
    } finally {
      setIsDeleting(false);
      setShowConfirm(false);
    }
  };

  return (
    <div>
      {!showConfirm ? (
        <button
          onClick={() => setShowConfirm(true)}
          className="bg-surface border border-line text-negative font-semibold text-sm py-2 px-4 rounded-md hover:bg-paper transition flex items-center justify-center gap-2 w-full sm:w-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-negative"
        >
          <Trash2 className="w-4 h-4" />
          <span className="hidden sm:inline">Clear All</span>
          <span className="sm:hidden">Clear</span>
        </button>
      ) : (
        <div className="fixed inset-0 bg-ink/50 flex items-center justify-center p-4 z-10000">
          <div className="bg-surface rounded-md w-full max-w-md p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 bg-paper border border-line rounded-md flex items-center justify-center">
                <Trash2 className="w-4 h-4 text-negative" />
              </div>
              <h3 className="text-lg font-semibold text-ink">Delete all transactions?</h3>
            </div>

            <p className="text-sm text-ink-muted mb-5">
              This will permanently delete all your transactions. This action cannot be undone.
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 border border-line text-ink-muted font-medium text-sm rounded-md hover:bg-paper transition disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAll}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-negative text-surface font-medium text-sm rounded-md hover:opacity-90 transition disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-negative"
              >
                {isDeleting ? 'Deleting…' : 'Yes, delete all'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}