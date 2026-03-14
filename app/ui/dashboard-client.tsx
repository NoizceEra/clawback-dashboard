"use client";

import { useEffect, useMemo, useState } from "react";
import type { AgentPoolSummary } from "../../types/agent";
import type {
  DistributionConfig,
  DistributionSummary
} from "../../types/distribution";
import type { AddressStats, EpochSummary } from "../../types/epoch";
import { IntelMarketplace } from "./intel-marketplace";

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

function percentageFormat(value: number): string {
  return `${numberFormat(value)}%`;
}

function StatCard({
  title,
  label,
  value,
  valueColor,
  body,
  accentColor,
}: {
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
      <div className="section-title" style={{ color: accentColor, margin: 0 }}>
        {title}
      </div>
      <div className="card-label">{label}</div>
      <div className="card-value" style={valueColor ? { color: valueColor } : {}}>
        {value}
      </div>
      {body && (
        <p className="section-body" style={{ marginTop: "10px" }}>
          {body}
        </p>
      )}
    </article>
  );
}

function ConfigField({
  label,
  value,
  step = 0.01,
  min = 0,
  onChange,
}: {
  label: string;
  value: number;
  step?: number;
  min?: number;
  onChange: (next: number) => void;
}) {
  return (
    <label style={{ display: "block" }}>
      <span className="card-label" style={{ display: "block", marginBottom: "6px" }}>
        {label}
      </span>
      <input
        className="admin-input"
        type="number"
        min={min}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

export function DashboardClient(): React.JSX.Element {
  const [summary, setSummary] = useState<EpochSummary | null>(null);
  const [distribution, setDistribution] = useState<DistributionSummary | null>(null);
  const [configDraft, setConfigDraft] = useState<DistributionConfig | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<string>("");
  const [selectedStats, setSelectedStats] = useState<AddressStats | null>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string>("");
  const [agentPool, setAgentPool] = useState<AgentPoolSummary | null>(null);

  useEffect(() => {
    let active = true;

    async function loadDashboard(): Promise<void> {
      setLoading(true);
      try {
        const [epochResponse, distributionResponse, agentResponse] = await Promise.all([
          fetch("/api/epoch/latest"),
          fetch("/api/distribution"),
          fetch("/api/agent/pool"),
        ]);

        const epochPayload = (await epochResponse.json()) as EpochSummary | { error?: string };
        const distributionPayload = (await distributionResponse.json()) as
          | DistributionSummary
          | { error?: string };
        const agentPayload = (await agentResponse.json()) as AgentPoolSummary | { error?: string };

        if (!epochResponse.ok || !("epochId" in epochPayload)) {
          throw new Error("error" in epochPayload ? epochPayload.error : "Failed to load epoch");
        }

        if (!distributionResponse.ok || !("pools" in distributionPayload)) {
          throw new Error(
            "error" in distributionPayload
              ? distributionPayload.error
              : "Failed to load distribution"
          );
        }

        if (active) {
          setSummary(epochPayload);
          setDistribution(distributionPayload);
          setConfigDraft(distributionPayload.config);
          setSelectedAddress(epochPayload.addresses[0]?.address ?? "");
          setError("");
          if (agentResponse.ok && "epochId" in agentPayload) {
            setAgentPool(agentPayload);
          }
        }
      } catch (caught) {
        if (active) {
          setError(caught instanceof Error ? caught.message : "Unknown error");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadDashboard();
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

  const holderCount = summary?.addresses.length ?? 0;
  const avgReward = useMemo(() => {
    if (!distribution || distribution.addresses.length === 0) return 0;
    return (
      distribution.addresses.reduce((total, address) => total + address.totalAllocationSol, 0) /
      distribution.addresses.length
    );
  }, [distribution]);

  const treasuryAmount = distribution?.pools.totalPoolSol ?? summary?.closingBalance ?? 0;
  const selectedDistribution = useMemo(() => {
    return distribution?.addresses.find((entry) => entry.address === selectedAddress) ?? null;
  }, [distribution, selectedAddress]);

  function updateAllocation(
    key: keyof DistributionConfig["allocation"],
    value: number
  ): void {
    setConfigDraft((current) =>
      current
        ? {
            ...current,
            allocation: {
              ...current.allocation,
              [key]: value,
            },
          }
        : current
    );
  }

  function updateHolderWeight(
    key: keyof DistributionConfig["holderWeights"],
    value: number
  ): void {
    setConfigDraft((current) =>
      current
        ? {
            ...current,
            holderWeights: {
              ...current.holderWeights,
              [key]: value,
            },
          }
        : current
    );
  }

  function updateTraderWeight(
    key: keyof DistributionConfig["traderWeights"],
    value: number
  ): void {
    setConfigDraft((current) =>
      current
        ? {
            ...current,
            traderWeights: {
              ...current.traderWeights,
              [key]: value,
            },
          }
        : current
    );
  }

  function updateAgentWeight(
    key: keyof DistributionConfig["agentWeights"],
    value: number
  ): void {
    setConfigDraft((current) =>
      current
        ? {
            ...current,
            agentWeights: {
              ...current.agentWeights,
              [key]: value,
            },
          }
        : current
    );
  }

  function updateEligibility(
    key: keyof DistributionConfig["eligibility"],
    value: number
  ): void {
    setConfigDraft((current) =>
      current
        ? {
            ...current,
            eligibility: {
              ...current.eligibility,
              [key]: value,
            },
          }
        : current
    );
  }

  async function saveDistributionConfig(): Promise<void> {
    if (!configDraft) return;

    setSavingConfig(true);
    setSaveMessage("");
    try {
      const response = await fetch("/api/distribution", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...configDraft,
          updatedBy: "dashboard-admin",
        }),
      });

      const payload = (await response.json()) as
        | DistributionSummary
        | { error?: string; details?: string };

      if (!response.ok || !("pools" in payload)) {
        throw new Error(
          "details" in payload && payload.details
            ? payload.details
            : "error" in payload && payload.error
              ? payload.error
              : "Failed to save config"
        );
      }

      setDistribution(payload);
      setConfigDraft(payload.config);
      setSaveMessage(`Saved ${new Date(payload.config.updatedAt).toLocaleTimeString()}.`);

      const refreshedAgentPool = await fetch("/api/agent/pool");
      if (refreshedAgentPool.ok) {
        const agentPayload = (await refreshedAgentPool.json()) as AgentPoolSummary;
        setAgentPool(agentPayload);
      }
    } catch (caught) {
      setSaveMessage(caught instanceof Error ? caught.message : "Failed to save config.");
    } finally {
      setSavingConfig(false);
    }
  }

  if (loading) {
    return (
      <main className="container">
        <div style={{ textAlign: "center", padding: "80px 0" }}>
          <p style={{ color: "var(--ink-soft)", fontWeight: 700, fontSize: "1.1rem" }}>
            Computing distribution preview...
          </p>
        </div>
      </main>
    );
  }

  if (error || !summary || !distribution || !configDraft) {
    return (
      <main className="container">
        <div style={{ textAlign: "center", padding: "80px 0" }}>
          <p style={{ color: "#e11d48", fontWeight: 700 }}>
            {error || "No distribution data found."}
          </p>
        </div>
      </main>
    );
  }

  const poolDelta = summary.closingBalance - summary.openingBalance;
  const allocationTotal =
    configDraft.allocation.holdersPct +
    configDraft.allocation.tradersPct +
    configDraft.allocation.agentsPct;

  return (
    <main className="container">
      <header className="header">
        <div className="header-badge">Live Rewards</div>
        <h1>$CLAWBACK Rewards</h1>
        <p className="tagline">
          The treasury rolls each epoch into an automatic distribution across holders, traders,
          and agents with parameters the operations team can tune from this dashboard.
        </p>
      </header>

      <section className="hero-row">
        <article className="hero-card">
          <h2 className="hero-title">Auto-allocation engine</h2>
          <p className="hero-subtitle">
            Each epoch uses the latest treasury snapshot, classifies eligible wallets, scores
            losses, balance, volume, and participation, then routes the pool across holders,
            traders, and agents.
          </p>
          <div className="hero-pill-row">
            <span className="hero-pill">Epoch #{summary.epochId}</span>
            <span className="hero-pill">{percentageFormat(configDraft.allocation.holdersPct)} holders</span>
            <span className="hero-pill">{percentageFormat(configDraft.allocation.tradersPct)} traders</span>
            <span className="hero-pill">{percentageFormat(configDraft.allocation.agentsPct)} agents</span>
          </div>
          <p className="hero-footnote">
            If one bucket has no eligible recipients, its share is rebalanced across the active
            categories so the full pool still gets allocated.
          </p>
        </article>

        <div className="hero-metrics">
          <div className="hero-metric-card">
            <div className="hero-metric-label">Current Epoch</div>
            <div className="hero-metric-value">#{summary.epochId}</div>
            <div className="hero-metric-chip">{generatedAt}</div>
          </div>
          <div className="hero-metric-card">
            <div className="hero-metric-label">Total Pool</div>
            <div className="hero-metric-value">{solFormat(treasuryAmount)}</div>
            <div className="hero-metric-chip">
              {distribution.pools.activeCategories.length > 0
                ? distribution.pools.activeCategories.join(" / ")
                : "no active categories"}
            </div>
          </div>
          <div
            className="hero-metric-card"
            style={{ borderColor: "rgba(16,185,129,0.3)", background: "var(--mint-lt)" }}
          >
            <div className="hero-metric-label">Addresses Scored</div>
            <div className="hero-metric-value" style={{ color: "var(--mint)" }}>
              {numberFormat(holderCount)}
            </div>
            <div
              className="hero-metric-chip"
              style={{ background: "rgba(16,185,129,0.15)", color: "var(--mint)" }}
            >
              {numberFormat(summary.activityCount)} events
            </div>
          </div>
          <div
            className="hero-metric-card"
            style={{ borderColor: "rgba(236,72,153,0.3)", background: "var(--pink-lt)" }}
          >
            <div className="hero-metric-label">Average Address Payout</div>
            <div className="hero-metric-value" style={{ color: "var(--pink)" }}>
              {solFormat(avgReward)}
            </div>
            <div
              className="hero-metric-chip"
              style={{ background: "rgba(236,72,153,0.15)", color: "var(--pink)" }}
            >
              live preview
            </div>
          </div>
        </div>
      </section>

      <section className="grid" aria-label="Distribution stats">
        <StatCard
          title="Configured Split"
          label="Holder / Trader / Agent"
          value={`${configDraft.allocation.holdersPct} / ${configDraft.allocation.tradersPct} / ${configDraft.allocation.agentsPct}`}
          valueColor="var(--purple)"
          accentColor="var(--purple)"
          body="Percentages are validated to 100% before the new settings are saved."
        />
        <StatCard
          title="Effective Split"
          label="Current active categories"
          value={`${solFormat(distribution.pools.effective.holders)} / ${solFormat(distribution.pools.effective.traders)} / ${solFormat(distribution.pools.effective.agents)}`}
          accentColor="var(--pink)"
          body="Inactive categories are temporarily rebalanced into the remaining buckets."
        />
        <StatCard
          title="Pool Delta"
          label="Treasury movement this epoch"
          value={`${poolDelta >= 0 ? "+" : ""}${solFormat(poolDelta)}`}
          valueColor={poolDelta >= 0 ? "var(--mint)" : "#e11d48"}
          accentColor="var(--mint)"
          body={`${solFormat(summary.openingBalance)} to ${solFormat(summary.closingBalance)}`}
        />
        <StatCard
          title="Signal Window"
          label="Agent scoring epoch"
          value={
            distribution.signalEpochUsed === null
              ? "No signals"
              : `Epoch ${distribution.signalEpochUsed}`
          }
          accentColor="var(--peach)"
          body="If signal epochs do not match the treasury epoch, the latest available signal window is used."
        />
      </section>

      <section className="grid" aria-label="How it works and epoch details">
        <article className="card">
          <div className="section-title" style={{ color: "var(--purple)", margin: 0 }}>
            Scoring Rules
          </div>
          <div className="how-grid">
            <div className="how-step">
              <div className="how-step-title">Holders</div>
              <div className="how-step-body">
                Score = balance * {configDraft.holderWeights.balance} + participation *{" "}
                {configDraft.holderWeights.participation}
              </div>
            </div>
            <div className="how-step">
              <div className="how-step-title">Traders</div>
              <div className="how-step-body">
                Score = losses * {configDraft.traderWeights.losses} + volume *{" "}
                {configDraft.traderWeights.volume} + participation *{" "}
                {configDraft.traderWeights.participation}
              </div>
            </div>
            <div className="how-step">
              <div className="how-step-title">Agents</div>
              <div className="how-step-body">
                Score = reputation * {configDraft.agentWeights.reputation} + accuracy *{" "}
                {configDraft.agentWeights.accuracy} + signals *{" "}
                {configDraft.agentWeights.signals}
              </div>
            </div>
          </div>
        </article>

        <article className="card">
          <div className="section-title" style={{ color: "var(--pink)", margin: 0 }}>
            Eligibility
          </div>
          <div className="section-body" style={{ marginTop: "12px" }}>
            Holders need at least {numberFormat(configDraft.eligibility.holderMinBalance)} net
            balance and {numberFormat(configDraft.eligibility.minActivityCount)} activity events.
            Traders need at least {numberFormat(configDraft.eligibility.traderMinLosses)} loss
            proxy and the same activity minimum. Agents need{" "}
            {numberFormat(configDraft.eligibility.agentMinSignals)} signals within the chosen
            signal window.
          </div>
        </article>
      </section>

      {agentPool && (
        <section style={{ marginBottom: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px" }}>
            <div>
              <div
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 900,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--pink)",
                }}
              >
                A2A Economy
              </div>
              <div style={{ fontSize: "1.2rem", fontWeight: 900, color: "var(--ink)" }}>
                Agent Pool Preview
              </div>
            </div>
            <a
              href="/skills/clawback-agent-skill.json"
              download
              style={{
                marginLeft: "auto",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 16px",
                borderRadius: "999px",
                border: "1.5px solid var(--purple)",
                color: "var(--purple)",
                background: "var(--purple-lt)",
                fontWeight: 800,
                fontSize: "0.82rem",
                textDecoration: "none",
                transition: "all 0.2s",
              }}
            >
              Download Skill
            </a>
          </div>

          <div className="card" style={{ marginBottom: "18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
              <span style={{ fontWeight: 800, fontSize: "0.9rem", color: "var(--ink-soft)" }}>
                Pool split this epoch
              </span>
              <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--ink-muted)" }}>
                {solFormat(agentPool.totalPoolSol)} total
              </span>
            </div>
            <div
              style={{
                display: "flex",
                borderRadius: "99px",
                overflow: "hidden",
                height: "14px",
                marginBottom: "14px",
              }}
            >
              <div
                style={{
                  flex: agentPool.holderTraderAllocationSol,
                  background: "linear-gradient(90deg, var(--purple), var(--pink))",
                }}
                title="holders and traders"
              />
              <div
                style={{
                  flex: agentPool.agentAllocationSol,
                  background: "linear-gradient(90deg, var(--mint), var(--sky))",
                }}
                title="agents"
              />
            </div>
            <div style={{ display: "flex", gap: "24px", fontSize: "0.85rem", flexWrap: "wrap" }}>
              <div>
                <strong>Holders + traders</strong> {solFormat(agentPool.holderTraderAllocationSol)}
              </div>
              <div>
                <strong>Agents</strong> {solFormat(agentPool.agentAllocationSol)}
              </div>
            </div>
          </div>

          <div className="card">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <div className="section-title" style={{ color: "var(--mint)", margin: 0 }}>
                Agent leaderboard
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--ink-muted)", fontWeight: 600 }}>
                {agentPool.activeAgents} active agents, {agentPool.totalSignalsThisEpoch} signals
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {distribution.agents.slice(0, 5).map((agent) => (
                <div
                  key={agent.agentId}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "12px 14px",
                    borderRadius: "14px",
                    background: "var(--bg)",
                    border: "1.5px solid var(--line)",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "var(--ink)" }}>
                      {agent.displayName}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--ink-muted)" }}>
                      {agent.metrics.signalsThisWindow} signals,{" "}
                      {(agent.metrics.avgAccuracy * 100).toFixed(0)}% accuracy
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 900, fontSize: "0.95rem", color: "var(--purple)" }}>
                      {solFormat(agent.allocationSol)}
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "var(--ink-muted)" }}>allocation</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {agentPool && <IntelMarketplace agents={agentPool.topAgents} holderId="holder_demo" />}

      <section className="admin-grid" aria-label="Distribution admin">
        <article className="card">
          <div className="section-title" style={{ color: "var(--sky)", margin: 0 }}>
            Payout Preview
          </div>
          <p className="section-body" style={{ marginTop: "10px" }}>
            Top wallet allocations from the current epoch preview.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "16px" }}>
            {distribution.addresses.slice(0, 5).map((entry) => (
              <div
                key={entry.address}
                className="payout-row"
                style={{
                  display: "grid",
                  gap: "10px",
                  alignItems: "center",
                  padding: "12px 14px",
                  borderRadius: "14px",
                  background: "var(--bg)",
                  border: "1.5px solid var(--line)",
                }}
              >
                <div style={{ fontWeight: 800, color: "var(--ink)" }}>{shortAddress(entry.address)}</div>
                <div>
                  <div className="card-label">Holder</div>
                  <div style={{ fontWeight: 800, color: "var(--purple)" }}>
                    {solFormat(entry.holderAllocationSol)}
                  </div>
                </div>
                <div>
                  <div className="card-label">Trader</div>
                  <div style={{ fontWeight: 800, color: "var(--pink)" }}>
                    {solFormat(entry.traderAllocationSol)}
                  </div>
                </div>
                <div>
                  <div className="card-label">Total</div>
                  <div style={{ fontWeight: 900, color: "var(--mint)" }}>
                    {solFormat(entry.totalAllocationSol)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="card">
          <div className="section-title" style={{ color: "var(--peach)", margin: 0 }}>
            Admin Controls
          </div>
          <p className="section-body" style={{ marginTop: "10px" }}>
            Update the allocation ratios and scoring weights, then save to persist them in the
            repo-backed JSON config.
          </p>

          <div className="admin-section">
            <div className="section-title" style={{ color: "var(--purple)" }}>
              Allocation Percentages
            </div>
            <div className="admin-form-grid">
              <ConfigField
                label="Holders %"
                value={configDraft.allocation.holdersPct}
                onChange={(value) => updateAllocation("holdersPct", value)}
              />
              <ConfigField
                label="Traders %"
                value={configDraft.allocation.tradersPct}
                onChange={(value) => updateAllocation("tradersPct", value)}
              />
              <ConfigField
                label="Agents %"
                value={configDraft.allocation.agentsPct}
                onChange={(value) => updateAllocation("agentsPct", value)}
              />
            </div>
            <p className="footer-note" style={{ marginTop: "12px", paddingTop: "12px" }}>
              Current total: {allocationTotal}%
            </p>
          </div>

          <div className="admin-section">
            <div className="section-title" style={{ color: "var(--pink)" }}>
              Holder And Trader Weights
            </div>
            <div className="admin-form-grid">
              <ConfigField
                label="Holder balance"
                value={configDraft.holderWeights.balance}
                onChange={(value) => updateHolderWeight("balance", value)}
              />
              <ConfigField
                label="Holder participation"
                value={configDraft.holderWeights.participation}
                onChange={(value) => updateHolderWeight("participation", value)}
              />
              <ConfigField
                label="Trader losses"
                value={configDraft.traderWeights.losses}
                onChange={(value) => updateTraderWeight("losses", value)}
              />
              <ConfigField
                label="Trader volume"
                value={configDraft.traderWeights.volume}
                onChange={(value) => updateTraderWeight("volume", value)}
              />
              <ConfigField
                label="Trader participation"
                value={configDraft.traderWeights.participation}
                onChange={(value) => updateTraderWeight("participation", value)}
              />
            </div>
          </div>

          <div className="admin-section">
            <div className="section-title" style={{ color: "var(--mint)" }}>
              Agent Weights And Thresholds
            </div>
            <div className="admin-form-grid">
              <ConfigField
                label="Agent reputation"
                value={configDraft.agentWeights.reputation}
                onChange={(value) => updateAgentWeight("reputation", value)}
              />
              <ConfigField
                label="Agent accuracy"
                value={configDraft.agentWeights.accuracy}
                onChange={(value) => updateAgentWeight("accuracy", value)}
              />
              <ConfigField
                label="Agent signals"
                value={configDraft.agentWeights.signals}
                onChange={(value) => updateAgentWeight("signals", value)}
              />
              <ConfigField
                label="Min holder balance"
                value={configDraft.eligibility.holderMinBalance}
                step={1}
                onChange={(value) => updateEligibility("holderMinBalance", value)}
              />
              <ConfigField
                label="Min trader losses"
                value={configDraft.eligibility.traderMinLosses}
                step={1}
                onChange={(value) => updateEligibility("traderMinLosses", value)}
              />
              <ConfigField
                label="Min activity count"
                value={configDraft.eligibility.minActivityCount}
                step={1}
                onChange={(value) => updateEligibility("minActivityCount", value)}
              />
              <ConfigField
                label="Min agent signals"
                value={configDraft.eligibility.agentMinSignals}
                step={1}
                onChange={(value) => updateEligibility("agentMinSignals", value)}
              />
              <ConfigField
                label="Agent epoch lookback"
                value={configDraft.eligibility.activeAgentEpochLookback}
                step={1}
                onChange={(value) => updateEligibility("activeAgentEpochLookback", value)}
              />
            </div>
          </div>

          {saveMessage && (
            <p
              style={{
                margin: "0 0 14px",
                fontWeight: 700,
                fontSize: "0.84rem",
                color: saveMessage.startsWith("Saved") ? "var(--mint)" : "#e11d48",
              }}
            >
              {saveMessage}
            </p>
          )}

          <button
            className="admin-button"
            onClick={() => void saveDistributionConfig()}
            disabled={savingConfig}
          >
            {savingConfig ? "Saving..." : "Save allocation parameters"}
          </button>
        </article>
      </section>

      <section className="card" aria-label="Wallet lookup">
        <div className="section-title" style={{ color: "var(--sky)", margin: 0 }}>
          Wallet Lookup
        </div>
        <p className="section-body" style={{ marginTop: "8px" }}>
          Inspect the raw epoch stats beside the allocation preview for any wallet in the current
          batch.
        </p>

        <label htmlFor="addressSelect" className="card-label" style={{ display: "block", marginTop: "16px" }}>
          Select Address
        </label>
        <select
          id="addressSelect"
          className="select"
          value={selectedAddress}
          onChange={(event) => setSelectedAddress(event.target.value)}
        >
          {summary.addresses.map((entry) => (
            <option key={entry.address} value={entry.address}>
              {shortAddress(entry.address)} - {solFormat(entry.netChange)}
            </option>
          ))}
        </select>

        {statsLoading && (
          <div
            style={{
              padding: "24px 0",
              textAlign: "center",
              color: "var(--ink-muted)",
              fontWeight: 700,
            }}
          >
            Loading wallet metrics...
          </div>
        )}

        {!statsLoading && selectedStats && selectedDistribution && (
          <div className="statsRow">
            <div
              style={{
                background: "linear-gradient(135deg, var(--purple-lt), var(--pink-lt))",
                padding: "18px",
                borderRadius: "18px",
                border: "1.5px solid rgba(168,85,247,0.2)",
              }}
            >
              <div className="card-label" style={{ color: "var(--purple)" }}>
                Total Allocation
              </div>
              <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "var(--purple)", marginTop: "4px" }}>
                {solFormat(selectedDistribution.totalAllocationSol)}
              </div>
            </div>
            <div
              style={{
                background: "linear-gradient(135deg, var(--sky-lt), var(--mint-lt))",
                padding: "18px",
                borderRadius: "18px",
                border: "1.5px solid rgba(56,189,248,0.2)",
              }}
            >
              <div className="card-label" style={{ color: "var(--sky)" }}>
                Loss / Volume / Participation
              </div>
              <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--sky)", marginTop: "6px" }}>
                {numberFormat(selectedDistribution.metrics.losses)} /{" "}
                {numberFormat(selectedDistribution.metrics.volume)} /{" "}
                {numberFormat(selectedDistribution.metrics.participation)}
              </div>
            </div>
            <div
              style={{
                background: "linear-gradient(135deg, var(--mint-lt), var(--sky-lt))",
                padding: "18px",
                borderRadius: "18px",
                border: "1.5px solid rgba(16,185,129,0.2)",
              }}
            >
              <div className="card-label" style={{ color: "var(--mint)" }}>
                Holder / Trader Breakdown
              </div>
              <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--mint)", marginTop: "6px" }}>
                {solFormat(selectedDistribution.holderAllocationSol)} /{" "}
                {solFormat(selectedDistribution.traderAllocationSol)}
              </div>
            </div>
            <div
              style={{
                background: "linear-gradient(135deg, var(--peach-lt), var(--pink-lt))",
                padding: "18px",
                borderRadius: "18px",
                border: "1.5px solid rgba(251,146,60,0.2)",
              }}
            >
              <div className="card-label" style={{ color: "var(--peach)" }}>
                Net Epoch Change
              </div>
              <div style={{ fontSize: "1.1rem", fontWeight: 900, color: "var(--peach)", marginTop: "4px" }}>
                {solFormat(selectedStats.netChange)}
              </div>
            </div>
          </div>
        )}

        <p className="footer-note">
          Preview values are derived directly from the latest epoch summary and the current
          distribution config saved in <code>data/distribution-config.json</code>.
        </p>
      </section>
    </main>
  );
}
