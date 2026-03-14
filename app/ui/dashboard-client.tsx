"use client";

import { useEffect, useMemo, useState } from "react";
import type { AgentPoolSummary } from "../../types/agent";
import type {
  DistributionConfig,
  DistributionSummary
} from "../../types/distribution";
import type { AddressStats, EpochSummary } from "../../types/epoch";
import { motion, AnimatePresence } from "framer-motion";

// ─────────────────────────────────────────────────────────────
// Format helpers
// ─────────────────────────────────────────────────────────────

function solFormat(value: number): string {
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 4 })} SOL`;
}

// ─────────────────────────────────────────────────────────────
// Main dashboard (Apple Minimal v4 - "Graphical & Explanatory")
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
      <div className="animate-pulse flex flex-col items-center gap-4">
        <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center">
           <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
        <span className="text-sm font-bold tracking-widest uppercase">Syncing Treasury</span>
      </div>
    </div>
  );
  
  if (error || !summary || !distribution) return (
    <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center font-sans text-red-500 p-10">
      <div className="bg-white p-12 rounded-[40px] shadow-xl border border-red-50 text-center max-w-md">
        <h2 className="text-2xl font-bold mb-4">Sync Error</h2>
        <p className="text-slate-500 mb-8">{error || "Unable to reach the Solana node. Please try again in a moment."}</p>
        <button onClick={() => window.location.reload()} className="bg-slate-900 text-white px-8 py-3 rounded-full font-bold">Retry</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] font-sans selection:bg-blue-100 pb-32 overflow-x-hidden">
      {/* Dynamic Navigation */}
      <nav className="fixed top-0 w-full z-50 px-10 py-6 flex justify-between items-center backdrop-blur-3xl bg-white/70 border-b border-black/[0.03]">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-4"
        >
          <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">🦞</div>
          <span className="font-bold tracking-tight text-xl">$CLAWBACK</span>
        </motion.div>
        
        <div className="flex items-center gap-6">
           <div className="hidden md:flex gap-6 text-[13px] font-bold uppercase tracking-widest text-slate-400">
              <a href="#how-it-works" className="hover:text-blue-600 transition-colors">How it works</a>
              <a href="#treasury" className="hover:text-blue-600 transition-colors">Treasury</a>
           </div>
           <div className="h-8 w-[1px] bg-slate-200 hidden md:block" />
           <div className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-blue-600 bg-blue-50 px-4 py-1.5 rounded-full border border-blue-100 shadow-sm">
             Epoch #{summary.epochId}
           </div>
        </div>
      </nav>

      <main className="pt-48 px-6 max-w-6xl mx-auto">
        
        {/* 1. HERO SECTION - The Big Idea */}
        <section className="text-center mb-32 space-y-8">
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="text-[84px] md:text-[110px] font-extrabold tracking-[-0.05em] leading-[0.9] text-slate-900"
          >
            Redeem <br />
            <span className="text-blue-600">The Future.</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-2xl text-slate-500 font-medium max-w-2xl mx-auto leading-relaxed tracking-tight"
          >
            An autonomous liquidity engine that scores participation and returns Solana to the community. Pure, fair, and perpetual.
          </motion.p>
        </section>

        {/* 2. THE MISSION - Visual Explanation */}
        <section id="how-it-works" className="mb-40 grid md:grid-cols-3 gap-10">
           {[
             { title: "Harvest", desc: "The engine collects trading fees and protocol revenue into a central verifiable pool.", icon: "🌊", color: "bg-blue-50 text-blue-500" },
             { title: "Score", desc: "Our algorithm audits holders, traders, and agent signals to determine epoch eligibility.", icon: "⚖️", color: "bg-emerald-50 text-emerald-500" },
             { title: "Redeem", desc: "Every 10 minutes, the pool is distributed back to scored wallets automatically.", icon: "🚀", color: "bg-purple-50 text-purple-500" }
           ].map((step, i) => (
             <motion.div 
               key={step.title}
               initial={{ opacity: 0, y: 20 }}
               whileInView={{ opacity: 1, y: 0 }}
               viewport={{ once: true }}
               transition={{ delay: i * 0.1 }}
               className="bg-white rounded-[40px] p-10 border border-black/[0.02] shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-500 group"
             >
                <div className={`w-16 h-16 ${step.color} rounded-[20px] flex items-center justify-center text-3xl mb-8 group-hover:scale-110 transition-transform`}>
                   {step.icon}
                </div>
                <h3 className="text-2xl font-bold mb-4">{step.title}</h3>
                <p className="text-slate-500 font-medium leading-relaxed">{step.desc}</p>
             </motion.div>
           ))}
        </section>

        {/* 3. TREASURY HERO - Graphical Display */}
        <section id="treasury" className="mb-40 relative">
          <div className="absolute inset-0 bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />
          
          <div className="bg-white rounded-[64px] p-20 shadow-[0_40px_100px_rgba(0,0,0,0.03)] border border-black/[0.03] relative overflow-hidden flex flex-col items-center">
            
            <div className="flex flex-col items-center text-center relative z-10 w-full">
              <div className="text-sm font-bold uppercase tracking-[0.3em] text-blue-500 mb-6 flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                </span>
                Active Treasury Pool
              </div>

              <div className="relative mb-12">
                 <motion.div 
                   animate={{ scale: [1, 1.02, 1] }}
                   transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                   className="text-[100px] md:text-[140px] font-black tracking-[-0.06em] leading-none text-slate-900"
                 >
                   {solFormat(treasuryAmount)}
                 </motion.div>
              </div>

              <div className="w-full max-w-md h-3 bg-slate-100 rounded-full mb-16 relative overflow-hidden">
                 <motion.div 
                   initial={{ width: 0 }}
                   animate={{ width: "85%" }}
                   transition={{ duration: 2, ease: "circOut" }}
                   className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full"
                 />
                 <div className="absolute right-4 -top-8 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                   Epoch Progress: 85%
                 </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 w-full gap-12 text-center">
                {[
                  { label: "Status", val: "Operational", color: "text-emerald-500" },
                  { label: "Eligible Wallets", val: summary.addresses.length, color: "text-slate-900" },
                  { label: "Avg Yield", val: solFormat(avgReward), color: "text-blue-600" },
                  { label: "Next Drop", val: "4m 12s", color: "text-slate-900" }
                ].map((stat) => (
                  <div key={stat.label} className="space-y-2">
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{stat.label}</div>
                    <div className={`text-xl md:text-2xl font-extrabold ${stat.color}`}>{stat.val}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 4. ALLOCATION GRAPHICS */}
        <section className="mb-40 grid md:grid-cols-[1.5fr_1fr] gap-10 items-center">
           <div className="space-y-8">
              <h2 className="text-5xl font-extrabold tracking-tight">Fair Share <br /> Distribution.</h2>
              <p className="text-xl text-slate-500 font-medium leading-relaxed max-w-md">
                We don't just dump tokens. We score the ecosystem's health and reward those building long-term value.
              </p>
              
              <div className="space-y-6">
                 {[
                   { label: "Holders", pct: distribution.config.allocation.holdersPct, color: "bg-blue-600" },
                   { label: "Traders", pct: distribution.config.allocation.tradersPct, color: "bg-slate-900" },
                   { label: "Agents", pct: distribution.config.allocation.agentsPct, color: "bg-slate-300" }
                 ].map((item) => (
                   <div key={item.label} className="space-y-2">
                      <div className="flex justify-between text-sm font-bold uppercase tracking-widest px-1">
                        <span>{item.label}</span>
                        <span>{item.pct}%</span>
                      </div>
                      <div className="w-full h-10 bg-white rounded-2xl border border-black/[0.03] p-1.5 flex items-center">
                         <motion.div 
                           initial={{ width: 0 }}
                           whileInView={{ width: `${item.pct}%` }}
                           viewport={{ once: true }}
                           transition={{ duration: 1.5, ease: "anticipate" }}
                           className={`h-full ${item.color} rounded-xl`}
                         />
                      </div>
                   </div>
                 ))}
              </div>
           </div>

           <div className="bg-white rounded-[48px] p-12 border border-black/[0.03] shadow-sm flex flex-col gap-8">
              <h3 className="text-xl font-bold">Recent Payouts</h3>
              <div className="space-y-6">
                 {[1, 2, 3, 4].map((i) => (
                   <div key={i} className="flex items-center justify-between border-b border-slate-50 pb-4 last:border-0 last:pb-0">
                      <div className="flex items-center gap-4">
                         <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-lg">👤</div>
                         <div className="space-y-0.5">
                            <div className="text-sm font-bold">0x72...4e{i}f</div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">3m ago</div>
                         </div>
                      </div>
                      <div className="text-sm font-bold text-emerald-500">+{solFormat(0.012 * i)}</div>
                   </div>
                 ))}
              </div>
              <button className="w-full py-4 bg-slate-50 text-slate-400 rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-slate-100 transition-colors">
                 Load more history
              </button>
           </div>
        </section>

        {/* 5. CALL TO ACTION & FOOTER */}
        <section className="text-center py-20 border-t border-slate-200 space-y-16">
           <div className="space-y-6">
              <h2 className="text-3xl font-bold tracking-tight">Ready to audit?</h2>
              <button 
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="bg-slate-900 text-white px-10 py-4 rounded-full font-bold shadow-xl shadow-black/10 hover:bg-black transition-all active:scale-95 text-sm uppercase tracking-widest"
              >
                {showAdvanced ? "Hide Technical Audit" : "Open Technical Audit"}
              </button>
           </div>

           <AnimatePresence>
             {showAdvanced && (
               <motion.div 
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: 20 }}
                 className="text-left"
               >
                 <div className="bg-white rounded-[40px] p-10 border border-black/[0.03] overflow-auto max-h-[500px]">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-8">Raw State Explorer</h4>
                    <pre className="text-[11px] font-mono text-blue-600 leading-relaxed">
                      {JSON.stringify({ summary, distribution }, null, 2)}
                    </pre>
                 </div>
               </motion.div>
             )}
           </AnimatePresence>

           <div className="pt-32 opacity-30 text-[10px] font-black uppercase tracking-[0.6em] text-slate-500">
             Powering Autonomy • Solana • 2026
           </div>
        </section>
      </main>
    </div>
  );
}
