import fs from "node:fs/promises";
import path from "node:path";
import type { AgentReputation, AgentSignal } from "../types/agent";
import type { AddressStats, EpochSummary } from "../types/epoch";
import type {
  AddressDistribution,
  AgentDistribution,
  DistributionCategory,
  DistributionConfig,
  DistributionSummary
} from "../types/distribution";
import { readLatestEpochSummary } from "./epoch";

const DISTRIBUTION_CONFIG_FILE = path.join(process.cwd(), "data", "distribution-config.json");
const AGENTS_FILE = path.join(process.cwd(), "data", "agent-reputation.json");
const SIGNALS_FILE = path.join(process.cwd(), "data", "agent-signals.sample.json");

function safeNumber(value: number): number {
  return Number(value.toFixed(6));
}

function ensureFiniteNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || Number.isNaN(value) || !Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number.`);
  }
  return value;
}

function validateWeightGroup(values: Record<string, number>, label: string): void {
  const total = Object.values(values).reduce((sum, value) => sum + value, 0);
  if (total <= 0) {
    throw new Error(`${label} must have a total weight above zero.`);
  }
}

export function validateDistributionConfig(config: DistributionConfig): DistributionConfig {
  const holdersPct = ensureFiniteNumber(config.allocation.holdersPct, "allocation.holdersPct");
  const tradersPct = ensureFiniteNumber(config.allocation.tradersPct, "allocation.tradersPct");
  const agentsPct = ensureFiniteNumber(config.allocation.agentsPct, "allocation.agentsPct");
  const allocationTotal = holdersPct + tradersPct + agentsPct;

  if (safeNumber(allocationTotal) !== 100) {
    throw new Error("Allocation percentages must add up to 100.");
  }

  if (config.eligibility.minActivityCount < 0) {
    throw new Error("eligibility.minActivityCount must be zero or greater.");
  }

  validateWeightGroup(config.holderWeights, "holderWeights");
  validateWeightGroup(config.traderWeights, "traderWeights");
  validateWeightGroup(config.agentWeights, "agentWeights");

  return config;
}

export async function readDistributionConfig(): Promise<DistributionConfig> {
  const raw = await fs.readFile(DISTRIBUTION_CONFIG_FILE, "utf8");
  return validateDistributionConfig(JSON.parse(raw) as DistributionConfig);
}

export async function writeDistributionConfig(
  config: DistributionConfig,
  updatedBy: string
): Promise<DistributionConfig> {
  const nextConfig = validateDistributionConfig({
    ...config,
    updatedAt: new Date().toISOString(),
    updatedBy,
  });

  await fs.writeFile(DISTRIBUTION_CONFIG_FILE, JSON.stringify(nextConfig, null, 2), "utf8");
  return nextConfig;
}

type AddressScoreContext = {
  address: AddressStats;
  config: DistributionConfig;
};

function getAddressMetrics({ address, config }: AddressScoreContext): AddressDistribution["metrics"] {
  const balance = Math.max(address.staked - address.unstaked, 0);
  const losses = Math.max(-address.netChange, 0);
  const volume = address.staked + address.unstaked + address.claimed;
  const participation = address.activityCount;

  return {
    balance: safeNumber(balance),
    losses: safeNumber(losses),
    volume: safeNumber(volume),
    participation,
    holderEligible:
      balance >= config.eligibility.holderMinBalance &&
      participation >= config.eligibility.minActivityCount,
    traderEligible:
      losses >= config.eligibility.traderMinLosses &&
      participation >= config.eligibility.minActivityCount,
  };
}

function getHolderScore(
  metrics: AddressDistribution["metrics"],
  config: DistributionConfig
): number {
  if (!metrics.holderEligible) return 0;

  return safeNumber(
    metrics.balance * config.holderWeights.balance +
      metrics.participation * config.holderWeights.participation
  );
}

function getTraderScore(
  metrics: AddressDistribution["metrics"],
  config: DistributionConfig
): number {
  if (!metrics.traderEligible) return 0;

  return safeNumber(
    metrics.losses * config.traderWeights.losses +
      metrics.volume * config.traderWeights.volume +
      metrics.participation * config.traderWeights.participation
  );
}

function getSignalEpoch(signals: AgentSignal[], epoch: EpochSummary): number | null {
  const matchingEpoch = signals.some((signal) => signal.epoch === epoch.epochId);
  if (matchingEpoch) return epoch.epochId;
  if (signals.length === 0) return null;
  return Math.max(...signals.map((signal) => signal.epoch));
}

function computeAddressAllocations(
  addresses: AddressStats[],
  config: DistributionConfig,
  holderPoolSol: number,
  traderPoolSol: number
): AddressDistribution[] {
  const prepared = addresses.map((address) => {
    const metrics = getAddressMetrics({ address, config });
    return {
      address: address.address,
      metrics,
      holderScore: getHolderScore(metrics, config),
      traderScore: getTraderScore(metrics, config),
      holderAllocationSol: 0,
      traderAllocationSol: 0,
      totalAllocationSol: 0,
    };
  });

  const holderScoreTotal = prepared.reduce((sum, entry) => sum + entry.holderScore, 0);
  const traderScoreTotal = prepared.reduce((sum, entry) => sum + entry.traderScore, 0);

  return prepared
    .map((entry) => {
      const holderAllocationSol =
        holderScoreTotal > 0 ? safeNumber((entry.holderScore / holderScoreTotal) * holderPoolSol) : 0;
      const traderAllocationSol =
        traderScoreTotal > 0 ? safeNumber((entry.traderScore / traderScoreTotal) * traderPoolSol) : 0;

      return {
        ...entry,
        holderAllocationSol,
        traderAllocationSol,
        totalAllocationSol: safeNumber(holderAllocationSol + traderAllocationSol),
      };
    })
    .sort((left, right) => right.totalAllocationSol - left.totalAllocationSol);
}

function computeAgentAllocations(
  agents: AgentReputation[],
  signals: AgentSignal[],
  signalEpochUsed: number | null,
  config: DistributionConfig,
  agentPoolSol: number
): AgentDistribution[] {
  const latestAgentEpoch = agents.reduce((max, agent) => Math.max(max, agent.lastActiveEpoch), 0);
  const signalCounts = new Map<string, number>();

  for (const signal of signals) {
    if (signalEpochUsed !== null && signal.epoch !== signalEpochUsed) continue;
    signalCounts.set(signal.agentId, (signalCounts.get(signal.agentId) ?? 0) + 1);
  }

  const prepared = agents.map((agent) => {
    const signalsThisWindow = signalCounts.get(agent.agentId) ?? 0;
    const active = agent.lastActiveEpoch >= latestAgentEpoch - config.eligibility.activeAgentEpochLookback;
    const eligible = active && signalsThisWindow >= config.eligibility.agentMinSignals;
    const score = eligible
      ? safeNumber(
          agent.reputationScore * config.agentWeights.reputation +
            agent.avgAccuracy * 100 * config.agentWeights.accuracy +
            signalsThisWindow * config.agentWeights.signals
        )
      : 0;

    return {
      agentId: agent.agentId,
      displayName: agent.displayName,
      tier: agent.tier,
      totalSignals: agent.totalSignals,
      totalEarnedSol: agent.totalEarnedSol,
      poolSharePct: agent.poolSharePct,
      score,
      allocationSol: 0,
      metrics: {
        signalsThisWindow,
        avgAccuracy: agent.avgAccuracy,
        reputationScore: agent.reputationScore,
        active,
        eligible,
      },
    };
  });

  const totalScore = prepared.reduce((sum, agent) => sum + agent.score, 0);

  return prepared
    .map((agent) => ({
      ...agent,
      allocationSol: totalScore > 0 ? safeNumber((agent.score / totalScore) * agentPoolSol) : 0,
    }))
    .sort((left, right) => right.allocationSol - left.allocationSol);
}

function buildPools(
  totalPoolSol: number,
  config: DistributionConfig,
  addresses: AddressDistribution[],
  agents: AgentDistribution[]
): DistributionSummary["pools"] {
  const configured = {
    holders: safeNumber((totalPoolSol * config.allocation.holdersPct) / 100),
    traders: safeNumber((totalPoolSol * config.allocation.tradersPct) / 100),
    agents: safeNumber((totalPoolSol * config.allocation.agentsPct) / 100),
  };

  const activeCategories: DistributionCategory[] = [];
  if (addresses.some((address) => address.holderScore > 0)) activeCategories.push("holders");
  if (addresses.some((address) => address.traderScore > 0)) activeCategories.push("traders");
  if (agents.some((agent) => agent.score > 0)) activeCategories.push("agents");

  if (activeCategories.length === 0) {
    return {
      totalPoolSol,
      configured,
      effective: { holders: 0, traders: 0, agents: 0 },
      activeCategories,
      allocatedSol: 0,
      unallocatedSol: totalPoolSol,
    };
  }

  const activeWeightTotal = activeCategories.reduce((sum, category) => {
    const weightKey = `${category}Pct` as const;
    return sum + config.allocation[weightKey];
  }, 0);

  const effective = {
    holders: activeCategories.includes("holders")
      ? safeNumber((totalPoolSol * config.allocation.holdersPct) / activeWeightTotal)
      : 0,
    traders: activeCategories.includes("traders")
      ? safeNumber((totalPoolSol * config.allocation.tradersPct) / activeWeightTotal)
      : 0,
    agents: activeCategories.includes("agents")
      ? safeNumber((totalPoolSol * config.allocation.agentsPct) / activeWeightTotal)
      : 0,
  };

  const allocatedSol = safeNumber(effective.holders + effective.traders + effective.agents);
  return {
    totalPoolSol,
    configured,
    effective,
    activeCategories,
    allocatedSol,
    unallocatedSol: safeNumber(totalPoolSol - allocatedSol),
  };
}

async function readAgentInputs(): Promise<{ agents: AgentReputation[]; signals: AgentSignal[] }> {
  const [agentsRaw, signalsRaw] = await Promise.all([
    fs.readFile(AGENTS_FILE, "utf8"),
    fs.readFile(SIGNALS_FILE, "utf8"),
  ]);

  return {
    agents: JSON.parse(agentsRaw) as AgentReputation[],
    signals: JSON.parse(signalsRaw) as AgentSignal[],
  };
}

export async function computeDistributionSummary(): Promise<DistributionSummary> {
  const [epoch, config, agentInputs] = await Promise.all([
    readLatestEpochSummary(),
    readDistributionConfig(),
    readAgentInputs(),
  ]);

  const totalPoolSol = safeNumber(epoch.agentPool.totalPoolSol || epoch.closingBalance);
  const signalEpochUsed = getSignalEpoch(agentInputs.signals, epoch);

  const initialAddresses = computeAddressAllocations(epoch.addresses, config, 0, 0);
  const initialAgents = computeAgentAllocations(
    agentInputs.agents,
    agentInputs.signals,
    signalEpochUsed,
    config,
    0
  );

  const pools = buildPools(totalPoolSol, config, initialAddresses, initialAgents);
  const addresses = computeAddressAllocations(
    epoch.addresses,
    config,
    pools.effective.holders,
    pools.effective.traders
  );
  const agents = computeAgentAllocations(
    agentInputs.agents,
    agentInputs.signals,
    signalEpochUsed,
    config,
    pools.effective.agents
  );

  return {
    epochId: epoch.epochId,
    generatedAt: new Date().toISOString(),
    signalEpochUsed,
    config,
    pools,
    addresses,
    agents,
  };
}
