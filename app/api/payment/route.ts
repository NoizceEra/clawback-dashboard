import { NextResponse } from "next/server";
import { Connection, PublicKey, Transaction, ComputeBudgetProgram } from "@solana/web3.js";
import { PumpAgent } from "@pump-fun/agent-payments-sdk";
import { generateInvoiceParams } from "../../../lib/payments/invoice";

const RPC_URL = process.env.SOLANA_RPC_URL!;
const AGENT_MINT = process.env.AGENT_TOKEN_MINT_ADDRESS!;
const CURRENCY_MINT = process.env.CURRENCY_MINT!;

export async function POST(req: Request) {
  try {
    const { userWallet } = await req.json();
    if (!userWallet) {
      return NextResponse.json({ error: "Missing userWallet" }, { status: 400 });
    }

    const connection = new Connection(RPC_URL);
    const agentMint = new PublicKey(AGENT_MINT);
    const currencyMint = new PublicKey(CURRENCY_MINT);
    const userPublicKey = new PublicKey(userWallet);

    const agent = new PumpAgent(agentMint, "mainnet", connection);
    const { amount, memo, startTime, endTime } = generateInvoiceParams();

    const instructions = await agent.buildAcceptPaymentInstructions({
      user: userPublicKey,
      currencyMint,
      amount,
      memo,
      startTime,
      endTime,
    });

    const { blockhash } = await connection.getLatestBlockhash("confirmed");

    const tx = new Transaction();
    tx.recentBlockhash = blockhash;
    tx.feePayer = userPublicKey;
    tx.add(
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100_000 }),
      ...instructions,
    );

    const serializedTx = tx
      .serialize({ requireAllSignatures: false })
      .toString("base64");

    return NextResponse.json({
      transaction: serializedTx,
      invoice: { amount, memo, startTime, endTime },
    });
  } catch (err) {
    console.error("Error building payment tx", err);
    return NextResponse.json({ error: "Failed to build transaction" }, { status: 500 });
  }
}
