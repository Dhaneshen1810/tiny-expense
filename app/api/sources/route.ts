import { parseSources, upsertSources } from "@/lib/data-store";
import { useDatabase } from "@/lib/env";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  if (!useDatabase()) {
    return NextResponse.json(
      { error: "Sources API requires DATA_SOURCE=production" },
      { status: 400 },
    );
  }

  try {
    const body = await request.json();
    const sources = parseSources(body);

    if (!sources) {
      return NextResponse.json(
        { error: "Invalid sources. Expected { sources: [{ id, name, balance }] }" },
        { status: 400 },
      );
    }

    const saved = await upsertSources(sources);
    return NextResponse.json({ sources: saved });
  } catch (error) {
    console.error("Failed to upsert sources:", error);
    return NextResponse.json(
      { error: "Failed to save sources" },
      { status: 500 },
    );
  }
}
