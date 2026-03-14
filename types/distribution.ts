import type { AgentTier } from "./agent";

export type DistributionCategory = "holders" | "traders" | "agents";

export type DistributionConfig = {
  version: number;
  updatedAt: string;
  updatedBy: string;
  allocation: {
    holdersPct: number;
    tradersPct: number;
    agentsPct: number;
  };
  holderWeights: {
    balance: number;
    participation: number;
  };
  traderWeights: {
    losses: number;
    volume: number;
    participation: number;
  };
  agentWeights: {
    reputation: number;
    accuracy: number;
    signals: number;
  };
  eligibility: {
    holderMinBalance: number;
    traderMinLosses: number;
    minActivityCount: number;
    agentMinSignals: number;
    activeAgentEpochLookback: number;
  };
};

export type AddressDistributionMetrics = {
  balance: number;
  losses: number;
  volume: number;
  participation: number;
  holderEligible: boolean;
  traderEligible: boolean;
};

export type AddressDistribution = {
  address: string;
  metrics: AddressDistributionMetrics;
  holderScore: number;
  traderScore: number;
  holderAllocationSol: number;
  traderAllocationSol: number;
  totalAllocationSol: number;
};

export type AgentDistributionMetrics = {
  signalsThisWindow: number;
  avgAccuracy: number;
  reputationScore: number;
  active: boolean;
  eligible: boolean;
};

export type AgentDistribution = {
  agentId: string;
  displayName: string;
  tier: AgentTier;
  totalSignals: number;
  totalEarnedSol: number;
  poolSharePct: number;
  score: number;
  allocationSol: number;
  metrics: AgentDistributionMetrics;
};

export type DistributionPools = {
  totalPoolSol: number;
  configured: Record<DistributionCategory, number>;
  effective: Record<DistributionCategory, number>;
  activeCategories: DistributionCategory[];
  allocatedSol: number;
  unallocatedSol: number;
};

export type DistributionSummary = {
  epochId: number;
  generatedAt: string;
  signalEpochUsed: number | null;
  config: DistributionConfig;
  pools: DistributionPools;
  addresses: AddressDistribution[];
  agents: AgentDistribution[];
};
