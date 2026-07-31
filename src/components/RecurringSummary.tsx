'use client';

import { useMemo } from 'react';
import { formatCurrency, AMOUNT_CLASS } from '@/lib/currency';

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
  intervalDays: number;
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
    <div className="bg-surface border border-line rounded-md p-4">
      <div className="mb-3">
        <h3 className="text-base font-semibold text-ink">Recurring Charges Detected</h3>
        <p className="text-xs text-ink-muted">Identified by matching description and day-gap between charges</p>
      </div>

      <div className="flex gap-2 mb-3">
        <div className="bg-paper border border-line rounded-md p-2.5 flex-1 text-center">
          <p className="text-[10px] font-medium uppercase tracking-wide text-ink-muted mb-0.5">Active</p>
          <p className={`text-lg font-semibold text-ink ${AMOUNT_CLASS}`}>{recurring.length}</p>
        </div>
        <div className="bg-paper border border-line rounded-md p-2.5 flex-1 text-center">
          <p className="text-[10px] font-medium uppercase tracking-wide text-ink-muted mb-0.5">Monthly</p>
          <p className={`text-sm font-semibold text-ink ${AMOUNT_CLASS}`}>{formatCurrency(totalMonthly)}</p>
        </div>
        <div className="bg-paper border border-line rounded-md p-2.5 flex-1 text-center">
          <p className="text-[10px] font-medium uppercase tracking-wide text-ink-muted mb-0.5">Yearly</p>
          <p className={`text-sm font-semibold text-ink ${AMOUNT_CLASS}`}>{formatCurrency(totalYearly)}</p>
        </div>
      </div>

      <div className="space-y-2">
        {recurring.map((r, idx) => (
          <div key={idx} className="bg-paper border border-line rounded-md p-3 flex items-center gap-3">
            {/* Signature element: the detected interval, not the dollar amount, is the
                focal point of this row - this is where the product's actual pattern
                detection is proven, so it gets the one bold accent treatment on the page. */}
            <div className="shrink-0 text-center px-2">
              <div className={`${AMOUNT_CLASS} text-xl font-bold text-accent leading-none`}>~{r.intervalDays}d</div>
              <div className="text-[9px] font-medium uppercase tracking-wide text-ink-muted mt-1">interval</div>
            </div>
            <div className="w-px self-stretch bg-line" aria-hidden />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-ink truncate">{r.description}</p>
              <p className="text-[11px] uppercase tracking-wide text-ink-muted mt-0.5">
                {r.frequency} · {r.transactions.length} charges detected
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className={`${AMOUNT_CLASS} text-sm font-semibold text-ink whitespace-nowrap`}>
                {formatCurrency(r.amount)}
              </p>
              <p className={`text-[11px] text-ink-muted whitespace-nowrap ${AMOUNT_CLASS}`}>
                ~{formatCurrency(r.monthlyAverage)}/mo
              </p>
              <p className="text-[11px] text-ink-muted whitespace-nowrap">Next {r.nextCharge}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 pt-3 border-t border-line">
        <p className="text-xs text-ink-muted">
          <span className="font-medium text-ink">Tip —</span> these will cost approximately{' '}
          <span className={`font-medium text-ink ${AMOUNT_CLASS}`}>{formatCurrency(totalMonthly)}</span> next month.
        </p>
      </div>
    </div>
  );
}

// Copy of the detection function used elsewhere - kept local intentionally, unchanged behavior.
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

    const sorted = txns.sort((a, b) => new Date(a.Date).getTime() - new Date(b.Date).getTime());

    const intervals: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const date1 = new Date(sorted[i - 1].Date);
      const date2 = new Date(sorted[i].Date);
      const diffDays = Math.round((date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24));
      intervals.push(diffDays);
    }

    if (intervals.length === 0) return;

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

    let frequency = '';
    let isRecurring = false;

    if (avgInterval >= 25 && avgInterval <= 35) {
      frequency = 'Monthly';
      isRecurring = true;
    } else if (avgInterval >= 85 && avgInterval <= 95) {
      frequency = 'Quarterly';
      isRecurring = true;
    } else if (avgInterval >= 350 && avgInterval <= 380) {
      frequency = 'Yearly';
      isRecurring = true;
    } else if (avgInterval >= 6 && avgInterval <= 8) {
      frequency = 'Weekly';
      isRecurring = true;
    }

    if (!isRecurring) return;

    const lastDate = new Date(sorted[sorted.length - 1].Date);
    const nextDate = new Date(lastDate);
    nextDate.setDate(nextDate.getDate() + Math.round(avgInterval));

    let monthlyAverage = Math.abs(parseFloat(sorted[0].Amount));
    if (frequency === 'Weekly') monthlyAverage *= 4.33;
    if (frequency === 'Quarterly') monthlyAverage /= 3;
    if (frequency === 'Yearly') monthlyAverage /= 12;

    recurring.push({
      description: sorted[0].Description,
      amount: Math.abs(parseFloat(sorted[0].Amount)),
      frequency,
      intervalDays: Math.round(avgInterval),
      transactions: sorted,
      nextCharge: nextDate.toISOString().split('T')[0],
      monthlyAverage,
    });
  });

  return recurring;
}
