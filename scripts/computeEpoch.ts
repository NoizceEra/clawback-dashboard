import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ActivityRecord, AddressStats, EpochSummary, AgentPoolAllocation } from "../types/epoch";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const INPUT_FILE = path.join(repoRoot, "data", "activity.sample.json");
const OUTPUT_FILE = path.join(repoRoot, "data", "epoch-latest.json");

const DEFAULT_TOKEN_MINT = process.env.CLAWBACK_TOKEN_MINT ?? "PLACEHOLDER_TOKEN_MINT_ADDRESS";
const DEFAULT_TREASURY_ADDRESS =
  process.env.CLAWBACK_TREASURY_ADDRESS ?? "PLACEHOLDER_TREASURY_ADDRESS";

function safeNumber(value: number): number {
  return Number(value.toFixed(6));
}

function computeAddressStats(records: ActivityRecord[]): AddressStats[] {
  const byAddress = new Map<string, AddressStats>();

  for (const record of records) {
    const existing = byAddress.get(record.address) ?? {
      address: record.address,
      staked: 0,
      unstaked: 0,
      claimed: 0,
      fees: 0,
      netChange: 0,
      activityCount: 0
    };

    if (record.action === "stake") existing.staked += record.amount;
    if (record.action === "unstake") existing.unstaked += record.amount;
    if (record.action === "claim") existing.claimed += record.amount;

    existing.fees += record.fee;
    existing.netChange = existing.staked - existing.unstaked - existing.claimed - existing.fees;
    existing.activityCount += 1;
    byAddress.set(record.address, existing);
  }

  return [...byAddress.values()]
    .map((entry) => ({
      ...entry,
      staked: safeNumber(entry.staked),
      unstaked: safeNumber(entry.unstaked),
      claimed: safeNumber(entry.claimed),
      fees: safeNumber(entry.fees),
      netChange: safeNumber(entry.netChange)
    }))
    .sort((a, b) => b.netChange - a.netChange);
}

async function main(): Promise<void> {
  const raw = await fs.readFile(INPUT_FILE, "utf8");
  const activity = JSON.parse(raw) as ActivityRecord[];

  if (!Array.isArray(activity) || activity.length === 0) {
    throw new Error("data/activity.sample.json is empty or invalid.");
  }

  const sorted = [...activity].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  const latestEpoch = Math.max(...sorted.map((item) => item.epoch));
  const latestRecords = sorted.filter((item) => item.epoch === latestEpoch);
  const priorRecords = sorted.filter((item) => item.epoch < latestEpoch);

  const openingBalance = priorRecords.reduce((acc, record) => {
    if (record.action === "stake") return acc + record.amount - record.fee;
    return acc - record.amount - record.fee;
  }, 0);

  const totals = latestRecords.reduce(
    (acc, record) => {
      if (record.action === "stake") acc.staked += record.amount;
      if (record.action === "unstake") acc.unstaked += record.amount;
      if (record.action === "claim") acc.claimed += record.amount;
      acc.fees += record.fee;
      return acc;
    },
    { staked: 0, unstaked: 0, claimed: 0, fees: 0 }
  );

  const netPoolChange = totals.staked - totals.unstaked - totals.claimed - totals.fees;
  const closingBalance = openingBalance + netPoolChange;
  const addressStats = computeAddressStats(latestRecords);

  // 70/30 split: holders+traders get 70%, agent economy gets 30%
  const AGENT_POOL_RATIO = 0.30;
  const totalPool = safeNumber(closingBalance);
  const agentPool: AgentPoolAllocation = {
    totalPoolSol: totalPool,
    holderTraderSol: safeNumber(totalPool * (1 - AGENT_POOL_RATIO)),
    agentSol: safeNumber(totalPool * AGENT_POOL_RATIO),
  };

  const summary: EpochSummary = {
    tokenSymbol: "CLAWBACK",
    tokenMint: DEFAULT_TOKEN_MINT,
    treasuryAddress: DEFAULT_TREASURY_ADDRESS,
    generatedAt: new Date().toISOString(),
    epochId: latestEpoch,
    epochStart: latestRecords[0].timestamp,
    epochEnd: latestRecords[latestRecords.length - 1].timestamp,
    openingBalance: safeNumber(openingBalance),
    closingBalance: safeNumber(closingBalance),
    totals: {
      staked: safeNumber(totals.staked),
      unstaked: safeNumber(totals.unstaked),
      claimed: safeNumber(totals.claimed),
      fees: safeNumber(totals.fees),
      netPoolChange: safeNumber(netPoolChange)
    },
    activityCount: latestRecords.length,
    addresses: addressStats,
    agentPool,
  };

  await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
  await fs.writeFile(OUTPUT_FILE, JSON.stringify(summary, null, 2), "utf8");

  console.log(`Computed epoch ${latestEpoch} summary into ${OUTPUT_FILE}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
