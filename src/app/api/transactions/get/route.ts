import { NextResponse } from "next/server";
import { Transaction } from "@/models/Transaction";
import { dbConnect } from "@/lib/dbConnect";
import { getUserIdFromRequest } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    await dbConnect();

    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get ONLY this user's transactions
    const transactions = await Transaction.find({ userId }).sort({ date: -1 });

    // Convert to frontend format
    const formatted = transactions.map((t) => ({
      Date: t.date,
      Description: t.description,
      Amount: t.amount,
      Category: t.category,
    }));

    return NextResponse.json({ 
      transactions: formatted,
      count: formatted.length 
    });

  } catch (error) {
    console.error("Get transactions error:", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}