import { NextResponse } from "next/server";
import { readAddressStats } from "../../../../../lib/epoch";

type RouteContext = {
  params: {
    address: string;
  };
};

export async function GET(_: Request, context: RouteContext): Promise<NextResponse> {
  try {
    const address = context.params.address;
    const stats = await readAddressStats(address);

    if (!stats) {
      return NextResponse.json(
        { error: `Address ${address} not found in latest epoch summary.` },
        { status: 404 }
      );
    }

    return NextResponse.json(stats, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to read address stats.",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
