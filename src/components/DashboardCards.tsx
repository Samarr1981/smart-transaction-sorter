'use client';

import { useMemo } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Receipt } from 'lucide-react';
import { formatCurrency, AMOUNT_CLASS } from '@/lib/currency';

type Transaction = {
  Date: string;
  Description: string;
  Amount: string;
  Category: string;
};

type DashboardCardsProps = {
  transactions: Transaction[];
};

export default function DashboardCards({ transactions }: DashboardCardsProps) {
  const stats = useMemo(() => {
    let totalIncome = 0;
    let totalExpenses = 0;
    let transactionCount = transactions.length;

    transactions.forEach((t) => {
      const amount = parseFloat(t.Amount);
      if (amount > 0) {
        totalIncome += amount;
      } else {
        totalExpenses += Math.abs(amount);
      }
    });

    const netSavings = totalIncome - totalExpenses;

    return {
      income: totalIncome,
      expenses: totalExpenses,
      savings: netSavings,
      count: transactionCount,
    };
  }, [transactions]);

  if (transactions.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      <Tile
        icon={<TrendingUp size={16} />}
        label="Income"
        value={formatCurrency(stats.income)}
        caption="Total earnings"
        tone="positive"
      />
      <Tile
        icon={<TrendingDown size={16} />}
        label="Expenses"
        value={formatCurrency(-stats.expenses)}
        caption="Total spending"
        tone="negative"
      />
      <Tile
        icon={<DollarSign size={16} />}
        label={stats.savings >= 0 ? 'Savings' : 'Deficit'}
        value={formatCurrency(stats.savings, { forceSign: true })}
        caption={stats.savings >= 0 ? 'Net savings' : 'Net deficit'}
        tone={stats.savings >= 0 ? 'positive' : 'negative'}
      />
      <Tile
        icon={<Receipt size={16} />}
        label="Count"
        value={String(stats.count)}
        caption="Total transactions"
        tone="neutral"
      />
    </div>
  );
}

const TONE_CLASSES: Record<'positive' | 'negative' | 'neutral', { icon: string; value: string }> = {
  positive: { icon: 'text-positive', value: 'text-ink' },
  negative: { icon: 'text-negative', value: 'text-ink' },
  neutral: { icon: 'text-ink-muted', value: 'text-ink' },
};

function Tile({
  icon,
  label,
  value,
  caption,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  caption: string;
  tone: 'positive' | 'negative' | 'neutral';
}) {
  const toneClasses = TONE_CLASSES[tone];
  return (
    <div className="bg-surface border border-line rounded-md p-4">
      <div className="flex items-center justify-between mb-3">
        <span className={toneClasses.icon}>{icon}</span>
        <span className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">{label}</span>
      </div>
      <div className={`${AMOUNT_CLASS} text-2xl font-semibold ${toneClasses.value} leading-tight`}>
        {value}
      </div>
      <p className="text-xs text-ink-muted mt-1">{caption}</p>
    </div>
  );
}