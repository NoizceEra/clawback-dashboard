"use client";

import { useEffect, useMemo, useState } from "react";
import type { AgentPoolSummary } from "../../types/agent";
import type {
  DistributionConfig,
  DistributionSummary
} from "../../types/distribution";
import type { AddressStats, EpochSummary } from "../../types/epoch";

// ─────────────────────────────────────────────────────────────
// Format helpers
// ─────────────────────────────────────────────────────────────

function solFormat(value: number): string {
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 4 })} SOL`;
}

function percentageFormat(value: number): string {
  return `${value.toLocaleString()}%`;
}

// ─────────────────────────────────────────────────────────────
// Main dashboard (Ultra-Minimal v2)
// ─────────────────────────────────────────────────────────────

export function DashboardClient(): React.JSX.Element {
  const [summary, setSummary] = useState<EpochSummary | null>(null);
  const [distribution, setDistribution] = useState<DistributionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [eR, dR] = await Promise.all([
          fetch("/api/epoch/latest"),
          fetch("/api/distribution")
        ]);
        if (!eR.ok || !dR.ok) throw new Error("Failed to load data");
        setSummary(await eR.json());
        setDistribution(await dR.json());
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const treasuryAmount = distribution?.pools.totalPoolSol ?? summary?.closingBalance ?? 0;
  const avgReward = useMemo(() => {
    if (!distribution || distribution.addresses.length === 0) return 0;
    return distribution.addresses.reduce((a, b) => a + b.totalAllocationSol, 0) / distribution.addresses.length;
  }, [distribution]);

  if (loading) return <div className="flex items-center justify-center min-h-screen text-slate-400">Loading...</div>;
  if (error || !summary || !distribution) return <div className="flex items-center justify-center min-h-screen text-red-500">{error || "Data error"}</div>;

  return (
    <main className="max-w-2xl mx-auto px-6 py-24 font-sans text-slate-900 selection:bg-blue-100">
      {/* Header */}
      <header className="mb-20 text-center">
        <h1 className="text-5xl font-bold tracking-tight mb-4">$CLAWBACK</h1>
        <p className="text-xl text-slate-500 font-medium tracking-tight">Automated creator rewards.</p>
      </header>

      {/* Main Stats Card */}
      <div className="bg-white rounded-[32px] p-10 shadow-sm border border-slate-100 mb-8">
        <div className="grid grid-cols-2 gap-12 text-center">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">Total Pool</div>
            <div className="text-3xl font-semibold tracking-tight">{solFormat(treasuryAmount)}</div>
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">Avg Payout</div>
            <div className="text-3xl font-semibold tracking-tight text-blue-600">{solFormat(avgReward)}</div>
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">Epoch</div>
            <div className="text-3xl font-semibold tracking-tight">#{summary.epochId}</div>
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">Wallets</div>
            <div className="text-3xl font-semibold tracking-tight">{summary.addresses.length}</div>
          </div>
        </div>
      </div>

      {/* Allocation Summary */}
      <div className="bg-slate-50 rounded-[32px] p-8 text-center mb-16">
        <div className="flex justify-center gap-6 text-sm font-semibold text-slate-600">
          <span>{percentageFormat(distribution.config.allocation.holdersPct)} Holders</span>
          <span>•</span>
          <span>{percentageFormat(distribution.config.allocation.tradersPct)} Traders</span>
          <span>•</span>
          <span>{percentageFormat(distribution.config.allocation.agentsPct)} Agents</span>
        </div>
      </div>

      {/* Call to Action / Footer */}
      <footer className="text-center space-y-8">
        <button 
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
        >
          {showAdvanced ? "Hide Details" : "View Details"}
        </button>

        {showAdvanced && (
          <div className="pt-8 text-left space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-xs text-slate-400 bg-slate-50 p-6 rounded-2xl font-mono overflow-auto max-h-64">
              {JSON.stringify({ summary, distribution }, null, 2)}
            </div>
          </div>
        )}

        <div className="pt-12 text-[11px] font-bold uppercase tracking-widest text-slate-300">
          Built for Solana
        </div>
      </footer>
    </main>
  );
}
