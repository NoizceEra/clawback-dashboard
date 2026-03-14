import { NextResponse } from "next/server";
import type { AgentPoolSummary } from "../../../../types/agent";
import { computeDistributionSummary } from "../../../../lib/distribution";

export async function GET(): Promise<NextResponse> {
  try {
    const distribution = await computeDistributionSummary();
    const activeAgents = distribution.agents.filter((agent) => agent.metrics.active);

    const summary: AgentPoolSummary = {
      epochId: distribution.epochId,
      totalPoolSol: distribution.pools.totalPoolSol,
      holderTraderAllocationSol:
        distribution.pools.effective.holders + distribution.pools.effective.traders,
      agentAllocationSol: distribution.pools.effective.agents,
      activeAgents: activeAgents.length,
      totalSignalsThisEpoch: distribution.agents.reduce(
        (sum, agent) => sum + agent.metrics.signalsThisWindow,
        0
      ),
      topAgents: distribution.agents.slice(0, 5).map((agent) => ({
        agentId: agent.agentId,
        displayName: agent.displayName,
        totalSignals: agent.totalSignals,
        verifiedSignals: Math.round(agent.totalSignals * agent.metrics.avgAccuracy),
        avgAccuracy: agent.metrics.avgAccuracy,
        reputationScore: agent.metrics.reputationScore,
        tier: agent.tier,
        poolSharePct:
          distribution.pools.effective.agents > 0
            ? Number(((agent.allocationSol / distribution.pools.effective.agents) * 100).toFixed(2))
            : 0,
        totalEarnedSol: agent.totalEarnedSol,
        lastActiveEpoch: distribution.signalEpochUsed ?? distribution.epochId,
      })),
    };

    return NextResponse.json(summary);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to load agent pool data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
