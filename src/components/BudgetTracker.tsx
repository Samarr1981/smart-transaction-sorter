'use client';

import { useState, useEffect, useMemo } from 'react';

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
    <div className="bg-gradient-to-r from-green-50 to-teal-50 border-2 border-green-200 rounded-xl p-6 shadow-lg">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">💰</span>
        <div>
          <h3 className="text-2xl font-bold text-green-900">Budget Tracker</h3>
          <p className="text-sm text-green-600">Set spending limits per category</p>
        </div>
      </div>

      <div className="space-y-4">
        {allCategories.map((category) => {
          const spent = categorySpending[category] || 0;
          const budget = budgets[category] || 0;
          const percentage = budget > 0 ? (spent / budget) * 100 : 0;
          const isOverBudget = spent > budget && budget > 0;
          const isNearLimit = percentage >= 90 && percentage < 100;

          return (
            <div key={category} className="bg-white rounded-lg p-4 shadow">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-800">{category}</h4>
                  <p className="text-sm text-gray-500">
                    Spent: ${spent.toFixed(2)}
                    {budget > 0 && ` / $${budget.toFixed(2)}`}
                  </p>
                </div>

                <div className="text-right">
                  {editingCategory === category ? (
                    <div className="flex gap-2 items-center">
                      <span className="text-sm">$</span>
                      <input
                        type="number"
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        className="w-24 border rounded px-2 py-1 text-sm"
                        placeholder="Budget"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSave(category)}
                        className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingCategory(null)}
                        className="bg-gray-300 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-400"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEditing(category)}
                      className="text-blue-600 text-sm hover:underline"
                    >
                      {budget > 0 ? "Edit Budget" : "Set Budget"}
                    </button>
                  )}
                </div>
              </div>

              {budget > 0 && (
                <>
                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-3 mb-2 overflow-hidden">
                    <div
                      className={`h-3 rounded-full transition-all ${
                        isOverBudget
                          ? "bg-red-600"
                          : isNearLimit
                          ? "bg-yellow-500"
                          : "bg-green-500"
                      }`}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>

                  {/* Status */}
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-600">
                      {percentage.toFixed(0)}% used
                    </span>
                    {isOverBudget && (
                      <span className="text-red-600 font-semibold">
                        ⚠️ Over budget by ${(spent - budget).toFixed(2)}
                      </span>
                    )}
                    {isNearLimit && !isOverBudget && (
                      <span className="text-yellow-600 font-semibold">
                        ⚠️ Approaching limit
                      </span>
                    )}
                    {!isOverBudget && !isNearLimit && percentage > 0 && (
                      <span className="text-green-600">
                        ${(budget - spent).toFixed(2)} remaining
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          💡 <strong>Tip:</strong> Click "Set Budget" to add spending limits for each category.
          Get alerts when you're approaching or exceeding your budget.
        </p>
      </div>
    </div>
  );
}