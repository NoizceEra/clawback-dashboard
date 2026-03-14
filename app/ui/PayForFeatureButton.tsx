"use client";

import { useState } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { signAndSendPayment } from "../../lib/payments/client";

export function PayForFeatureButton() {
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  const [loading, setLoading] = useState(false);
  const [txSig, setTxSig] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    try {
      setError(null);
      setTxSig(null);

      if (!publicKey) {
        setError("Connect your wallet first.");
        return;
      }

      setLoading(true);

      const res = await fetch("/api/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userWallet: publicKey.toBase58() }),
      });

      if (!res.ok) {
        throw new Error("Failed to create payment transaction");
      }

      const { transaction, invoice } = await res.json();

      const sig = await signAndSendPayment(transaction, signTransaction, connection);
      setTxSig(sig);

      console.log("Invoice params:", invoice);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Payment failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        onClick={handleClick}
        disabled={loading}
        className="px-4 py-2 rounded-md bg-black text-white disabled:opacity-60"
      >
        {loading ? "Processing..." : "Unlock Premium Clawback Insights"}
      </button>
      {txSig && (
        <p className="text-xs text-green-600 break-all">
          Paid. Tx: {txSig}
        </p>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
