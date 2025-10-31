import { NextResponse } from "next/server";

// Keyword-based mapping logic
const categoryKeywords: Record<string, string> = {
  starbucks: "Food & Drink",
  walmart: "Shopping",
  uber: "Transport",
  netflix: "Entertainment",
  apple: "Shopping",
  salary: "Income",
  domino: "Food & Drink",
  amazon: "Shopping",
  shell: "Transport",
  spotify: "Entertainment",
  target: "Groceries",
  electric: "Utilities",
  rent: "Rent",
  freelance: "Income",
  kfc: "Food & Drink",
  mcdonald: "Food & Drink",
  costco: "Groceries",
  airbnb: "Travel",
  youtube: "Entertainment",
  stripe: "Income",
  water: "Utilities",
  bus: "Transport",
  insurance: "Bills",
  lyft: "Transport",
  google: "Services",
  cloud: "Services",
};

function categorize(description: string): string {
  const lowerDesc = description.toLowerCase();
  for (const keyword in categoryKeywords) {
    if (lowerDesc.includes(keyword)) {
      return categoryKeywords[keyword];
    }
  }
  return "Other";
}

export async function POST(request: Request) {
  try {
    const { transactions } = await request.json();

    const categorizedTransactions = transactions.map((transaction: any) => ({
      ...transaction,
      Category: categorize(transaction.Description || ""),
    }));

    return NextResponse.json({ data: categorizedTransactions });
  } catch (error) {
    console.error("Error categorizing transactions:", error);
    return NextResponse.json({ error: "Failed to categorize transactions" }, { status: 500 });
  }
}
