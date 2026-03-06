import fs from "node:fs/promises";
import path from "node:path";
import type { AddressStats, EpochSummary } from "../types/epoch";

const EPOCH_FILE = path.join(process.cwd(), "data", "epoch-latest.json");

export async function readLatestEpochSummary(): Promise<EpochSummary> {
  const contents = await fs.readFile(EPOCH_FILE, "utf8");
  return JSON.parse(contents) as EpochSummary;
}

export async function readAddressStats(address: string): Promise<AddressStats | null> {
  const summary = await readLatestEpochSummary();
  return summary.addresses.find((entry) => entry.address === address) ?? null;
}
