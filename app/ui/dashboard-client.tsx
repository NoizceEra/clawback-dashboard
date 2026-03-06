"use client";

import { useEffect, useMemo, useState } from "react";
import type { AddressStats, EpochSummary } from "../../types/epoch";

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

export function DashboardClient(): React.JSX.Element {
  const [summary, setSummary] = useState<EpochSummary | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<string>("");
  const [selectedStats, setSelectedStats] = useState<AddressStats | null>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);

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
      } catch (caught) {
        if (active) {
          setError(caught instanceof Error ? caught.message : "Unknown error");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadSummary();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadStats(): Promise<void> {
      if (!selectedAddress) {
        setSelectedStats(null);
        return;
      }

      setStatsLoading(true);
      try {
        const response = await fetch(`/api/epoch/address/${encodeURIComponent(selectedAddress)}`);
        const payload = (await response.json()) as AddressStats | { error?: string };

        if (!response.ok || !("address" in payload)) {
          throw new Error("error" in payload ? payload.error : "Failed to load address stats");
        }

        if (active) setSelectedStats(payload);
      } catch (caught) {
        if (active) {
          setSelectedStats(null);
          setError(caught instanceof Error ? caught.message : "Unknown error");
        }
      } finally {
        if (active) setStatsLoading(false);
      }
    }

    void loadStats();
    return () => {
      active = false;
    };
  }, [selectedAddress]);

  const generatedAt = useMemo(() => {
    if (!summary) return "";
    return new Date(summary.generatedAt).toLocaleString();
  }, [summary]);

  const holderCount = useMemo(() => {
    return summary?.addresses.length ?? 0;
  }, [summary]);

  const avgReward = useMemo(() => {
    if (!summary || summary.addresses.length === 0) return 0;
    const totalNet = summary.addresses.reduce((acc, addr) => acc + (addr.netChange ?? 0), 0);
    return totalNet / summary.addresses.length;
  }, [summary]);

  const treasuryAmount = summary?.closingBalance ?? 0;
  const nextDistributionLabel = "Every 10 minutes";

  if (loading) {
    return (
      <main className="container">
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <div style={{ fontSize: "48px", marginBottom: "20px" }}>⏳</div>
          <p style={{ color: "var(--ink-muted)", fontSize: "1.1rem" }}>Loading CLawback Dashboard...</p>
        </div>
      </main>
    );
  }

  if (error || !summary) {
    return (
      <main className="container">
        <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--danger)" }}>
          <div style={{ fontSize: "48px", marginBottom: "20px" }}>⚠️</div>
          <p style={{ fontSize: "1.1rem" }}>Error: {error || "No reward data found."}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="container">
      <header className="header">
        <h1>CLawback Rewards Dashboard</h1>
        <p className="tagline">Real-time insights into creator reward distributions and clawback pools updated every epoch.</p>
      </header>

      <section className="hero-row">
        <article className="hero-card">
          <h2 className="hero-title">How CLawback Works</h2>
          <p className="hero-subtitle">
            A portion of creator rewards flows back to traders who experienced losses in previous trades. Every epoch, SOL payouts are distributed based on holdings and trading activity.
          </p>
          <div className="hero-pill-row">
            <span className="hero-pill">New reward epoch every 10 minutes</span>
            <span className="hero-pill">SOL payouts only</span>
            <span className="hero-pill">No staking required</span>
          </div>
          <p className="hero-footnote">
            Eligibility requires: (1) CLawback holdings and (2) recent trading activity. Larger losses and holdings increase your priority in the distribution queue.
          </p>
        </article>

        <article className="hero-metrics">
          <div className="hero-metric-card">
            <div className="hero-metric-label">Current Epoch</div>
            <div className="hero-metric-value">#{summary.epochId}</div>
            <div className="hero-metric-chip">Last updated {generatedAt}</div>
          </div>
          <div className="hero-metric-card">
            <div className="hero-metric-label">Distribution Frequency</div>
            <div className="hero-metric-value">{nextDistributionLabel}</div>
            <div className="hero-metric-chip">Streaming rewards in rolling windows</div>
          </div>
        </article>
      </section>

      <section className="grid" aria-label="Reward overview stats">
        <article className="card">
          <div className="section-title">Reward Pool</div>
          <div className="card-label">SOL Available This Epoch</div>
          <div className="card-value-accent">{solFormat(treasuryAmount)}</div>
          <p className="section-body">
            Total SOL currently in the CLawback pool ready for distribution to eligible traders.
          </p>
        </article>

        <article className="card">
          <div className="section-title">Active Holders</div>
          <div className="card-label">Addresses in This Batch</div>
          <div className="card-value">{numberFormat(holderCount)}</div>
          <p className="section-body">
            Unique wallets identified with CLawback exposure and trading activity in this epoch.
          </p>
        </article>

        <article className="card">
          <div className="section-title">Average Reward</div>
          <div className="card-label">Per Eligible Address</div>
          <div className="card-value">{solFormat(avgReward)}</div>
          <p className="section-body">
            Average SOL refund amount per wallet in this reward distribution epoch.
          </p>
        </article>

        <article className="card">
          <div className="section-title">Eligibility Criteria</div>
          <div className="section-body">
            <ul style={{ paddingLeft: 18, margin: "8px 0" }}>
              <li>Holds CLawback above minimum balance threshold</li>
              <li>Recent trading activity during epoch window</li>
              <li>Realized losses within tracking period</li>
            </ul>
          </div>
        </article>
      </section>

      <section className="grid" aria-label="How it works and epoch details">
        <article className="card">
          <div className="section-title">Distribution Flow</div>
          <div className="how-grid">
            <div className="how-step">
              <div className="how-step-title">1. On-Chain Trading</div>
              <div className="how-step-body">Users trade normally. Trading outcomes are monitored continuously.</div>
            </div>
            <div className="how-step">
              <div className="how-step-title">2. Pool Accumulation</div>
              <div className="how-step-body">Creator rewards and fees accumulate in the CLawback treasury.</div>
            </div>
            <div className="how-step">
              <div className="how-step-title">3. Distribution</div>
              <div className="how-step-body">Every 10 minutes, the accountant calculates and distributes eligible refunds.</div>
            </div>
          </div>
        </article>

        <article className="card">
          <div className="section-title">Current Epoch Summary</div>
          <p className="card-label">Pool Balance Movement</p>
          <p className="card-value" style={{ marginTop: "8px" }}>
            <span style={{ color: "var(--info)" }}>
              {summary.closingBalance > summary.openingBalance ? "+" : ""}
              {solFormat(summary.closingBalance - summary.openingBalance)}
            </span>
          </p>
          <p style={{ fontSize: "0.85rem", color: "var(--ink-muted)", margin: "6px 0" }}>
            {solFormat(summary.openingBalance)} {"->"} {solFormat(summary.closingBalance)}
          </p>
          <p className="card-label" style={{ marginTop: 12 }}>Total Activity Events</p>
          <p className="section-body">{numberFormat(summary.activityCount)} recorded transactions</p>
        </article>
      </section>

      <section className="card" aria-label="Address lookup">
        <div className="section-title">Address Lookup</div>
        <p className="section-body">
          Select or paste a wallet address to view its SOL gains/losses in this epoch and activity metrics.
        </p>

        <label htmlFor="addressSelect" className="card-label" style={{ display: "block", marginTop: "16px" }}>
          Select Wallet Address
        </label>
        <select
          id="addressSelect"
          className="select"
          value={selectedAddress}
          onChange={(event) => setSelectedAddress(event.target.value)}
        >
          {summary.addresses.map((entry) => (
            <option key={entry.address} value={entry.address}>
              {shortAddress(entry.address)} ({solFormat(entry.netChange ?? 0)})
            </option>
          ))}
        </select>

        {statsLoading && (
          <div style={{ textAlign: "center", padding: "20px", opacity: 0.7 }}>
            <p className="section-body">Loading address stats...</p>
          </div>
        )}
        {!statsLoading && selectedStats && (
          <div className="statsRow" style={{ marginTop: "24px" }}>
            <div style={{ background: "rgba(0, 217, 255, 0.05)", padding: "16px", borderRadius: "12px", border: "1px solid rgba(0, 217, 255, 0.2)" }}>
              <span className="card-label">Net SOL This Epoch</span>
              <br />
              <span className="card-value-accent">{solFormat(selectedStats.netChange)}</span>
            </div>
            <div style={{ background: "rgba(59, 130, 246, 0.05)", padding: "16px", borderRadius: "12px", border: "1px solid rgba(59, 130, 246, 0.2)" }}>
              <span className="card-label">Trading Events</span>
              <br />
              <span className="card-value">{numberFormat(selectedStats.activityCount)}</span>
            </div>
          </div>
        )}

        <p className="footer-note">
          This dashboard displays a read-only view of reward calculations. When CLawback launches mainnet, users will be able to connect wallets and claim refunds directly from this interface.
        </p>
      </section>
    </main>
  );
}