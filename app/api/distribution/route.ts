import { NextResponse } from "next/server";
import {
  computeDistributionSummary,
  readDistributionConfig,
  writeDistributionConfig
} from "../../../lib/distribution";
import type { DistributionConfig } from "../../../types/distribution";

export async function GET(): Promise<NextResponse> {
  try {
    const summary = await computeDistributionSummary();
    return NextResponse.json(summary, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to compute distribution summary.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const currentConfig = await readDistributionConfig();
    const body = (await request.json()) as Partial<DistributionConfig> & { updatedBy?: string };

    const nextConfig: DistributionConfig = {
      ...currentConfig,
      ...body,
      allocation: {
        ...currentConfig.allocation,
        ...body.allocation,
      },
      holderWeights: {
        ...currentConfig.holderWeights,
        ...body.holderWeights,
      },
      traderWeights: {
        ...currentConfig.traderWeights,
        ...body.traderWeights,
      },
      agentWeights: {
        ...currentConfig.agentWeights,
        ...body.agentWeights,
      },
      eligibility: {
        ...currentConfig.eligibility,
        ...body.eligibility,
      },
      version: currentConfig.version,
      updatedAt: currentConfig.updatedAt,
      updatedBy: currentConfig.updatedBy,
    };

    await writeDistributionConfig(nextConfig, body.updatedBy ?? "dashboard-admin");
    const summary = await computeDistributionSummary();

    return NextResponse.json(summary, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to update distribution config.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 400 }
    );
  }
}
