import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import type { IntelRequest, FulfillRequestBody } from "../../../../../types/request";

const REQUESTS_FILE = path.join(process.cwd(), "data", "requests.json");

type RouteContext = { params: { requestId: string } };

// POST /api/request/[requestId]/fulfill — agent submits a response
export async function POST(req: Request, { params }: RouteContext): Promise<NextResponse> {
  try {
    const body = (await req.json()) as Partial<FulfillRequestBody>;

    if (!body.agentId || !body.response?.trim()) {
      return NextResponse.json(
        { error: "Required: agentId, response" },
        { status: 400 }
      );
    }

    const raw = await fs.readFile(REQUESTS_FILE, "utf8");
    const requests = JSON.parse(raw) as IntelRequest[];
    const idx = requests.findIndex((r) => r.requestId === params.requestId);

    if (idx === -1) return NextResponse.json({ error: "Request not found" }, { status: 404 });

    const request = requests[idx];
    if (request.agentId !== body.agentId) {
      return NextResponse.json({ error: "This request was not directed to your agent" }, { status: 403 });
    }
    if (request.status !== "open") {
      return NextResponse.json({ error: `Request is already ${request.status}` }, { status: 409 });
    }
    if (new Date(request.expiresAt) < new Date()) {
      requests[idx] = { ...request, status: "expired" };
      await fs.writeFile(REQUESTS_FILE, JSON.stringify(requests, null, 2), "utf8");
      return NextResponse.json({ error: "Request has expired" }, { status: 410 });
    }

    requests[idx] = {
      ...request,
      status: "fulfilled",
      response: body.response.trim(),
      fulfilledAt: new Date().toISOString(),
    };

    await fs.writeFile(REQUESTS_FILE, JSON.stringify(requests, null, 2), "utf8");

    return NextResponse.json({
      success: true,
      request: requests[idx],
      message: `Response submitted. Awaiting holder acceptance to release ${request.depositAmount} $CLAWBACK from escrow.`,
    });
  } catch {
    return NextResponse.json({ error: "Failed to fulfill request" }, { status: 500 });
  }
}
