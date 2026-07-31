'use client';

import { useState, useEffect, useMemo } from "react";
import Papa from "papaparse";
import * as XLSX from 'xlsx';
import InsightsAssistant from "@/components/InsightsAssistant";
import RecurringSummary from "@/components/RecurringSummary";
import BudgetTracker from "@/components/BudgetTracker";
import DashboardCards from "@/components/DashboardCards";
import { DesktopTransactionRow, MobileTransactionCard } from "@/components/TransactionRow";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import DeleteAllTransactionsButton from "@/components/DeleteAllTransactionsButton";
import { categoryColor } from "@/lib/categoryColors";
import { formatCurrency, AMOUNT_CLASS } from "@/lib/currency";

// Import utility functions (we'll add these below)
function isCreditCardPayment(description: string): boolean {
  const keywords = ['credit card payment', 'cc payment', 'payment - credit card', 'cc pmt'];
  return keywords.some(kw => description.toLowerCase().includes(kw));
}

function getExpenseThreshold(transactions: any[]): Record<string, number> {
  const categoryExpenses: Record<string, number[]> = {};

  transactions.forEach((t) => {
    const amt = parseFloat(t.Amount);
    if (amt >= 0 || isCreditCardPayment(t.Description)) return;

    const category = t.Category || "Other";
    if (!categoryExpenses[category]) categoryExpenses[category] = [];
    categoryExpenses[category].push(Math.abs(amt));
  });

  const thresholds: Record<string, number> = {};
  Object.keys(categoryExpenses).forEach((cat) => {
    const expenses = categoryExpenses[cat].sort((a, b) => a - b);
    thresholds[cat] = expenses.length > 0 ? expenses[Math.floor(expenses.length * 0.90)] : Infinity;
  });

  return thresholds;
}

function isUnusual(amount: string, category: string, description: string, thresholds: Record<string, number>): boolean {
  const amt = parseFloat(amount);
  if (amt >= 0 || isCreditCardPayment(description)) return false;
  return Math.abs(amt) > (thresholds[category] || Infinity);
}

function isDuplicate(desc: string, amount: string, date: string, transactions: any[], currentIndex: number): boolean {
  const targetDate = new Date(date).toDateString();
  return transactions.some((t, i) =>
    i !== currentIndex &&
    t.Description.toLowerCase() === desc.toLowerCase() &&
    t.Amount === amount &&
    new Date(t.Date).toDateString() === targetDate
  );
}

function getSubscriptionFrequency(desc: string, amount: string, date: string, transactions: any[]): string | null {
  const targetDate = new Date(date);
  const similar = transactions.filter((t) => {
    const isSameDesc = t.Description.toLowerCase() === desc.toLowerCase();
    const amountSimilar = Math.abs(Math.abs(parseFloat(t.Amount)) - Math.abs(parseFloat(amount))) < 1;
    return isSameDesc && amountSimilar;
  });

  if (similar.length < 2) return null;

  const sorted = similar.map(t => new Date(t.Date)).sort((a, b) => a.getTime() - b.getTime());
  const previousDate = sorted.filter(d => d < targetDate).pop();
  if (!previousDate) return null;

  const daysBetween = Math.round((targetDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24));

  if (daysBetween < 14) return `⚠️ ${daysBetween}d`;
  if (daysBetween >= 14 && daysBetween < 30) return `❓ Bi-wk`;
  return null;
}

function processTransactionData(data: any[], isCreditCard: boolean) {
  return data.map((t: any) => {
    let amount = String(t.Amount).replace(/[$,]/g, "").trim();
    // No negation needed — credit card CSV already uses:
    // negative = expense/purchase, positive = payment/refund
    return {
      Date: String(t.Date).trim(),
      Description: String(t.Description).trim(),
      Amount: amount,
      Category: "",
    };
  });
}

type Transaction = {
  Date: string;
  Description: string;
  Amount: string;
  Category: string;
};

const CATEGORY_OPTIONS = ["Income", "Food & Drink", "Shopping", "Entertainment", "Transport", "Groceries", "Utilities", "Rent", "Travel", "Bills", "Services", "Other"];

export default function CSVUploader() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [visibleCount, setVisibleCount] = useState(15);
  const [accountType, setAccountType] = useState<'bank' | 'credit'>('bank');
  const [showModal, setShowModal] = useState(false); // CHANGED FROM true TO false

  // Load and save transactions
  useEffect(() => {
    fetch("/api/transactions/get")
      .then(res => res.json())
      .then(data => data.transactions?.length > 0 && setTransactions(data.transactions))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (transactions.length === 0) return;
    const timer = setTimeout(() => {
      fetch("/api/transactions/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactions }),
      }).catch(console.error);
    }, 1000);
    return () => clearTimeout(timer);
  }, [transactions]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);

    try {
      let cleaned: any[] = [];

      if (file.name.endsWith(".csv")) {
        const result: any = await new Promise((resolve) => {
          Papa.parse(file, { header: true, skipEmptyLines: true, complete: resolve });
        });

        cleaned = result.data
          .filter((t: any) => (t.Date || t["Transaction Date"]) && (t.Description || t["Description 1"]) && (t.Amount || t["CAD$"]))
          .map((t: any) => ({
            Date: t.Date || t["Transaction Date"] || "",
            Description: [t.Description || t["Description 1"], t["Description 2"]].filter(Boolean).join(" ").trim(),
            Amount: (t.Amount || t["CAD$"] || t["USD$"] || "").replace(/[$,]/g, ""),
          }));
      } else if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const allRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });

        let headerIdx = allRows.findIndex(row =>
          row.some((cell: any) => String(cell).toLowerCase().includes('date')) &&
          row.some((cell: any) => String(cell).toLowerCase().includes('description')) &&
          row.some((cell: any) => String(cell).toLowerCase().includes('amount'))
        );

        if (headerIdx === -1) throw new Error("Invalid file format");

        const jsonData = XLSX.utils.sheet_to_json(sheet, { range: headerIdx, raw: false });
        const headers = allRows[headerIdx];
        const dateCol = headers.find((h: any) => String(h).toLowerCase().includes('date'));
        const descCol = headers.find((h: any) => String(h).toLowerCase().includes('description'));
        const amtCol = headers.find((h: any) => String(h).toLowerCase().includes('amount'));

        cleaned = jsonData
          .filter((row: any) => row[dateCol] && row[descCol] && row[amtCol])
          .map((row: any) => ({
            Date: row[dateCol],
            Description: row[descCol],
            Amount: String(row[amtCol]).replace(/[$,]/g, ""),
          }));
      }

      const processed = processTransactionData(cleaned, accountType === 'credit');
      const descriptions = processed.map(t => t.Description);

      const response = await fetch("/api/suggest-category", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descriptions }),
      });

      const { suggestions } = await response.json();
      const enriched = processed.map((row, i) => ({ ...row, Category: suggestions[i] || "Other" }));

      setTransactions(enriched);
      setCategoryFilter("All");
      setVisibleCount(15);
    } catch (error) {
      alert("Error processing file: " + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    const csv = Papa.unparse(transactions);
    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "finflow_transactions.csv";
    link.click();
  };

  const handleDeleteComplete = () => {
     setTransactions([]);
     setCategoryFilter("All");
     setVisibleCount(15);
   };

  const updateCategory = (index: number, category: string) => {
    const updated = [...transactions];
    updated[index].Category = category;
    setTransactions(updated);
  };

  const filteredTransactions = useMemo(() =>
    transactions.filter(t => categoryFilter === "All" || t.Category === categoryFilter),
    [transactions, categoryFilter]
  );

  const expenseThreshold = useMemo(() => getExpenseThreshold(transactions), [transactions]);

  const categoryData = useMemo(() =>
    Object.entries(
      filteredTransactions.reduce((acc: Record<string, number>, t) => {
        const cat = t.Category || "Other";
        acc[cat] = (acc[cat] || 0) + Math.abs(parseFloat(t.Amount));
        return acc;
      }, {})
    ).map(([name, value]) => ({ name, value })),
    [filteredTransactions]
  );

  const dailyData = useMemo(() =>
    filteredTransactions.map(t => ({
      ShortDate: t.Date.slice(5),
      Income: parseFloat(t.Amount) > 0 ? parseFloat(t.Amount) : 0,
      Expense: parseFloat(t.Amount) < 0 ? Math.abs(parseFloat(t.Amount)) : 0,
    })),
    [filteredTransactions]
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-line border-t-accent rounded-full animate-spin mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold text-ink mb-1">Categorizing your transactions</h3>
          <p className="text-sm text-ink-muted">This usually takes 10-15 seconds…</p>
        </div>
      </div>
    );
  }

  if (filteredTransactions.length === 0) {
    return (
      <>
        <div className="min-h-[70vh] flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <div className="w-14 h-14 bg-surface border border-line rounded-md flex items-center justify-center mx-auto mb-5">
              <svg className="w-6 h-6 text-ink-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-ink mb-2">Ready to analyze your spending?</h3>
            <p className="text-sm text-ink-muted mb-6">Upload a bank statement to get categorized transactions and spending insights.</p>
            <button
              onClick={() => setShowModal(true)}
              className="bg-accent text-surface font-semibold text-sm py-2.5 px-5 rounded-md hover:opacity-90 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              Upload your first statement
            </button>
          </div>
        </div>

        {/* MODAL */}
        {showModal && (
          <div
            className="fixed inset-0 bg-ink/50 flex items-center justify-center p-4"
            style={{ zIndex: 9999, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
          >
            <div
              className="bg-surface rounded-md w-full max-w-md p-5"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-ink mb-1">Select statement type</h3>
              <p className="text-sm text-ink-muted mb-4">What type of statement are you uploading?</p>

              <div className="space-y-2 mb-5">
                {[
                  { value: 'bank', title: 'Bank account', subtitle: 'Chequing or savings' },
                  { value: 'credit', title: 'Credit card', subtitle: 'Amex, Visa, Mastercard' }
                ].map(({ value, title, subtitle }) => (
                  <label
                    key={value}
                    className={`flex items-center gap-3 p-3 border rounded-md cursor-pointer transition ${
                      accountType === value ? 'border-accent bg-paper' : 'border-line hover:bg-paper'
                    }`}
                  >
                    <input
                      type="radio"
                      name="accountType"
                      value={value}
                      checked={accountType === value}
                      onChange={(e) => setAccountType(e.target.value as 'bank' | 'credit')}
                      className="w-4 h-4 accent-accent"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-semibold text-ink">{title}</span>
                      <p className="text-xs text-ink-muted">{subtitle}</p>
                    </div>
                  </label>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-line text-ink-muted font-medium text-sm rounded-md hover:bg-paper focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  Cancel
                </button>
                <label className="flex-1">
                  <div className="px-4 py-2 bg-accent text-surface font-medium text-sm rounded-md hover:opacity-90 transition text-center cursor-pointer">
                    Continue
                  </div>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={(e) => {
                      setShowModal(false);
                      handleFileUpload(e);
                    }}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div>
      <div className="max-w-400 mx-auto px-4 sm:px-6 py-5 sm:py-6">

        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-5">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-ink">Dashboard</h1>
            <p className="text-ink-muted text-sm">Manage and analyze your transactions</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => setShowModal(true)}
              className="bg-accent text-surface font-semibold text-sm py-2 px-4 rounded-md hover:opacity-90 transition flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Upload
            </button>
            <button
              onClick={handleExportCSV}
              className="bg-surface border border-line text-ink font-semibold text-sm py-2 px-4 rounded-md hover:bg-paper transition flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export
            </button>
            <DeleteAllTransactionsButton onDeleteComplete={handleDeleteComplete} />
          </div>
        </div>

        {/* DASHBOARD CARDS */}
        <div className="mb-4">
          <DashboardCards transactions={filteredTransactions} />
        </div>

        {/* 2-COLUMN LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* TRANSACTIONS */}
          <div className="lg:col-span-2 space-y-4">

            {/* FILTER */}
            <div className="bg-surface border border-line rounded-md p-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <label className="text-xs font-medium uppercase tracking-wide text-ink-muted">Filter by category</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="border border-line rounded-md px-3 py-1.5 text-sm bg-surface text-ink w-full sm:w-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <option value="All">All categories</option>
                  {CATEGORY_OPTIONS.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
            </div>

            {/* TABLE */}
            <div className="bg-surface border border-line rounded-md overflow-hidden">
              <div className="p-3 sm:p-4 border-b border-line">
                <h2 className="text-base font-semibold text-ink">Recent transactions</h2>
                <p className="text-ink-muted text-xs mt-0.5">
                  Showing {Math.min(visibleCount, filteredTransactions.length)} of {filteredTransactions.length}
                </p>
              </div>

             {/* DESKTOP TABLE */}
<div className="hidden md:block overflow-x-auto">
  <table className="w-full">
    <thead>
      <tr className="border-b border-line">
        <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-ink-muted w-27.5">Date</th>
        <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-ink-muted">Description</th>
        <th className="px-3 py-2 text-right text-[11px] font-medium uppercase tracking-wide text-ink-muted w-32.5">Amount</th>
        <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-ink-muted w-35">Category</th>
      </tr>
    </thead>
    <tbody>
      {filteredTransactions.slice(0, visibleCount).map((row, idx) => (
        <DesktopTransactionRow
          key={idx}
          transaction={row}
          index={idx}
          categoryOptions={CATEGORY_OPTIONS}
          onCategoryChange={updateCategory}
          badges={{
            isUnusual: isUnusual(row.Amount, row.Category, row.Description, expenseThreshold),
            threshold: expenseThreshold[row.Category] ?? null,
            isDuplicate: isDuplicate(row.Description, row.Amount, row.Date, transactions, idx),
            frequencyWarning: getSubscriptionFrequency(row.Description, row.Amount, row.Date, transactions),
          }}
        />
      ))}
    </tbody>
  </table>
</div>

{/* MOBILE CARDS */}
<div className="md:hidden p-3 space-y-2">
  {filteredTransactions.slice(0, visibleCount).map((row, idx) => (
    <MobileTransactionCard
      key={idx}
      transaction={row}
      index={idx}
      categoryOptions={CATEGORY_OPTIONS}
      onCategoryChange={updateCategory}
      badges={{
        isUnusual: isUnusual(row.Amount, row.Category, row.Description, expenseThreshold),
        threshold: expenseThreshold[row.Category] ?? null,
        isDuplicate: isDuplicate(row.Description, row.Amount, row.Date, transactions, idx),
        frequencyWarning: getSubscriptionFrequency(row.Description, row.Amount, row.Date, transactions),
      }}
    />
  ))}
</div>

              {/* SHOW MORE */}
              {transactions.length > 15 && (
                <div className="p-3 border-t border-line flex justify-center gap-3">
                  {visibleCount < filteredTransactions.length && (
                    <button onClick={() => setVisibleCount(prev => prev + 15)} className="bg-accent text-surface font-medium text-sm px-4 py-1.5 rounded-md hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                      Show more
                    </button>
                  )}
                  {visibleCount > 15 && (
                    <button onClick={() => setVisibleCount(15)} className="bg-surface border border-line text-ink-muted font-medium text-sm px-4 py-1.5 rounded-md hover:bg-paper focus:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                      Show less
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* CHARTS & INSIGHTS */}
          <div className="space-y-4">

            {/* PIE CHART */}
            <div className="bg-surface border border-line rounded-md p-4">
              <h3 className="text-base font-semibold text-ink mb-3">Spending by category</h3>
              <div className="h-65 sm:h-75">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryData} cx="50%" cy="50%" outerRadius={78} dataKey="value" label={false}>
                      {categoryData.map((entry, index) => <Cell key={index} fill={categoryColor(entry.name)} stroke="var(--color-surface)" strokeWidth={1} />)}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <RecurringSummary transactions={filteredTransactions} />
            <BudgetTracker transactions={filteredTransactions} />
          </div>
        </div>

        {/* BAR CHART */}
        <div className="mt-4 bg-surface border border-line rounded-md p-4">
          <h3 className="text-base font-semibold text-ink mb-3">Daily income &amp; expenses</h3>
          <div className="h-57.5 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData} margin={{ top: 10, right: 10, left: 0, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" vertical={false} />
                <XAxis dataKey="ShortDate" angle={-25} textAnchor="end" interval={0} tick={{ fontSize: 10, fill: 'var(--color-ink-muted)' }} axisLine={{ stroke: 'var(--color-line)' }} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--color-ink-muted)' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="Income" fill="var(--color-positive)" radius={[2, 2, 0, 0]} barSize={18} />
                <Bar dataKey="Expense" fill="var(--color-negative)" radius={[2, 2, 0, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="mt-4">
          <InsightsAssistant transactions={transactions} />
        </div>
      </div>

      {/* MODAL */}
      {showModal && (
        <div
          className="fixed inset-0 bg-ink/50 flex items-center justify-center p-4"
          style={{ zIndex: 9999, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
        >
          <div
            className="bg-surface rounded-md w-full max-w-md p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-ink mb-1">Select statement type</h3>
            <p className="text-sm text-ink-muted mb-4">What type of statement are you uploading?</p>

            <div className="space-y-2 mb-5">
              {[
                { value: 'bank', title: 'Bank account', subtitle: 'Chequing or savings' },
                { value: 'credit', title: 'Credit card', subtitle: 'Amex, Visa, Mastercard' }
              ].map(({ value, title, subtitle }) => (
                <label
                  key={value}
                  className={`flex items-center gap-3 p-3 border rounded-md cursor-pointer transition ${
                    accountType === value ? 'border-accent bg-paper' : 'border-line hover:bg-paper'
                  }`}
                >
                  <input
                    type="radio"
                    name="accountType"
                    value={value}
                    checked={accountType === value}
                    onChange={(e) => setAccountType(e.target.value as 'bank' | 'credit')}
                    className="w-4 h-4 accent-accent"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-semibold text-ink">{title}</span>
                    <p className="text-xs text-ink-muted">{subtitle}</p>
                  </div>
                </label>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 border border-line text-ink-muted font-medium text-sm rounded-md hover:bg-paper focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                Cancel
              </button>
              <label className="flex-1">
                <div className="px-4 py-2 bg-accent text-surface font-medium text-sm rounded-md hover:opacity-90 transition text-center cursor-pointer">
                  Continue
                </div>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => {
                    setShowModal(false);
                    handleFileUpload(e);
                  }}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
