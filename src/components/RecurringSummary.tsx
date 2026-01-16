'use client';

import { useMemo } from 'react';

type Transaction = {
  Date: string;
  Description: string;
  Amount: string;
  Category: string;
};

type RecurringSummaryProps = {
  transactions: Transaction[];
};

type RecurringGroup = {
  description: string;
  amount: number;
  frequency: string;
  transactions: Transaction[];
  nextCharge: string;
  monthlyAverage: number;
};

export default function RecurringSummary({ transactions }: RecurringSummaryProps) {
  const recurring = useMemo(() => {
    return findRecurringTransactions(transactions);
  }, [transactions]);

  const totalMonthly = recurring.reduce((sum, r) => sum + r.monthlyAverage, 0);
  const totalYearly = totalMonthly * 12;

  if (recurring.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl p-6 shadow-lg">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-3xl">🔁</span>
        <div>
          <h3 className="text-2xl font-bold text-purple-900">Recurring Charges Detected</h3>
          <p className="text-sm text-purple-600">Subscriptions and regular payments</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
  <div className="bg-white rounded-lg p-3 shadow flex-1 text-center">
    <p className="text-xs text-gray-600 mb-1">Active</p>
    <p className="text-2xl font-bold text-purple-600">{recurring.length}</p>
  </div>
  <div className="bg-white rounded-lg p-3 shadow flex-1 text-center">
    <p className="text-xs text-gray-600 mb-1">Monthly</p>
    <p className="text-lg font-bold text-blue-600">${totalMonthly.toFixed(2)}</p>
  </div>
  <div className="bg-white rounded-lg p-3 shadow flex-1 text-center">
    <p className="text-xs text-gray-600 mb-1">Yearly</p>
    <p className="text-lg font-bold text-red-600">${totalYearly.toFixed(2)}</p>
  </div>
</div>

      <div className="space-y-3">
        <h4 className="font-semibold text-gray-700 mb-2">Breakdown:</h4>
        {recurring.map((r, idx) => (
          <div key={idx} className="bg-white rounded-lg p-4 shadow flex justify-between items-center">
            <div className="flex-1 min-w-0 mr-4">
              <p className="font-semibold text-gray-800 truncate">{r.description}</p>
              <p className="text-sm text-gray-500">
                {r.frequency} • {r.transactions.length} charges detected
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-lg font-bold text-gray-900 whitespace-nowrap">${r.amount.toFixed(2)}</p>
              <p className="text-xs text-gray-500 whitespace-nowrap">
                ~${r.monthlyAverage.toFixed(2)}/mo
              </p>
              <p className="text-xs text-blue-600 whitespace-nowrap">Next: {r.nextCharge}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm text-yellow-800">
          💡 <strong>Tip:</strong> These recurring charges will cost you approximately{' '}
          <strong>${totalMonthly.toFixed(2)}</strong> next month. Consider reviewing subscriptions you
          no longer use.
        </p>
      </div>
    </div>
  );
}

// Copy the same detection function here
function findRecurringTransactions(transactions: Transaction[]): RecurringGroup[] {
  if (transactions.length < 2) return [];

  const groups: Map<string, Transaction[]> = new Map();

  transactions.forEach((t) => {
    const amount = parseFloat(t.Amount);
    if (amount >= 0) return;

    const desc = t.Description.toLowerCase().trim();
    const absAmount = Math.abs(amount);
    const key = `${desc.substring(0, 15)}_${Math.round(absAmount)}`;
    
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(t);
  });

  const recurring: RecurringGroup[] = [];

  groups.forEach((txns) => {
    if (txns.length < 2) return;

    const sorted = txns.sort((a, b) => 
      new Date(a.Date).getTime() - new Date(b.Date).getTime()
    );

    const intervals: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const date1 = new Date(sorted[i - 1].Date);
      const date2 = new Date(sorted[i].Date);
      const diffDays = Math.round((date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24));
      intervals.push(diffDays);
    }

    if (intervals.length === 0) return;

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

    let frequency = "";
    let isRecurring = false;

    if (avgInterval >= 25 && avgInterval <= 35) {
      frequency = "Monthly";
      isRecurring = true;
    } else if (avgInterval >= 85 && avgInterval <= 95) {
      frequency = "Quarterly";
      isRecurring = true;
    } else if (avgInterval >= 350 && avgInterval <= 380) {
      frequency = "Yearly";
      isRecurring = true;
    } else if (avgInterval >= 6 && avgInterval <= 8) {
      frequency = "Weekly";
      isRecurring = true;
    }

    if (!isRecurring) return;

    const lastDate = new Date(sorted[sorted.length - 1].Date);
    const nextDate = new Date(lastDate);
    nextDate.setDate(nextDate.getDate() + Math.round(avgInterval));

    let monthlyAverage = Math.abs(parseFloat(sorted[0].Amount));
    if (frequency === "Weekly") monthlyAverage *= 4.33;
    if (frequency === "Quarterly") monthlyAverage /= 3;
    if (frequency === "Yearly") monthlyAverage /= 12;

    recurring.push({
      description: sorted[0].Description,
      amount: Math.abs(parseFloat(sorted[0].Amount)),
      frequency,
      transactions: sorted,
      nextCharge: nextDate.toISOString().split('T')[0],
      monthlyAverage,
    });
  });

  return recurring;
}