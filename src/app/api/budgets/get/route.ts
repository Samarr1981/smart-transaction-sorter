import { NextResponse } from "next/server";
import { Budget } from "@/models/Budget";
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

    // Get all budgets for this user
    const budgets = await Budget.find({ userId });

    // Convert to simple object format
    const budgetMap: Record<string, number> = {};
    budgets.forEach((b) => {
      budgetMap[b.category] = b.amount;
    });

    return NextResponse.json({ budgets: budgetMap });

  } catch (error) {
    console.error("Get budgets error:", error);
    return NextResponse.json(
      { error: "Failed to fetch budgets" },
      { status: 500 }
    );
  }
}