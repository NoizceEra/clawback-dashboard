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
// Main dashboard (Apple Minimal v3)
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

  if (loading) return (
    <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center font-sans text-slate-400">
      <div className="animate-pulse">Loading dashboard...</div>
    </div>
  );
  
  if (error || !summary || !distribution) return (
    <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center font-sans text-red-500 p-10">
      {error || "Unable to sync with Solana treasury."}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] font-sans selection:bg-blue-100 pb-20">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 px-8 py-6 flex justify-between items-center backdrop-blur-2xl bg-white/70 border-b border-black/[0.03]">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🦞</span>
          <span className="font-bold tracking-tight text-lg">$CLAWBACK</span>
        </div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
          Epoch #{summary.epochId}
        </div>
      </nav>

      <main className="pt-40 px-6 max-w-4xl mx-auto">
        {/* Hero Section */}
        <header className="text-center mb-20 space-y-4">
          <h1 className="text-6xl font-extrabold tracking-tight leading-tight">
            Your rewards, <br />
            <span className="text-blue-600">reimagined.</span>
          </h1>
          <p className="text-xl text-slate-500 font-medium max-w-lg mx-auto leading-snug">
            SOL refunds, automatically delivered every 10 minutes. <br />
            Fun, simple, and automatic.
          </p>
        </header>

        {/* The Main Card */}
        <div className="bg-white rounded-[48px] p-16 shadow-2xl shadow-black/[0.02] border border-black/[0.03] mb-12 relative overflow-hidden">
           {/* Subtle background glow */}
           <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-50 rounded-full blur-3xl opacity-50" />
           
           <div className="relative z-10 flex flex-col items-center text-center">
              <div className="text-[12px] font-bold uppercase tracking-[0.2em] text-blue-500 mb-4 bg-blue-50 px-4 py-1.5 rounded-full">
                Current Balance
              </div>
              <div className="text-7xl font-bold tracking-tighter mb-8">
                {solFormat(treasuryAmount)}
              </div>
              
              <div className="w-full h-[1px] bg-slate-100 mb-10" />

              <div className="grid grid-cols-3 w-full gap-8">
                <div className="space-y-1">
                   <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Available</div>
                   <div className="text-xl font-semibold text-emerald-500">Active</div>
                </div>
                <div className="space-y-1">
                   <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Update Interval</div>
                   <div className="text-xl font-semibold text-slate-900">10m</div>
                </div>
                <div className="space-y-1">
                   <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Distribution</div>
                   <div className="text-xl font-semibold text-slate-900">Auto</div>
                </div>
              </div>
           </div>
        </div>

        {/* Secondary Stats Group */}
        <div className="grid md:grid-cols-2 gap-8 mb-20">
           <div className="bg-white rounded-[40px] p-10 border border-black/[0.03] shadow-sm flex flex-col items-center text-center">
              <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">Avg Payout</div>
              <div className="text-4xl font-bold tracking-tight text-blue-600">{solFormat(avgReward)}</div>
              <p className="text-xs text-slate-400 mt-4 font-medium">Per eligible address this epoch</p>
           </div>
           <div className="bg-white rounded-[40px] p-10 border border-black/[0.03] shadow-sm flex flex-col items-center text-center">
              <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">Scored Wallets</div>
              <div className="text-4xl font-bold tracking-tight">{summary.addresses.length}</div>
              <p className="text-xs text-slate-400 mt-4 font-medium">Detected across active protocols</p>
           </div>
        </div>

        {/* Split Visualization */}
        <section className="mb-24">
           <div className="flex justify-between items-end mb-6 px-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">Allocation Model</h3>
              <div className="text-xs font-semibold text-blue-600">v1.2 Standard</div>
           </div>
           <div className="bg-white rounded-[32px] p-4 border border-black/[0.03] shadow-sm flex gap-2 h-20">
              <div className="bg-blue-600 rounded-2xl flex items-center justify-center text-white text-[11px] font-bold transition-all hover:opacity-90" style={{ width: `${distribution.config.allocation.holdersPct}%` }}>
                Holders {distribution.config.allocation.holdersPct}%
              </div>
              <div className="bg-slate-900 rounded-2xl flex items-center justify-center text-white text-[11px] font-bold transition-all hover:opacity-90" style={{ width: `${distribution.config.allocation.tradersPct}%` }}>
                Traders {distribution.config.allocation.tradersPct}%
              </div>
              <div className="bg-slate-200 rounded-2xl flex items-center justify-center text-slate-600 text-[11px] font-bold transition-all hover:opacity-90" style={{ width: `${distribution.config.allocation.agentsPct}%` }}>
                Agents {distribution.config.allocation.agentsPct}%
              </div>
           </div>
        </section>

        {/* Information Toggle */}
        <footer className="text-center space-y-12">
          <button 
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="bg-slate-900 text-white px-8 py-3 rounded-full font-semibold shadow-lg shadow-black/10 hover:bg-black transition-all active:scale-95"
          >
            {showAdvanced ? "Hide Technical Details" : "View Technical Details"}
          </button>

          {showAdvanced && (
            <div className="text-left space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className="bg-white rounded-[32px] p-8 border border-black/[0.03] space-y-6">
                 <h4 className="text-lg font-bold">Scoring Logic</h4>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-slate-500 leading-relaxed">
                    <div className="space-y-2">
                       <div className="font-bold text-slate-900">Holders</div>
                       <p>Weighted by duration and balance across connected liquidity pools.</p>
                    </div>
                    <div className="space-y-2">
                       <div className="font-bold text-slate-900">Traders</div>
                       <p>Optimized for long-term active participation and volume consistency.</p>
                    </div>
                    <div className="space-y-2">
                       <div className="font-bold text-slate-900">Agents</div>
                       <p>Reward split based on signal accuracy and reputation scoring.</p>
                    </div>
                 </div>
                 <div className="pt-6 border-t border-slate-50 overflow-auto max-h-80">
                   <pre className="text-[10px] font-mono text-slate-400 bg-slate-50 p-6 rounded-2xl">
                     {JSON.stringify({ summary, distribution }, null, 2)}
                   </pre>
                 </div>
               </div>
            </div>
          )}

          <div className="pt-20 opacity-20 text-[10px] font-bold uppercase tracking-[0.4em]">
            Built for the Solana ecosystem
          </div>
        </footer>
      </main>
    </div>
  );
}
