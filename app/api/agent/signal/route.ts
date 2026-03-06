import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import type { AgentSignal, SignalType } from "../../../../types/agent";

const SIGNALS_FILE = path.join(process.cwd(), "data", "agent-signals.sample.json");

const VALID_SIGNAL_TYPES: SignalType[] = ["price", "volume", "flow", "sentiment"];

type SignalBody = {
  agentId?: unknown;
  signalType?: unknown;
  asset?: unknown;
  value?: unknown;
  confidence?: unknown;
  epoch?: unknown;
};

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const body = (await req.json()) as SignalBody;

    if (
      typeof body.agentId     !== "string" || !body.agentId ||
      typeof body.signalType  !== "string" || !VALID_SIGNAL_TYPES.includes(body.signalType as SignalType) ||
      typeof body.asset       !== "string" || !body.asset ||
      typeof body.value       !== "number" ||
      typeof body.confidence  !== "number" || body.confidence < 0 || body.confidence > 1 ||
      typeof body.epoch       !== "number"
    ) {
      return NextResponse.json(
        { error: "Invalid signal. Required: agentId, signalType, asset, value (number), confidence (0-1), epoch (number)" },
        { status: 400 }
      );
    }

    const raw = await fs.readFile(SIGNALS_FILE, "utf8");
    const signals = JSON.parse(raw) as AgentSignal[];

    const newSignal: AgentSignal = {
      signalId: `sig_${Date.now()}`,
      agentId: body.agentId,
      epoch: body.epoch,
      timestamp: new Date().toISOString(),
      signalType: body.signalType as SignalType,
      asset: body.asset,
      value: body.value,
      confidence: body.confidence,
      verified: false,
      accuracyScore: null,
    };

    signals.push(newSignal);
    await fs.writeFile(SIGNALS_FILE, JSON.stringify(signals, null, 2), "utf8");

    return NextResponse.json(
      { success: true, signal: newSignal, message: "Signal received. Reputation will update after epoch verification." },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "Failed to process signal" }, { status: 500 });
  }
}

export async function GET(): Promise<NextResponse> {
  try {
    const raw = await fs.readFile(SIGNALS_FILE, "utf8");
    const signals = JSON.parse(raw) as AgentSignal[];
    return NextResponse.json({ signals, count: signals.length });
  } catch {
    return NextResponse.json({ error: "Failed to load signals" }, { status: 500 });
  }
}
