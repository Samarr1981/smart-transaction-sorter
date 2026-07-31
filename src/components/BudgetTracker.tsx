'use client';

import { useState, useEffect, useMemo } from 'react';
import { formatCurrency, AMOUNT_CLASS } from '@/lib/currency';

type Transaction = {
  Date: string;
  Description: string;
  Amount: string;
  Category: string;
};

type BudgetTrackerProps = {
  transactions: Transaction[];
};

export default function BudgetTracker({ transactions }: BudgetTrackerProps) {
  const [budgets, setBudgets] = useState<Record<string, number>>({});
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState<string>("");

  // Load budgets from API
  useEffect(() => {
    const fetchBudgets = async () => {
      try {
        const response = await fetch("/api/budgets/get");
        if (response.ok) {
          const { budgets: loadedBudgets } = await response.json();
          setBudgets(loadedBudgets || {});
        }
      } catch (error) {
        console.error("Error loading budgets:", error);
      }
    };
    fetchBudgets();
  }, []);

  // Calculate spending per category
  const categorySpending = useMemo(() => {
    const spending: Record<string, number> = {};
    
    transactions.forEach((t) => {
      const amount = parseFloat(t.Amount);
      if (amount < 0) { // Only expenses
        const category = t.Category || "Other";
        if (!spending[category]) spending[category] = 0;
        spending[category] += Math.abs(amount);
      }
    });

    return spending;
  }, [transactions]);

  // Get all categories (from transactions + budgets)
  const allCategories = useMemo(() => {
    const cats = new Set<string>();
    Object.keys(categorySpending).forEach(c => cats.add(c));
    Object.keys(budgets).forEach(c => cats.add(c));
    return Array.from(cats).sort();
  }, [categorySpending, budgets]);

  const saveBudget = async (category: string, amount: number) => {
    try {
      const response = await fetch("/api/budgets/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, amount }),
      });

      if (response.ok) {
        setBudgets((prev) => ({ ...prev, [category]: amount }));
        setEditingCategory(null);
        setEditAmount("");
      }
    } catch (error) {
      console.error("Error saving budget:", error);
    }
  };

  const startEditing = (category: string) => {
    setEditingCategory(category);
    setEditAmount(budgets[category]?.toString() || "");
  };

  const handleSave = (category: string) => {
    const amount = parseFloat(editAmount);
    if (amount > 0) {
      saveBudget(category, amount);
    }
  };

  if (allCategories.length === 0) return null;

  return (
    <div className="bg-surface border border-line rounded-md p-4">
      <div className="mb-3">
        <h3 className="text-base font-semibold text-ink">Budget Tracker</h3>
        <p className="text-xs text-ink-muted">Set spending limits per category</p>
      </div>

      <div className="space-y-2">
        {allCategories.map((category) => {
          const spent = categorySpending[category] || 0;
          const budget = budgets[category] || 0;
          const percentage = budget > 0 ? (spent / budget) * 100 : 0;
          const isOverBudget = spent > budget && budget > 0;
          const isNearLimit = percentage >= 90 && percentage < 100;
          const barTone = isOverBudget ? 'bg-negative' : isNearLimit ? 'bg-warning' : 'bg-positive';

          return (
            <div key={category} className="bg-paper border border-line rounded-md p-3">
              <div className="flex justify-between items-start gap-3 mb-2">
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold text-ink truncate">{category}</h4>
                  <p className={`text-xs text-ink-muted ${AMOUNT_CLASS}`}>
                    {formatCurrency(spent)}
                    {budget > 0 && <span> / {formatCurrency(budget)}</span>}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  {editingCategory === category ? (
                    <div className="flex gap-1.5 items-center">
                      <input
                        type="number"
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        className={`w-20 bg-surface border border-line rounded-md px-2 py-1 text-xs ${AMOUNT_CLASS} focus:outline-none focus-visible:ring-2 focus-visible:ring-accent`}
                        placeholder="0.00"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSave(category)}
                        className="bg-accent text-surface px-2.5 py-1 rounded-md text-xs font-medium hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingCategory(null)}
                        className="bg-surface border border-line text-ink-muted px-2.5 py-1 rounded-md text-xs font-medium hover:bg-line focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEditing(category)}
                      className="text-accent text-xs font-medium hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-md"
                    >
                      {budget > 0 ? 'Edit budget' : 'Set budget'}
                    </button>
                  )}
                </div>
              </div>

              {budget > 0 && (
                <>
                  <div className="w-full bg-line rounded-md h-1.5 mb-1.5 overflow-hidden">
                    <div
                      className={`h-1.5 rounded-md transition-all ${barTone}`}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-ink-muted">{percentage.toFixed(0)}% used</span>
                    {isOverBudget && (
                      <span className={`text-negative font-medium ${AMOUNT_CLASS}`}>
                        Over by {formatCurrency(spent - budget)}
                      </span>
                    )}
                    {isNearLimit && !isOverBudget && (
                      <span className="text-warning font-medium">Approaching limit</span>
                    )}
                    {!isOverBudget && !isNearLimit && percentage > 0 && (
                      <span className={`text-ink-muted ${AMOUNT_CLASS}`}>
                        {formatCurrency(budget - spent)} remaining
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-3 pt-3 border-t border-line">
        <p className="text-xs text-ink-muted">
          <span className="font-medium text-ink">Tip —</span> set a budget on any category to get
          over-limit warnings here.
        </p>
      </div>
    </div>
  );
}