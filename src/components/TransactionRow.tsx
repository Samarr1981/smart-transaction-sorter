'use client';

type TransactionData = {
  Date: string;
  Description: string;
  Amount: string;
  Category: string;
};

type BadgeData = {
  isUnusual: boolean;
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

type MobileCardProps = {
  transaction: TransactionData;
  index: number;
  categoryOptions: string[];
  onCategoryChange: (index: number, category: string) => void;
  badges: BadgeData;
};

// DESKTOP TABLE ROW
export function DesktopTransactionRow({ 
  transaction, 
  index, 
  categoryOptions, 
  onCategoryChange,
  badges 
}: DesktopRowProps) {
  const amount = parseFloat(transaction.Amount);
  const isPositive = amount >= 0;

  return (
    <tr className="border-b border-gray-100 hover:bg-blue-50 transition-colors">
      <td className="px-3 py-4 text-sm text-gray-600 whitespace-nowrap">{transaction.Date}</td>
      <td className="px-3 py-4 text-sm text-gray-900 font-medium">{transaction.Description}</td>
      <td className="px-3 py-4 text-right whitespace-nowrap">
        <div className={`text-base font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          ${Math.abs(amount).toFixed(2)}
        </div>
        <div className="flex flex-col gap-1 items-end mt-1">
          {badges.isUnusual && (
            <span className="text-[9px] font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">⚠️ High</span>
          )}
          {badges.isDuplicate && (
            <span className="text-[9px] font-semibold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">🔁 Dup</span>
          )}
          {badges.frequencyWarning && (
            <span className="text-[9px] font-semibold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">⏰</span>
          )}
        </div>
      </td>
      <td className="px-3 py-4">
        <select
          value={transaction.Category}
          onChange={(e) => onCategoryChange(index, e.target.value)}
          className="w-full bg-white border border-gray-300 rounded-md px-2 py-1.5 text-sm"
        >
          {categoryOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
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
  badges 
}: MobileCardProps) {
  const amount = parseFloat(transaction.Amount);
  const isPositive = amount >= 0;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex justify-between items-start mb-2">
        <span className="text-xs text-gray-500">{transaction.Date}</span>
        <span className={`text-lg font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          ${Math.abs(amount).toFixed(2)}
        </span>
      </div>
      <div className="text-sm font-medium text-gray-900 mb-3">{transaction.Description}</div>
      <select
        value={transaction.Category}
        onChange={(e) => onCategoryChange(index, e.target.value)}
        className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm mb-2"
      >
        {categoryOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
      </select>
      {(badges.isUnusual || badges.isDuplicate || badges.frequencyWarning) && (
        <div className="flex gap-2 flex-wrap">
          {badges.isUnusual && <span className="text-xs font-semibold text-red-700 bg-red-100 px-2 py-1 rounded-full">⚠️ High</span>}
          {badges.isDuplicate && <span className="text-xs font-semibold text-orange-700 bg-orange-100 px-2 py-1 rounded-full">🔁 Dup</span>}
          {badges.frequencyWarning && <span className="text-xs font-semibold text-purple-700 bg-purple-100 px-2 py-1 rounded-full">⏰</span>}
        </div>
      )}
    </div>
  );
}