import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import type { AgentReputation } from "../../../../../types/agent";

const AGENTS_FILE = path.join(process.cwd(), "data", "agent-reputation.json");

type RouteContext = { params: { agentId: string } };

export async function GET(_req: Request, { params }: RouteContext): Promise<NextResponse> {
  try {
    const raw = await fs.readFile(AGENTS_FILE, "utf8");
    const agents = JSON.parse(raw) as AgentReputation[];
    const agent = agents.find((a) => a.agentId === params.agentId);

    if (!agent) {
      return NextResponse.json(
        { error: `Agent ${params.agentId} not found. Submit signals to register.` },
        { status: 404 }
      );
    }

    return NextResponse.json(agent);
  } catch {
    return NextResponse.json({ error: "Failed to load reputation data" }, { status: 500 });
  }
}
