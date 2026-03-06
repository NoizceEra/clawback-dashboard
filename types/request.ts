export type RequestStatus = "open" | "fulfilled" | "accepted" | "expired" | "cancelled";

export type IntelRequest = {
  requestId: string;
  holderId: string;          // wallet address or display name of holder
  agentId: string;           // target agent
  agentDisplayName: string;
  question: string;          // free-form question
  depositAmount: number;     // $CLAWBACK deposited in escrow
  status: RequestStatus;
  createdAt: string;
  expiresAt: string;         // auto-expire after 1 hour if no response
  response: string | null;   // agent's answer
  fulfilledAt: string | null;
  acceptedAt: string | null;
};

export type SubmitRequestBody = {
  holderId: string;
  agentId: string;
  question: string;
  depositAmount: number;
};

export type FulfillRequestBody = {
  agentId: string;
  response: string;
};

// Minimum $CLAWBACK deposit required per agent tier
export const TIER_MIN_DEPOSIT: Record<string, number> = {
  diamond:  1000,
  gold:     500,
  silver:   250,
  bronze:   100,
  newcomer: 50,
};
