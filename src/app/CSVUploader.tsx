'use client';

import { useState, useEffect, useMemo } from "react";
import Papa from "papaparse";
import { ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import InsightsAssistant from "@/components/InsightsAssistant";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";

type Transaction = {
  Date: string;
  Description: string;
  Amount: string;
  Category: string;
  [key: string]: string;
};

export default function CSVUploader() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [visibleCount, setVisibleCount] = useState(15);
  const [anomalies, setAnomalies] = useState<Set<number>>(new Set());

  useEffect(() => {
    const stored = localStorage.getItem("transactions");
    if (stored) {
      setTransactions(JSON.parse(stored));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("transactions", JSON.stringify(transactions));
  }, [transactions]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);

    if (file.name.endsWith(".csv")){

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results: Papa.ParseResult<any>) => {
        try {
          const cleaned = results.data
            .filter((t) => t.Date && (t.Description || t["Sub-Description"]) && t.Amount)
            .map((t) => ({
              Date: t.Date.trim(),
              Description: (t.Description || t["Sub-Description"] || "").trim(),
              Amount: t.Amount.replace(/[$,]/g, "").trim(),
              Category: "",
            }));

          const descriptions = cleaned.map((t) => t.Description);

          const response = await fetch("/api/suggest-category", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ descriptions }),
          });

          const { suggestions } = await response.json();

          const enriched = cleaned.map((row, i) => ({
            ...row,
            Category: suggestions[i] || "Other",
          }));

          setTransactions(enriched);
          const anomalyRes = await fetch("/api/anomaly-check", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ transactions: enriched }),
          });
          const { anomalies } = await anomalyRes.json();
          setAnomalies(new Set(anomalies));
          setCategoryFilter("All");
          setVisibleCount(15);
        } catch (error) {
          console.error("Error categorizing:", error);
        } finally {
          setLoading(false);
        }
      },
    })} else if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
      // use SheetJS
    }
  };

  const handleExportCSV = () => {
    if (transactions.length === 0) return;
    const csv = Papa.unparse(transactions);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "categorized_transactions.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const updateCategory = (index: number, newCategory: string) => {
    const updated = [...transactions];
    updated[index].Category = newCategory;
    setTransactions(updated);
  };

  const categoryOptions = [
    "Income", "Food & Drink", "Shopping", "Entertainment", "Transport",
    "Groceries", "Utilities", "Rent", "Travel", "Bills", "Services", "Other",
  ];

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) =>
      categoryFilter === "All" ? true : t.Category === categoryFilter
    );
  }, [transactions, categoryFilter]);

  const totalIncome = filteredTransactions
    .filter((t) => parseFloat(t.Amount) > 0)
    .reduce((sum, t) => sum + parseFloat(t.Amount), 0);

  const totalExpense = filteredTransactions
  .filter((t) => parseFloat(t.Amount) < 0)
  .reduce((sum, t) => sum + parseFloat(t.Amount), 0);

  const getExpenseThreshold = () => {
  const expenses = transactions
    .map((t) => parseFloat(t.Amount.replace(/[^0-9.-]+/g, ""))) // safely parse even "$1,200.00"
    .filter((a) => !isNaN(a) && a < 0)
    .map((a) => Math.abs(a))
    .sort((a, b) => a - b);

  if (expenses.length === 0) return Infinity;

  const mid = Math.floor(expenses.length / 2);
  const median =
    expenses.length % 2 === 0
      ? (expenses[mid - 1] + expenses[mid]) / 2
      : expenses[mid];

  return median *  1.5;
};



const expenseThreshold = getExpenseThreshold();

const isUnusual = (amount: string) => {
  const amt = parseFloat(amount.replace(/[^0-9.-]+/g, ""));
  return amt < 0 && Math.abs(amt) > expenseThreshold;
};



  const isDuplicate = (desc: string, amount: string, index: number) => {
  const targetDate = new Date(transactions[index].Date);

  return transactions.some((t, i) => {
    if (i === index) return false;

    const isSameDesc = t.Description === desc;
    const isSameAmount = t.Amount === amount;

    const currentDate = new Date(t.Date);
    const dayDiff = Math.abs((+targetDate - +currentDate) / (1000 * 60 * 60 * 24));

    return isSameDesc && isSameAmount && dayDiff <= 7;
  });
};


  const COLORS = [
    "#8884d8", "#82ca9d", "#ffc658", "#ff7f50", "#a4de6c",
    "#d0ed57", "#8dd1e1", "#83a6ed", "#d88484", "#a78bfa",
  ];

  const categoryData = Object.entries(
    filteredTransactions.reduce((acc: Record<string, number>, t) => {
      const category = t.Category || "Other";
      const amount = Math.abs(parseFloat(t.Amount));
      if (!acc[category]) acc[category] = 0;
      acc[category] += amount;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  const dailyData = filteredTransactions.map((t) => ({
    Date: t.Date,
    ShortDate: t.Date.slice(5),
    Income: parseFloat(t.Amount) > 0 ? parseFloat(t.Amount) : 0,
    Expense: parseFloat(t.Amount) < 0 ? Math.abs(parseFloat(t.Amount)) : 0,
  }));

  return (
    <div className="bg-white border border-gray-200 text-gray-800 rounded-xl shadow-lg px-8 py-10 space-y-10 transition-colors duration-300">
      {/* Upload + Export + Filter */}
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
        <div className="flex gap-4 flex-wrap">
          <label className="cursor-pointer bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg shadow hover:bg-blue-700 transition duration-150">
            Choose CSV File
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
          {transactions.length > 0 && (
            <button
              onClick={handleExportCSV}
              className="bg-green-600 text-white font-semibold py-2 px-6 rounded-lg shadow hover:bg-green-700 transition duration-150"
            >
              Export CSV
            </button>
          )}
        </div>

        {filteredTransactions.length > 0 && (
          <div className="flex gap-6 text-sm font-semibold">
            <div className="flex items-center gap-1 text-green-500">
              <ArrowUpCircle size={18} /> Income: ${totalIncome.toFixed(2)}
            </div>
            <div className="flex items-center gap-1 text-red-400">
              <ArrowDownCircle size={18} /> Expense: ${Math.abs(totalExpense).toFixed(2)}
            </div>
          </div>
        )}
      </div>

      {/* Category Filter */}
      {transactions.length > 0 && (
        <div className="flex flex-wrap items-center gap-4">
          <label className="text-sm font-medium">Filter by Category:</label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="border rounded px-3 py-2 text-sm"
          >
            <option value="All">All</option>
            {categoryOptions.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="text-center py-16 text-blue-500 animate-pulse">
          <p className="text-xl font-semibold mb-2">Categorizing with AI...</p>
          <p className="text-sm text-gray-500">Please wait while we analyze your transactions</p>
        </div>
      ) : filteredTransactions.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">No matching transactions.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="min-w-full text-sm text-left border-collapse">
              <thead className="bg-gray-100 text-gray-700 font-medium">
                <tr>
                  {Object.keys(filteredTransactions[0]).map((key) => (
                    <th key={key} className="px-5 py-3 border-b border-r last:border-r-0">
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.slice(0, visibleCount).map((row, idx) => (
                  <tr
                    key={idx}
                    className="odd:bg-white even:bg-gray-50 hover:bg-blue-50 transition"
                  >
                    {Object.entries(row).map(([key, val], i) => (
                      <td key={i} className="px-5 py-3 border-b border-r last:border-r-0">
                        {key === "Category" ? (
                          <select
                            value={val}
                            onChange={(e) => updateCategory(idx, e.target.value)}
                            className="bg-white border border-gray-300 rounded px-2 py-1 text-sm"
                          >
                            {categoryOptions.map((option) => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        ) : key === "Amount" ? (
                          <span className="flex flex-col gap-1">
                          <span>{val}</span>
                          <div className="flex gap-2 flex-wrap">
                            {isUnusual(row.Amount) && (
                            <span className="text-red-600 text-xs font-semibold bg-red-100 px-2 py-1 rounded">
                              ⚠️ Unusually High
                            </span>
                          )}


                            {isDuplicate(row.Description, row.Amount, idx) && (
                              <span className="text-yellow-600 text-xs font-semibold bg-yellow-100 px-2 py-1 rounded">
                                🔁 Repeated
                              </span>
                            )}
                          </div>
                        </span>
                        ) : (
                          val
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Show More */}
          {transactions.length > 15 && (
  <div className="mt-6 flex justify-center gap-4">
    {visibleCount < filteredTransactions.length && (
      <button
        onClick={() => setVisibleCount((prev) => prev + 15)}
        className="bg-blue-600 text-white px-6 py-2 rounded-md shadow hover:bg-blue-700 transition"
      >
        Show More
      </button>
    )}
    {visibleCount > 15 && (
      <button
        onClick={() => setVisibleCount(15)}
        className="bg-gray-300 text-gray-800 px-6 py-2 rounded-md hover:bg-gray-400 transition"
      >
        Show Less
      </button>
    )}
  </div>
)}

          {/* Charts */}
          <div className="pt-8">
            <h3 className="text-xl font-bold mb-4 text-center">Spending Breakdown by Category</h3>
            <div className="w-full h-[300px]">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" outerRadius={100} fill="#8884d8" dataKey="value" label>
                    {categoryData.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-12">
            <h3 className="text-xl font-bold mb-4 text-center">Daily Income & Expenses</h3>
            <div className="w-full h-[350px] bg-gray-50 border border-gray-200 rounded-xl p-4 shadow-sm">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData} margin={{ top: 20, right: 20, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="ShortDate" angle={-25} textAnchor="end" interval={0} tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend verticalAlign="top" height={36} />
                  <Bar dataKey="Income" stackId="a" fill="#4ade80" radius={[4, 4, 0, 0]} barSize={20} />
                  <Bar dataKey="Expense" stackId="a" fill="#f97316" radius={[4, 4, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <InsightsAssistant transactions={transactions} />
        </>
      )}
    </div>
  );
}
