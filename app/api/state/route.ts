import { getState } from "@/lib/data-store";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const state = await getState();
    return NextResponse.json(state);
  } catch (error) {
    console.error("Failed to load state:", error);
    return NextResponse.json(
      { error: "Failed to load state" },
      { status: 500 },
    );
  }
}
