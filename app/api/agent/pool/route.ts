import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import type { EpochSummary } from "../../../../types/epoch";
import type { AgentReputation, AgentPoolSummary } from "../../../../types/agent";

const repoRoot = path.resolve(process.cwd());
const EPOCH_FILE  = path.join(repoRoot, "data", "epoch-latest.json");
const AGENTS_FILE = path.join(repoRoot, "data", "agent-reputation.json");
const SIGNALS_FILE = path.join(repoRoot, "data", "agent-signals.sample.json");

export async function GET(): Promise<NextResponse> {
  try {
    const [epochRaw, agentsRaw, signalsRaw] = await Promise.all([
      fs.readFile(EPOCH_FILE, "utf8"),
      fs.readFile(AGENTS_FILE, "utf8"),
      fs.readFile(SIGNALS_FILE, "utf8"),
    ]);

    const epoch  = JSON.parse(epochRaw)  as EpochSummary;
    const agents = JSON.parse(agentsRaw) as AgentReputation[];
    const signals = JSON.parse(signalsRaw) as { epoch: number }[];

    const thisEpochSignals = signals.filter((s) => s.epoch === epoch.epochId);
    const activeAgents = agents.filter((a) => a.lastActiveEpoch >= epoch.epochId - 1);

    const summary: AgentPoolSummary = {
      epochId: epoch.epochId,
      totalPoolSol: epoch.agentPool.totalPoolSol,
      holderTraderAllocationSol: epoch.agentPool.holderTraderSol,
      agentAllocationSol: epoch.agentPool.agentSol,
      activeAgents: activeAgents.length,
      totalSignalsThisEpoch: thisEpochSignals.length,
      topAgents: agents.sort((a, b) => b.reputationScore - a.reputationScore).slice(0, 5),
    };

    return NextResponse.json(summary);
  } catch {
    return NextResponse.json({ error: "Failed to load agent pool data" }, { status: 500 });
  }
}
