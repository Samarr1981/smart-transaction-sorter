import { NextResponse } from "next/server";
import { Transaction } from "@/models/Transaction";
import { dbConnect } from "@/lib/dbConnect";
import { getUserIdFromRequest } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    await dbConnect();

    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { transactions } = await request.json();

    if (!Array.isArray(transactions)) {
      return NextResponse.json(
        { error: "Invalid data format" },
        { status: 400 }
      );
    }

    // Delete existing transactions for this user
    await Transaction.deleteMany({ userId });

    // Save new transactions
    const transactionsWithUser = transactions.map((t: any) => ({
      userId,
      date: t.Date,
      description: t.Description,
      amount: t.Amount,
      category: t.Category,
    }));

    await Transaction.insertMany(transactionsWithUser);

    return NextResponse.json({ 
      success: true,
      count: transactionsWithUser.length 
    });

  } catch (error) {
    console.error("Save transactions error:", error);
    return NextResponse.json(
      { error: "Failed to save transactions" },
      { status: 500 }
    );
  }
}