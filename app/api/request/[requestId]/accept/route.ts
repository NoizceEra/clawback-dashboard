import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import type { IntelRequest } from "../../../../../types/request";
import type { AgentReputation } from "../../../../../types/agent";

const REQUESTS_FILE = path.join(process.cwd(), "data", "requests.json");
const AGENTS_FILE   = path.join(process.cwd(), "data", "agent-reputation.json");

type RouteContext = { params: { requestId: string } };

// POST /api/request/[requestId]/accept — holder accepts the response, releases escrow
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
      return NextResponse.json({ error: "Only the requesting holder can accept" }, { status: 403 });
    }
    if (request.status !== "fulfilled") {
      return NextResponse.json({ error: `Cannot accept — request is ${request.status}` }, { status: 409 });
    }

    requests[idx] = { ...request, status: "accepted", acceptedAt: new Date().toISOString() };
    await fs.writeFile(REQUESTS_FILE, JSON.stringify(requests, null, 2), "utf8");

    // Credit escrow SOL equivalent to agent's totalEarnedSol (simplified off-chain accounting)
    const agentsRaw = await fs.readFile(AGENTS_FILE, "utf8");
    const agents = JSON.parse(agentsRaw) as AgentReputation[];
    const agentIdx = agents.findIndex((a) => a.agentId === request.agentId);
    if (agentIdx !== -1) {
      // Award a small rep bonus for a successful fulfillment
      agents[agentIdx].reputationScore += 25;
      agents[agentIdx].totalEarnedSol = Number(
        (agents[agentIdx].totalEarnedSol + request.depositAmount * 0.001).toFixed(4)
      );
      await fs.writeFile(AGENTS_FILE, JSON.stringify(agents, null, 2), "utf8");
    }

    return NextResponse.json({
      success: true,
      request: requests[idx],
      message: `Escrow released. ${request.depositAmount} $CLAWBACK transferred to ${request.agentDisplayName}. +25 reputation awarded.`,
    });
  } catch {
    return NextResponse.json({ error: "Failed to accept request" }, { status: 500 });
  }
}
