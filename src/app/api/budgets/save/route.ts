import { NextResponse } from "next/server";
import { Budget } from "@/models/Budget";
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

    const { category, amount } = await request.json();

    if (!category || amount === undefined) {
      return NextResponse.json(
        { error: "Category and amount required" },
        { status: 400 }
      );
    }

    // Upsert: update if exists, create if not
    await Budget.findOneAndUpdate(
      { userId, category },
      { userId, category, amount: Number(amount) },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Save budget error:", error);
    return NextResponse.json(
      { error: "Failed to save budget" },
      { status: 500 }
    );
  }
}