export type SignalType = "price" | "volume" | "flow" | "sentiment";

export type AgentTier = "newcomer" | "bronze" | "silver" | "gold" | "diamond";

export type AgentSignal = {
  signalId: string;
  agentId: string;
  epoch: number;
  timestamp: string;
  signalType: SignalType;
  asset: string;
  value: number;
  confidence: number; // 0–1
  verified: boolean;
  accuracyScore: number | null; // null until verified post-epoch
};

export type AgentReputation = {
  agentId: string;
  displayName: string;
  totalSignals: number;
  verifiedSignals: number;
  avgAccuracy: number;       // 0–1
  reputationScore: number;   // integer points
  tier: AgentTier;
  poolSharePct: number;      // % of the 30% agent pool this agent receives
  totalEarnedSol: number;
  lastActiveEpoch: number;
};

export type AgentPoolSummary = {
  epochId: number;
  totalPoolSol: number;        // full epoch pool
  holderTraderAllocationSol: number; // 70%
  agentAllocationSol: number;  // 30%
  activeAgents: number;
  totalSignalsThisEpoch: number;
  topAgents: AgentReputation[];
};
