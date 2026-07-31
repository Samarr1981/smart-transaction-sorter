// Single source for money formatting across the dashboard - tiles, table
// rows, budgets, recurring charges. Negatives get an explicit minus sign
// (never color alone); pass forceSign to also show "+" on positives, used
// only where the sign itself is the point (net savings).
export function formatCurrency(value: number, { forceSign = false }: { forceSign?: boolean } = {}): string {
  const abs = Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  if (value < 0) return `−$${abs}`;
  if (forceSign && value > 0) return `+$${abs}`;
  return `$${abs}`;
}

// Apply alongside formatCurrency() wherever a formatted amount is rendered.
export const AMOUNT_CLASS = 'font-mono tabular-nums';
