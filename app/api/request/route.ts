import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import type { IntelRequest, SubmitRequestBody } from "../../../types/request";
import type { AgentReputation } from "../../../types/agent";
import { TIER_MIN_DEPOSIT } from "../../../types/request";

const REQUESTS_FILE = path.join(process.cwd(), "data", "requests.json");
const AGENTS_FILE   = path.join(process.cwd(), "data", "agent-reputation.json");

// GET /api/request — list all requests, optionally filtered by agentId or holderId
export async function GET(req: Request): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const agentId  = searchParams.get("agentId");
    const holderId = searchParams.get("holderId");
    const status   = searchParams.get("status");

    const raw = await fs.readFile(REQUESTS_FILE, "utf8");
    let requests = JSON.parse(raw) as IntelRequest[];

    if (agentId)  requests = requests.filter((r) => r.agentId === agentId);
    if (holderId) requests = requests.filter((r) => r.holderId === holderId);
    if (status)   requests = requests.filter((r) => r.status === status);

    // Auto-expire overdue open requests
    const now = new Date();
    let dirty = false;
    requests = requests.map((r) => {
      if (r.status === "open" && new Date(r.expiresAt) < now) {
        dirty = true;
        return { ...r, status: "expired" as const };
      }
      return r;
    });
    if (dirty) await fs.writeFile(REQUESTS_FILE, JSON.stringify(requests, null, 2), "utf8");

    return NextResponse.json({ requests, count: requests.length });
  } catch {
    return NextResponse.json({ error: "Failed to load requests" }, { status: 500 });
  }
}

// POST /api/request — holder submits a new intel request
export async function POST(req: Request): Promise<NextResponse> {
  try {
    const body = (await req.json()) as Partial<SubmitRequestBody>;

    if (!body.holderId || !body.agentId || !body.question?.trim() || !body.depositAmount) {
      return NextResponse.json(
        { error: "Required: holderId, agentId, question, depositAmount" },
        { status: 400 }
      );
    }

    // Validate agent exists and check min deposit for their tier
    const agentsRaw = await fs.readFile(AGENTS_FILE, "utf8");
    const agents = JSON.parse(agentsRaw) as AgentReputation[];
    const agent = agents.find((a) => a.agentId === body.agentId);
    if (!agent) {
      return NextResponse.json({ error: `Agent ${body.agentId} not found` }, { status: 404 });
    }

    const minDeposit = TIER_MIN_DEPOSIT[agent.tier] ?? 50;
    if (body.depositAmount < minDeposit) {
      return NextResponse.json(
        { error: `Minimum deposit for ${agent.tier} tier is ${minDeposit} $CLAWBACK` },
        { status: 400 }
      );
    }

    const raw = await fs.readFile(REQUESTS_FILE, "utf8");
    const requests = JSON.parse(raw) as IntelRequest[];

    const now = new Date();
    const newRequest: IntelRequest = {
      requestId: `req_${Date.now()}`,
      holderId: body.holderId,
      agentId: body.agentId,
      agentDisplayName: agent.displayName,
      question: body.question.trim(),
      depositAmount: body.depositAmount,
      status: "open",
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 60 * 60 * 1000).toISOString(), // 1 hour
      response: null,
      fulfilledAt: null,
      acceptedAt: null,
    };

    requests.unshift(newRequest);
    await fs.writeFile(REQUESTS_FILE, JSON.stringify(requests, null, 2), "utf8");

    return NextResponse.json(
      { success: true, request: newRequest, message: `Request sent to ${agent.displayName}. ${body.depositAmount} $CLAWBACK held in escrow.` },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "Failed to submit request" }, { status: 500 });
  }
}
