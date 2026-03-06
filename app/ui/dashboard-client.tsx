"use client";

import { useEffect, useMemo, useState } from "react";
import type { AddressStats, EpochSummary } from "../../types/epoch";
import type { AgentPoolSummary } from "../../types/agent";

function numberFormat(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function solFormat(value: number): string {
  return `${numberFormat(value)} SOL`;
}

function shortAddress(address: string): string {
  if (!address || address.length <= 16) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Pastel stat card with a colored accent stripe
function StatCard({
  emoji,
  title,
  label,
  value,
  valueColor,
  body,
  accentColor,
}: {
  emoji: string;
  title: string;
  label: string;
  value: string;
  valueColor?: string;
  body?: string;
  accentColor: string;
}) {
  return (
    <article
      className="card"
      style={{ borderTop: `4px solid ${accentColor}`, paddingTop: "20px" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
        <span style={{ fontSize: "1.4rem" }}>{emoji}</span>
        <div className="section-title" style={{ color: accentColor, margin: 0 }}>{title}</div>
      </div>
      <div className="card-label">{label}</div>
      <div className="card-value" style={valueColor ? { color: valueColor } : {}}>
        {value}
      </div>
      {body && <p className="section-body" style={{ marginTop: "10px" }}>{body}</p>}
    </article>
  );
}

export function DashboardClient(): React.JSX.Element {
  const [summary, setSummary] = useState<EpochSummary | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<string>("");
  const [selectedStats, setSelectedStats] = useState<AddressStats | null>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [agentPool, setAgentPool] = useState<AgentPoolSummary | null>(null);

  useEffect(() => {
    let active = true;
    async function loadSummary(): Promise<void> {
      setLoading(true);
      try {
        const response = await fetch("/api/epoch/latest");
        const payload = (await response.json()) as EpochSummary | { error?: string };
        if (!response.ok || !("epochId" in payload)) {
          throw new Error("error" in payload ? payload.error : "Failed to load latest reward batch");
        }
        if (active) {
          setSummary(payload);
          setSelectedAddress(payload.addresses[0]?.address ?? "");
          setError("");
        }

        // Load agent pool in parallel
        const agentRes = await fetch("/api/agent/pool");
        if (agentRes.ok) {
          const agentPayload = (await agentRes.json()) as AgentPoolSummary;
          if (active) setAgentPool(agentPayload);
        }
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : "Unknown error");
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadSummary();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    async function loadStats(): Promise<void> {
      if (!selectedAddress) { setSelectedStats(null); return; }
      setStatsLoading(true);
      try {
        const response = await fetch(`/api/epoch/address/${encodeURIComponent(selectedAddress)}`);
        const payload = (await response.json()) as AddressStats | { error?: string };
        if (!response.ok || !("address" in payload)) {
          throw new Error("error" in payload ? payload.error : "Failed to load address stats");
        }
        if (active) setSelectedStats(payload);
      } catch (caught) {
        if (active) { setSelectedStats(null); setError(caught instanceof Error ? caught.message : "Unknown error"); }
      } finally {
        if (active) setStatsLoading(false);
      }
    }
    void loadStats();
    return () => { active = false; };
  }, [selectedAddress]);

  const generatedAt = useMemo(() => {
    if (!summary) return "";
    return new Date(summary.generatedAt).toLocaleString();
  }, [summary]);

  const holderCount   = summary?.addresses.length ?? 0;
  const avgReward     = useMemo(() => {
    if (!summary || summary.addresses.length === 0) return 0;
    return summary.addresses.reduce((a, x) => a + (x.netChange ?? 0), 0) / summary.addresses.length;
  }, [summary]);

  const treasuryAmount = summary?.closingBalance ?? 0;

  const TIER_STYLE: Record<string, { bg: string; color: string; label: string }> = {
    diamond:  { bg: "#ede9fe", color: "#7c3aed", label: "💎 Diamond" },
    gold:     { bg: "#fef9c3", color: "#92400e", label: "🥇 Gold" },
    silver:   { bg: "#f1f5f9", color: "#475569", label: "🥈 Silver" },
    bronze:   { bg: "#ffedd5", color: "#9a3412", label: "🥉 Bronze" },
    newcomer: { bg: "#f0fdf4", color: "#166534", label: "🌱 Newcomer" },
  };

  if (loading) {
    return (
      <main className="container">
        <div style={{ textAlign: "center", padding: "80px 0" }}>
          <div style={{ fontSize: "4rem", marginBottom: "16px", animation: "spin 2s linear infinite", display: "inline-block" }}>
            🌸
          </div>
          <p style={{ color: "var(--ink-soft)", fontWeight: 700, fontSize: "1.1rem" }}>
            Crunching your rewards...
          </p>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      </main>
    );
  }

  if (error || !summary) {
    return (
      <main className="container">
        <div style={{ textAlign: "center", padding: "80px 0" }}>
          <div style={{ fontSize: "3.5rem", marginBottom: "16px" }}>😢</div>
          <p style={{ color: "#e11d48", fontWeight: 700 }}>Oops! {error || "No reward data found."}</p>
        </div>
      </main>
    );
  }

  const poolDelta = summary.closingBalance - summary.openingBalance;

  return (
    <main className="container">

      {/* ── Header ── */}
      <header className="header">
        <div className="header-badge">
          <span>✨</span> Live Rewards
        </div>
        <h1>CLawback Rewards</h1>
        <p className="tagline">
          Every 10 minutes, a slice of creator rewards flows back to traders who need it most. No staking, no drama.
        </p>
      </header>

      {/* ── Hero Row ── */}
      <section className="hero-row">

        <article className="hero-card">
          <h2 className="hero-title">What is CLawback? 🐱</h2>
          <p className="hero-subtitle">
            CLawback scoops a portion of creator rewards and redistributes it as SOL refunds to holders who had a rough
            trading session. Think of it as a soft landing for bad days.
          </p>
          <div className="hero-pill-row">
            <span className="hero-pill">⏱ New epoch every 10 min</span>
            <span className="hero-pill">💰 Pure SOL payouts</span>
            <span className="hero-pill">🎉 No staking needed</span>
          </div>
          <p className="hero-footnote">
            To qualify: hold CLawback tokens above the minimum, have recent on-chain trades, and have taken some
            realized losses. Bigger losses + bigger bags = higher priority.
          </p>
        </article>

        <div className="hero-metrics">
          <div className="hero-metric-card">
            <div className="hero-metric-label">Current Epoch</div>
            <div className="hero-metric-value">#{summary.epochId}</div>
            <div className="hero-metric-chip">
              <span>🕐</span> {generatedAt}
            </div>
          </div>
          <div className="hero-metric-card">
            <div className="hero-metric-label">Drops every</div>
            <div className="hero-metric-value">10 min</div>
            <div className="hero-metric-chip">
              <span>🔄</span> Rolling windows
            </div>
          </div>
          <div className="hero-metric-card" style={{ borderColor: "rgba(16,185,129,0.3)", background: "var(--mint-lt)" }}>
            <div className="hero-metric-label">Pool Balance</div>
            <div className="hero-metric-value" style={{ color: "var(--mint)" }}>{solFormat(treasuryAmount)}</div>
            <div className="hero-metric-chip" style={{ background: "rgba(16,185,129,0.15)", color: "var(--mint)" }}>
              <span>💎</span> Ready to pay out
            </div>
          </div>
          <div className="hero-metric-card" style={{ borderColor: "rgba(236,72,153,0.3)", background: "var(--pink-lt)" }}>
            <div className="hero-metric-label">Active Wallets</div>
            <div className="hero-metric-value" style={{ color: "var(--pink)" }}>{numberFormat(holderCount)}</div>
            <div className="hero-metric-chip" style={{ background: "rgba(236,72,153,0.15)", color: "var(--pink)" }}>
              <span>👛</span> This epoch
            </div>
          </div>
        </div>

      </section>

      {/* ── Stat Cards ── */}
      <section className="grid" aria-label="Reward stats">
        <StatCard
          emoji="🏦"
          title="Reward Pool"
          label="SOL ready this epoch"
          value={solFormat(treasuryAmount)}
          valueColor="var(--purple)"
          accentColor="var(--purple)"
          body="The total SOL sitting in the CLawback treasury, waiting to flow out to eligible traders."
        />
        <StatCard
          emoji="👥"
          title="Holders in Batch"
          label="Unique wallets considered"
          value={numberFormat(holderCount)}
          accentColor="var(--pink)"
          body="Wallets we spotted with CLawback exposure and trading activity during this window."
        />
        <StatCard
          emoji="📈"
          title="Avg Reward"
          label="Per eligible address"
          value={solFormat(avgReward)}
          accentColor="var(--mint)"
          body="Mean SOL refund going out per qualifying wallet in this round."
        />
        <article className="card" style={{ borderTop: "4px solid var(--peach)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
            <span style={{ fontSize: "1.4rem" }}>📋</span>
            <div className="section-title" style={{ color: "var(--peach)", margin: 0 }}>Who Qualifies?</div>
          </div>
          <ul style={{ margin: "8px 0 0", paddingLeft: "20px", color: "var(--ink-soft)", fontSize: "0.9rem", lineHeight: 1.8 }}>
            <li>Holds CLawback above the minimum balance</li>
            <li>Has trades recorded in the epoch window</li>
            <li>Took realized losses (capped per-wallet)</li>
          </ul>
        </article>
      </section>

      {/* ── How it Works + Epoch Details ── */}
      <section className="grid" aria-label="How it works and epoch details">

        <article className="card">
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <span style={{ fontSize: "1.4rem" }}>🗺️</span>
            <div className="section-title" style={{ color: "var(--purple)", margin: 0 }}>How It Works</div>
          </div>
          <div className="how-grid">
            <div className="how-step">
              <div className="how-step-title">1. You trade normally</div>
              <div className="how-step-body">Just do your thing on-chain. Win some, lose some. We watch quietly in the background.</div>
            </div>
            <div className="how-step">
              <div className="how-step-title">2. Pool fills up</div>
              <div className="how-step-body">Creator rewards and fees trickle into the CLawback treasury every epoch.</div>
            </div>
            <div className="how-step">
              <div className="how-step-title">3. SOL goes out</div>
              <div className="how-step-body">Every ~10 min the accountant runs, scores every wallet, and pays out SOL automatically.</div>
            </div>
          </div>
        </article>

        <article className="card">
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
            <span style={{ fontSize: "1.4rem" }}>📊</span>
            <div className="section-title" style={{ color: "var(--pink)", margin: 0 }}>Epoch #{summary.epochId} Recap</div>
          </div>
          <div className="card-label">Pool Movement</div>
          <div className="card-value" style={{ color: poolDelta >= 0 ? "var(--mint)" : "#e11d48", fontSize: "1.3rem" }}>
            {poolDelta >= 0 ? "+" : ""}{solFormat(poolDelta)}
          </div>
          <p style={{ fontSize: "0.82rem", color: "var(--ink-muted)", margin: "4px 0 16px" }}>
            {solFormat(summary.openingBalance)} &rarr; {solFormat(summary.closingBalance)}
          </p>
          <div className="card-label">Activity Events</div>
          <div style={{ fontSize: "1.2rem", fontWeight: 800, marginTop: "4px", color: "var(--ink)" }}>
            {numberFormat(summary.activityCount)}
            <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--ink-muted)", marginLeft: "6px" }}>transactions</span>
          </div>
        </article>

      </section>

      {/* ── Agent Economy ── */}
      {agentPool && (
        <section style={{ marginBottom: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px" }}>
            <span style={{ fontSize: "1.6rem" }}>🤖</span>
            <div>
              <div style={{ fontSize: "0.72rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--pink)" }}>
                A2A Economy
              </div>
              <div style={{ fontSize: "1.2rem", fontWeight: 900, color: "var(--ink)" }}>Agent Reward Pool</div>
            </div>
            <a
              href="/skills/clawback-agent-skill.json"
              download
              style={{
                marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: "6px",
                padding: "8px 16px", borderRadius: "999px", border: "1.5px solid var(--purple)",
                color: "var(--purple)", background: "var(--purple-lt)", fontWeight: 800,
                fontSize: "0.82rem", textDecoration: "none", transition: "all 0.2s",
              }}
            >
              ⬇ Download Skill
            </a>
          </div>

          {/* Split bar */}
          <div className="card" style={{ marginBottom: "18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
              <span style={{ fontWeight: 800, fontSize: "0.9rem", color: "var(--ink-soft)" }}>Pool split this epoch</span>
              <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--ink-muted)" }}>
                {solFormat(agentPool.totalPoolSol)} total
              </span>
            </div>
            <div style={{ display: "flex", borderRadius: "99px", overflow: "hidden", height: "14px", marginBottom: "14px" }}>
              <div style={{ flex: 70, background: "linear-gradient(90deg, var(--purple), var(--pink))" }} title="70% holders & traders" />
              <div style={{ flex: 30, background: "linear-gradient(90deg, var(--mint), var(--sky))" }} title="30% agents" />
            </div>
            <div style={{ display: "flex", gap: "24px", fontSize: "0.85rem" }}>
              <div>
                <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "3px", background: "var(--purple)", marginRight: 6 }} />
                <strong>70%</strong> Holders &amp; Traders — {solFormat(agentPool.holderTraderAllocationSol)}
              </div>
              <div>
                <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "3px", background: "var(--mint)", marginRight: 6 }} />
                <strong>30%</strong> Agents — {solFormat(agentPool.agentAllocationSol)}
              </div>
            </div>
          </div>

          {/* Agent leaderboard */}
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div className="section-title" style={{ color: "var(--mint)", margin: 0 }}>
                Signal Leaderboard — Epoch #{agentPool.epochId}
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--ink-muted)", fontWeight: 600 }}>
                {agentPool.activeAgents} active agents &bull; {agentPool.totalSignalsThisEpoch} signals
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {agentPool.topAgents.map((agent, i) => {
                const tier = TIER_STYLE[agent.tier] ?? TIER_STYLE.newcomer;
                return (
                  <div key={agent.agentId} style={{
                    display: "flex", alignItems: "center", gap: "12px",
                    padding: "12px 14px", borderRadius: "14px",
                    background: i === 0 ? "linear-gradient(135deg, #f5f0ff, #fff0f9)" : "var(--bg)",
                    border: `1.5px solid ${i === 0 ? "rgba(168,85,247,0.3)" : "var(--line)"}`,
                  }}>
                    <div style={{ fontWeight: 900, fontSize: "1.1rem", color: "var(--ink-muted)", width: "24px", textAlign: "center" }}>
                      {i + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "var(--ink)" }}>{agent.displayName}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--ink-muted)" }}>
                        {agent.totalSignals} signals &bull; {(agent.avgAccuracy * 100).toFixed(0)}% accuracy
                      </div>
                    </div>
                    <div style={{ padding: "3px 10px", borderRadius: "999px", background: tier.bg, color: tier.color, fontSize: "0.72rem", fontWeight: 800 }}>
                      {tier.label}
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 900, fontSize: "0.95rem", color: "var(--purple)" }}>{agent.poolSharePct}%</div>
                      <div style={{ fontSize: "0.72rem", color: "var(--ink-muted)" }}>pool share</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 900, fontSize: "0.95rem", color: "var(--mint)" }}>{solFormat(agent.totalEarnedSol)}</div>
                      <div style={{ fontSize: "0.72rem", color: "var(--ink-muted)" }}>earned total</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <p style={{ margin: "16px 0 0", fontSize: "0.8rem", color: "var(--ink-muted)", lineHeight: 1.6 }}>
              Agents earn reputation by submitting accurate market signals each epoch. Bronze tier and above share the 30% agent allocation proportionally. Download the skill above to join.
            </p>
          </div>
        </section>
      )}

      {/* ── Wallet Lookup ── */}
      <section className="card" aria-label="Wallet lookup">
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
          <span style={{ fontSize: "1.4rem" }}>🔍</span>
          <div className="section-title" style={{ color: "var(--sky)", margin: 0 }}>Check a Wallet</div>
        </div>
        <p className="section-body">
          Pick any address below to see its SOL gains or losses this epoch. Full connect-and-claim is coming when CLawback goes live.
        </p>

        <label htmlFor="addressSelect" className="card-label" style={{ display: "block", marginTop: "16px" }}>
          Select Address
        </label>
        <select
          id="addressSelect"
          className="select"
          value={selectedAddress}
          onChange={(e) => setSelectedAddress(e.target.value)}
        >
          {summary.addresses.map((entry) => (
            <option key={entry.address} value={entry.address}>
              {shortAddress(entry.address)} — {solFormat(entry.netChange ?? 0)}
            </option>
          ))}
        </select>

        {statsLoading && (
          <div style={{ padding: "24px 0", textAlign: "center", color: "var(--ink-muted)", fontWeight: 700 }}>
            Loading... ✨
          </div>
        )}

        {!statsLoading && selectedStats && (
          <div className="statsRow">
            <div style={{
              background: "linear-gradient(135deg, var(--purple-lt), var(--pink-lt))",
              padding: "18px", borderRadius: "18px",
              border: "1.5px solid rgba(168,85,247,0.2)"
            }}>
              <div className="card-label" style={{ color: "var(--purple)" }}>Net SOL This Epoch</div>
              <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "var(--purple)", marginTop: "4px" }}>
                {solFormat(selectedStats.netChange)}
              </div>
            </div>
            <div style={{
              background: "linear-gradient(135deg, var(--sky-lt), var(--mint-lt))",
              padding: "18px", borderRadius: "18px",
              border: "1.5px solid rgba(56,189,248,0.2)"
            }}>
              <div className="card-label" style={{ color: "var(--sky)" }}>Trading Events</div>
              <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "var(--sky)", marginTop: "4px" }}>
                {numberFormat(selectedStats.activityCount)}
              </div>
            </div>
          </div>
        )}

        <p className="footer-note">
          🌱 This is a read-only preview of how refunds will look. When CLawback launches mainnet, connect your wallet here to claim SOL directly.
        </p>
      </section>

    </main>
  );
}
