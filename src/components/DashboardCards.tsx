'use client';

import { useMemo } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Receipt } from 'lucide-react';

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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* Income Card */}
<div className="relative overflow-hidden rounded-2xl shadow-xl hover:shadow-2xl transition-all">
  <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-green-600 opacity-90"></div>
  <div className="relative p-6 text-white">
    <div className="flex items-center justify-between mb-4">
      <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
        <TrendingUp size={24} />
      </div>
      <div className="text-xs font-semibold bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
        Income
      </div>
    </div>
    <div className="space-y-1">
      <h3 className="text-4xl font-bold">
        ${stats.income.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </h3>
      <p className="text-green-100">Total earnings</p>
    </div>
  </div>
</div>


<div className="relative overflow-hidden rounded-2xl shadow-xl hover:shadow-2xl transition-all">
  <div className="absolute inset-0 bg-gradient-to-br from-red-400 to-red-600 opacity-90"></div>
  <div className="relative p-6 text-white">
    <div className="flex items-center justify-between mb-4">
      <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
        <TrendingDown size={24} />
      </div>
      <div className="text-xs font-semibold bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
        Expenses
      </div>
    </div>
    <div className="space-y-1">
      <h3 className="text-4xl font-bold">
        ${stats.expenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </h3>
      <p className="text-red-100">Total spending</p>
    </div>
  </div>
</div>


<div className={`relative overflow-hidden rounded-2xl shadow-xl hover:shadow-2xl transition-all`}>
  <div className={`absolute inset-0 bg-gradient-to-br ${
    stats.savings >= 0 
      ? 'from-blue-400 to-blue-600' 
      : 'from-orange-400 to-orange-600'
  } opacity-90`}></div>
  <div className="relative p-6 text-white">
    <div className="flex items-center justify-between mb-4">
      <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
        <DollarSign size={24} />
      </div>
      <div className="text-xs font-semibold bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
        {stats.savings >= 0 ? 'Savings' : 'Deficit'}
      </div>
    </div>
    <div className="space-y-1">
      <h3 className="text-4xl font-bold">
        {stats.savings >= 0 ? '+' : '-'}${Math.abs(stats.savings).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </h3>
      <p className="text-blue-100">
        {stats.savings >= 0 ? 'Net savings' : 'Net deficit'}
      </p>
    </div>
  </div>
</div>


<div className="relative overflow-hidden rounded-2xl shadow-xl hover:shadow-2xl transition-all">
  <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-purple-600 opacity-90"></div>
  <div className="relative p-6 text-white">
    <div className="flex items-center justify-between mb-4">
      <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
        <Receipt size={24} />
      </div>
      <div className="text-xs font-semibold bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
        Count
      </div>
    </div>
    <div className="space-y-1">
      <h3 className="text-4xl font-bold">
        {stats.count}
      </h3>
      <p className="text-purple-100">Total transactions</p>
    </div>
  </div>
</div></div>
  )}