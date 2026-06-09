import { addExpense } from "@/lib/data-store";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const description = String(body.description ?? "").trim();
    const amount = Number(body.amount);
    const sourceId = String(body.sourceId ?? "");

    if (!description || !sourceId || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid expense data" },
        { status: 400 },
      );
    }

    const expense = await addExpense({ description, amount, sourceId });
    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error("Failed to add expense:", error);
    return NextResponse.json(
      { error: "Failed to add expense" },
      { status: 500 },
    );
  }
}
