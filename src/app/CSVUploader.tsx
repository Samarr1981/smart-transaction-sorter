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
    if (isCreditCard) {
      const numAmount = parseFloat(amount);
      if (!isNaN(numAmount)) amount = String(-numAmount);
    }
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
const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff7f50", "#a4de6c", "#d0ed57", "#8dd1e1", "#83a6ed", "#d88484", "#a78bfa"];

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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">AI is analyzing your transactions</h3>
          <p className="text-gray-600">This usually takes 10-15 seconds...</p>
        </div>
      </div>
    );
  }

  if (filteredTransactions.length === 0) {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-50 to-purple-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Ready to analyze your spending?</h3>
            <p className="text-gray-600 mb-8">Upload your bank statement and get instant AI-powered insights.</p>
            <button
              onClick={() => setShowModal(true)}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-4 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all"
            >
              Upload Your First Statement
            </button>
          </div>
        </div>

        {/* MODAL */}
        {showModal && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4"
            style={{ zIndex: 9999, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
          >
            <div 
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">Select Statement Type</h3>
              <p className="text-sm text-gray-600 mb-6">What type of statement are you uploading?</p>
              
              <div className="space-y-3 mb-6">
                {[
                  { value: 'bank', icon: '🏦', title: 'Bank Account', subtitle: 'Chequing or Savings' },
                  { value: 'credit', icon: '💳', title: 'Credit Card', subtitle: 'Amex, Visa, Mastercard' }
                ].map(({ value, icon, title, subtitle }) => (
                  <label
                    key={value}
                    className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer hover:bg-gray-50 transition ${
                      accountType === value ? 'border-blue-600 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name="accountType"
                      value={value}
                      checked={accountType === value}
                      onChange={(e) => setAccountType(e.target.value as 'bank' | 'credit')}
                      className="w-5 h-5"
                    />
                    <div className="flex-1">
                      <span className="text-lg font-semibold text-gray-900">{icon} {title}</span>
                      <p className="text-sm text-gray-500">{subtitle}</p>
                    </div>
                  </label>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50"
                >
                  Cancel
                </button>
                <label className="flex-1">
                  <div className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg transition text-center cursor-pointer">
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-1">Dashboard</h1>
            <p className="text-gray-600 text-sm sm:text-base">Manage and analyze your transactions</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setShowModal(true)}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Upload
            </button>
            <button
              onClick={handleExportCSV}
              className="bg-white border-2 border-gray-300 text-gray-700 font-semibold py-3 px-6 rounded-xl hover:border-gray-400 transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export
            </button>
            <DeleteAllTransactionsButton onDeleteComplete={handleDeleteComplete} />
          </div>
        </div>

        {/* DASHBOARD CARDS */}
        <div className="mb-6 sm:mb-8">
          <DashboardCards transactions={filteredTransactions} />
        </div>

        {/* 2-COLUMN LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          
          {/* TRANSACTIONS */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* FILTER */}
            <div className="bg-white rounded-2xl shadow-md p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <label className="text-sm font-semibold text-gray-700">Filter by Category:</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="border border-gray-300 rounded-lg px-4 py-2 text-sm w-full sm:w-auto"
                >
                  <option value="All">All Categories</option>
                  {CATEGORY_OPTIONS.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
            </div>

            {/* TABLE */}
            <div className="bg-white rounded-2xl shadow-md overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-gray-200">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Recent Transactions</h2>
                <p className="text-gray-600 text-sm mt-1">
                  Showing {Math.min(visibleCount, filteredTransactions.length)} of {filteredTransactions.length}
                </p>
              </div>
              
             {/* DESKTOP TABLE */}
<div className="hidden md:block overflow-x-auto">
  <table className="w-full">
    <thead>
      <tr className="border-b-2 border-gray-200">
        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase w-[110px]">Date</th>
        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Description</th>
        <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase w-[100px]">Amount</th>
        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase w-[140px]">Category</th>
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
            isDuplicate: isDuplicate(row.Description, row.Amount, row.Date, transactions, idx),
            frequencyWarning: getSubscriptionFrequency(row.Description, row.Amount, row.Date, transactions),
          }}
        />
      ))}
    </tbody>
  </table>
</div>

{/* MOBILE CARDS */}
<div className="md:hidden p-4 space-y-4">
  {filteredTransactions.slice(0, visibleCount).map((row, idx) => (
    <MobileTransactionCard
      key={idx}
      transaction={row}
      index={idx}
      categoryOptions={CATEGORY_OPTIONS}
      onCategoryChange={updateCategory}
      badges={{
        isUnusual: isUnusual(row.Amount, row.Category, row.Description, expenseThreshold),
        isDuplicate: isDuplicate(row.Description, row.Amount, row.Date, transactions, idx),
        frequencyWarning: getSubscriptionFrequency(row.Description, row.Amount, row.Date, transactions),
      }}
    />
  ))}
</div>

              {/* SHOW MORE */}
              {transactions.length > 15 && (
                <div className="p-4 sm:p-6 border-t border-gray-200 flex justify-center gap-4">
                  {visibleCount < filteredTransactions.length && (
                    <button onClick={() => setVisibleCount(prev => prev + 15)} className="bg-blue-600 text-white font-semibold px-6 py-2.5 rounded-lg">
                      Show More
                    </button>
                  )}
                  {visibleCount > 15 && (
                    <button onClick={() => setVisibleCount(15)} className="bg-gray-200 text-gray-800 font-semibold px-6 py-2.5 rounded-lg">
                      Show Less
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* CHARTS & INSIGHTS */}
          <div className="space-y-6">
            
            {/* PIE CHART */}
            <div className="bg-white rounded-2xl shadow-md p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Spending by Category</h3>
              <div className="h-[280px] sm:h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={false}>
                      {categoryData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
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
        <div className="mt-6 lg:mt-8 bg-white rounded-2xl shadow-md p-4 sm:p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Daily Income & Expenses</h3>
          <div className="h-[250px] sm:h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData} margin={{ top: 20, right: 10, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="ShortDate" angle={-25} textAnchor="end" interval={0} tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="Income" fill="#4ade80" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="Expense" fill="#f97316" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="mt-6 lg:mt-8">
          <InsightsAssistant transactions={transactions} />
        </div>
      </div>

      {/* MODAL */}
      {showModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4"
          style={{ zIndex: 9999, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">Select Statement Type</h3>
            <p className="text-sm text-gray-600 mb-6">What type of statement are you uploading?</p>
            
            <div className="space-y-3 mb-6">
              {[
                { value: 'bank', icon: '🏦', title: 'Bank Account', subtitle: 'Chequing or Savings' },
                { value: 'credit', icon: '💳', title: 'Credit Card', subtitle: 'Amex, Visa, Mastercard' }
              ].map(({ value, icon, title, subtitle }) => (
                <label
                  key={value}
                  className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer hover:bg-gray-50 transition ${
                    accountType === value ? 'border-blue-600 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="accountType"
                    value={value}
                    checked={accountType === value}
                    onChange={(e) => setAccountType(e.target.value as 'bank' | 'credit')}
                    className="w-5 h-5"
                  />
                  <div className="flex-1">
                    <span className="text-lg font-semibold text-gray-900">{icon} {title}</span>
                    <p className="text-sm text-gray-500">{subtitle}</p>
                  </div>
                </label>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50"
              >
                Cancel
              </button>
              <label className="flex-1">
                <div className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg transition text-center cursor-pointer">
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