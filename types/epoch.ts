export type ActivityAction = "stake" | "unstake" | "claim";

export type ActivityRecord = {
  timestamp: string;
  epoch: number;
  txId: string;
  address: string;
  action: ActivityAction;
  amount: number;
  fee: number;
};

export type AddressStats = {
  address: string;
  staked: number;
  unstaked: number;
  claimed: number;
  fees: number;
  netChange: number;
  activityCount: number;
};

export type AgentPoolAllocation = {
  totalPoolSol: number;
  holderTraderSol: number; // 70%
  agentSol: number;        // 30%
};

export type EpochSummary = {
  tokenSymbol: "CLAWBACK";
  tokenMint: string;
  treasuryAddress: string;
  generatedAt: string;
  epochId: number;
  epochStart: string;
  epochEnd: string;
  openingBalance: number;
  closingBalance: number;
  totals: {
    staked: number;
    unstaked: number;
    claimed: number;
    fees: number;
    netPoolChange: number;
  };
  activityCount: number;
  addresses: AddressStats[];
  agentPool: AgentPoolAllocation;
};
