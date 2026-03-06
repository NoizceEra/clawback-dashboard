import { NextResponse } from "next/server";
import { readLatestEpochSummary } from "../../../../lib/epoch";

export async function GET(): Promise<NextResponse> {
  try {
    const summary = await readLatestEpochSummary();
    return NextResponse.json(summary, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to read epoch summary.",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
