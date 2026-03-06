import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import type { IntelRequest } from "../../../../../types/request";

const REQUESTS_FILE = path.join(process.cwd(), "data", "requests.json");

type RouteContext = { params: { requestId: string } };

// POST /api/request/[requestId]/cancel — holder cancels an open request, refund escrow
export async function POST(req: Request, { params }: RouteContext): Promise<NextResponse> {
  try {
    const body = (await req.json()) as { holderId?: string };
    if (!body.holderId) {
      return NextResponse.json({ error: "Required: holderId" }, { status: 400 });
    }

    const raw = await fs.readFile(REQUESTS_FILE, "utf8");
    const requests = JSON.parse(raw) as IntelRequest[];
    const idx = requests.findIndex((r) => r.requestId === params.requestId);

    if (idx === -1) return NextResponse.json({ error: "Request not found" }, { status: 404 });

    const request = requests[idx];
    if (request.holderId !== body.holderId) {
      return NextResponse.json({ error: "Only the requesting holder can cancel" }, { status: 403 });
    }
    if (!["open", "fulfilled"].includes(request.status)) {
      return NextResponse.json(
        { error: `Cannot cancel — request is already ${request.status}` },
        { status: 409 }
      );
    }

    requests[idx] = { ...request, status: "cancelled" };
    await fs.writeFile(REQUESTS_FILE, JSON.stringify(requests, null, 2), "utf8");

    return NextResponse.json({
      success: true,
      request: requests[idx],
      message: `Request cancelled. ${request.depositAmount} $CLAWBACK returned to escrow queue for refund.`,
    });
  } catch {
    return NextResponse.json({ error: "Failed to cancel request" }, { status: 500 });
  }
}
