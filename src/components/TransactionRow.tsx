'use client';

import { TriangleAlert } from 'lucide-react';
import { categoryColor } from '@/lib/categoryColors';
import { formatCurrency, AMOUNT_CLASS } from '@/lib/currency';

type TransactionData = {
  Date: string;
  Description: string;
  Amount: string;
  Category: string;
};

type BadgeData = {
  isUnusual: boolean;
  threshold: number | null;
  isDuplicate: boolean;
  frequencyWarning: string | null;
};

type DesktopRowProps = {
  transaction: TransactionData;
  index: number;
  categoryOptions: string[];
  onCategoryChange: (index: number, category: string) => void;
  badges: BadgeData;
};

type MobileCardProps = DesktopRowProps;

function AnomalyNote({ threshold }: { threshold: number }) {
  return (
    <div className="flex items-center justify-end gap-1 text-[11px] text-negative mt-0.5">
      <TriangleAlert size={11} strokeWidth={2.5} />
      <span className={AMOUNT_CLASS}>vs {formatCurrency(threshold)} typical</span>
    </div>
  );
}

function QuietChips({ badges }: { badges: BadgeData }) {
  if (!badges.isDuplicate && !badges.frequencyWarning) return null;
  return (
    <div className="flex gap-1 flex-wrap justify-end mt-1">
      {badges.isDuplicate && (
        <span className="text-[10px] font-medium text-ink-muted bg-paper border border-line px-1.5 py-0.5 rounded-md">
          Possible duplicate
        </span>
      )}
      {badges.frequencyWarning && (
        <span className="text-[10px] font-medium text-ink-muted bg-paper border border-line px-1.5 py-0.5 rounded-md">
          Frequent charge
        </span>
      )}
    </div>
  );
}

// DESKTOP TABLE ROW
export function DesktopTransactionRow({
  transaction,
  index,
  categoryOptions,
  onCategoryChange,
  badges,
}: DesktopRowProps) {
  const amount = parseFloat(transaction.Amount);

  return (
    <tr
      className={`border-b border-line hover:bg-paper transition-colors ${
        badges.isUnusual ? 'border-l-2 border-l-negative' : 'border-l-2 border-l-transparent'
      }`}
    >
      <td className={`px-3 py-2.5 text-sm text-ink-muted whitespace-nowrap ${AMOUNT_CLASS}`}>{transaction.Date}</td>
      <td className="px-3 py-2.5 text-sm text-ink">
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: categoryColor(transaction.Category) }}
            aria-hidden
          />
          <span className="font-medium">{transaction.Description}</span>
        </div>
      </td>
      <td className="px-3 py-2.5 text-right whitespace-nowrap align-top">
        <div className={`${AMOUNT_CLASS} text-sm font-semibold ${amount < 0 ? 'text-ink' : 'text-positive'}`}>
          {formatCurrency(amount)}
        </div>
        {badges.isUnusual && badges.threshold !== null && <AnomalyNote threshold={badges.threshold} />}
        <QuietChips badges={badges} />
      </td>
      <td className="px-3 py-2.5">
        <select
          value={transaction.Category}
          onChange={(e) => onCategoryChange(index, e.target.value)}
          className="w-full bg-surface border border-line rounded-md px-2 py-1.5 text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {categoryOptions.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </td>
    </tr>
  );
}

// MOBILE CARD
export function MobileTransactionCard({
  transaction,
  index,
  categoryOptions,
  onCategoryChange,
  badges,
}: MobileCardProps) {
  const amount = parseFloat(transaction.Amount);

  return (
    <div
      className={`bg-surface border border-line rounded-md p-3 ${
        badges.isUnusual ? 'border-l-2 border-l-negative' : ''
      }`}
    >
      <div className="flex justify-between items-start mb-1.5">
        <span className={`text-xs text-ink-muted ${AMOUNT_CLASS}`}>{transaction.Date}</span>
        <div className="text-right">
          <div className={`${AMOUNT_CLASS} text-base font-semibold ${amount < 0 ? 'text-ink' : 'text-positive'}`}>
            {formatCurrency(amount)}
          </div>
          {badges.isUnusual && badges.threshold !== null && <AnomalyNote threshold={badges.threshold} />}
        </div>
      </div>
      <div className="flex items-center gap-2 mb-2">
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: categoryColor(transaction.Category) }}
          aria-hidden
        />
        <span className="text-sm font-medium text-ink">{transaction.Description}</span>
      </div>
      <select
        value={transaction.Category}
        onChange={(e) => onCategoryChange(index, e.target.value)}
        className="w-full bg-paper border border-line rounded-md px-3 py-2 text-sm text-ink mb-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {categoryOptions.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      <QuietChips badges={badges} />
    </div>
  );
}
