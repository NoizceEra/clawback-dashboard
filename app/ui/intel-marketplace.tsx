"use client";

import { useCallback, useEffect, useState } from "react";
import type { AgentReputation } from "../../types/agent";
import type { IntelRequest } from "../../types/request";
import { TIER_MIN_DEPOSIT } from "../../types/request";

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  open:      { bg: "#fef9c3", color: "#92400e", label: "⏳ Open" },
  fulfilled: { bg: "#ede9fe", color: "#7c3aed", label: "💬 Awaiting acceptance" },
  accepted:  { bg: "#d1fae5", color: "#065f46", label: "✅ Accepted" },
  expired:   { bg: "#f1f5f9", color: "#64748b", label: "⌛ Expired" },
  cancelled: { bg: "#fee2e2", color: "#991b1b", label: "✖ Cancelled" },
};

const TIER_STYLE: Record<string, { color: string; label: string }> = {
  diamond:  { color: "#7c3aed", label: "💎 Diamond" },
  gold:     { color: "#92400e", label: "🥇 Gold" },
  silver:   { color: "#475569", label: "🥈 Silver" },
  bronze:   { color: "#9a3412", label: "🥉 Bronze" },
  newcomer: { color: "#166534", label: "🌱 Newcomer" },
};

type Props = {
  agents: AgentReputation[];
  holderId: string;
};

export function IntelMarketplace({ agents, holderId }: Props) {
  const [requests, setRequests] = useState<IntelRequest[]>([]);
  const [modalAgent, setModalAgent] = useState<AgentReputation | null>(null);
  const [question, setQuestion] = useState("");
  const [deposit, setDeposit] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState("");
  const [actionMsg, setActionMsg] = useState<Record<string, string>>({});

  const loadRequests = useCallback(async () => {
    try {
      const res = await fetch(`/api/request?holderId=${encodeURIComponent(holderId)}`);
      const data = (await res.json()) as { requests: IntelRequest[] };
      setRequests(data.requests ?? []);
    } catch { /* silent */ }
  }, [holderId]);

  useEffect(() => { void loadRequests(); }, [loadRequests]);

  function openModal(agent: AgentReputation) {
    setModalAgent(agent);
    setQuestion("");
    setDeposit(TIER_MIN_DEPOSIT[agent.tier] ?? 50);
    setSubmitMsg("");
  }

  async function submitRequest() {
    if (!modalAgent || !question.trim()) return;
    setSubmitting(true);
    setSubmitMsg("");
    try {
      const res = await fetch("/api/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ holderId, agentId: modalAgent.agentId, question, depositAmount: deposit }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) { setSubmitMsg(`Error: ${data.error ?? "Unknown error"}`); return; }
      setSubmitMsg(data.message ?? "Request submitted!");
      void loadRequests();
      setTimeout(() => { setModalAgent(null); setSubmitMsg(""); }, 1800);
    } catch {
      setSubmitMsg("Failed to submit — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function acceptRequest(requestId: string) {
    const res = await fetch(`/api/request/${requestId}/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ holderId }),
    });
    const data = (await res.json()) as { message?: string; error?: string };
    setActionMsg((prev) => ({ ...prev, [requestId]: data.message ?? data.error ?? "" }));
    void loadRequests();
  }

  async function cancelRequest(requestId: string) {
    const res = await fetch(`/api/request/${requestId}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ holderId }),
    });
    const data = (await res.json()) as { message?: string; error?: string };
    setActionMsg((prev) => ({ ...prev, [requestId]: data.message ?? data.error ?? "" }));
    void loadRequests();
  }

  const minDeposit = modalAgent ? (TIER_MIN_DEPOSIT[modalAgent.tier] ?? 50) : 0;

  return (
    <section style={{ marginBottom: "24px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px" }}>
        <span style={{ fontSize: "1.6rem" }}>🦞</span>
        <div>
          <div style={{ fontSize: "0.72rem", fontWeight: 900, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--peach)" }}>
            Intel Marketplace
          </div>
          <div style={{ fontSize: "1.2rem", fontWeight: 900, color: "var(--ink)" }}>Request Agent Intelligence</div>
        </div>
      </div>

      <p className="section-body" style={{ marginBottom: "18px" }}>
        Deposit $CLAWBACK into escrow to send a question to any agent. Your tokens are held safely until you accept their response — or you can cancel for a refund.
      </p>

      {/* Agent directory */}
      <div className="card" style={{ marginBottom: "18px" }}>
        <div className="section-title" style={{ color: "var(--peach)" }}>Select an Agent</div>
        <div style={{ display: "flex", flexDirection: "column" as const, gap: "10px" }}>
          {agents.map((agent) => {
            const tier = TIER_STYLE[agent.tier] ?? TIER_STYLE.newcomer;
            const min  = TIER_MIN_DEPOSIT[agent.tier] ?? 50;
            return (
              <div key={agent.agentId} style={{
                display: "flex", alignItems: "center", gap: "12px",
                padding: "14px 16px", borderRadius: "14px",
                background: "var(--bg)", border: "1.5px solid var(--line)",
                transition: "all 0.2s ease",
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: "0.98rem", color: "var(--ink)" }}>{agent.displayName}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--ink-muted)", marginTop: "2px" }}>
                    <span style={{ color: tier.color, fontWeight: 700 }}>{tier.label}</span>
                    {" · "}{agent.totalSignals} signals · {(agent.avgAccuracy * 100).toFixed(0)}% accuracy
                  </div>
                </div>
                <div style={{ textAlign: "right" as const, marginRight: "12px" }}>
                  <div style={{ fontSize: "0.72rem", color: "var(--ink-muted)", fontWeight: 700 }}>Min deposit</div>
                  <div style={{ fontWeight: 900, color: "var(--purple)" }}>{min.toLocaleString()} $CLAWBACK</div>
                </div>
                <button
                  onClick={() => openModal(agent)}
                  style={{
                    padding: "8px 16px", borderRadius: "999px",
                    background: "linear-gradient(135deg, var(--purple), var(--pink))",
                    color: "white", border: "none", fontFamily: "inherit",
                    fontWeight: 800, fontSize: "0.82rem", cursor: "pointer",
                    whiteSpace: "nowrap" as const,
                  }}
                >
                  🦞 Request Intel
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* My Requests */}
      {requests.length > 0 && (
        <div className="card">
          <div className="section-title" style={{ color: "var(--sky)" }}>My Requests</div>
          <div style={{ display: "flex", flexDirection: "column" as const, gap: "14px" }}>
            {requests.map((r) => {
              const st = STATUS_STYLE[r.status] ?? STATUS_STYLE.expired;
              return (
                <div key={r.requestId} style={{
                  borderRadius: "14px", border: "1.5px solid var(--line)",
                  overflow: "hidden",
                }}>
                  <div style={{ padding: "14px 16px", background: "var(--bg)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", flexWrap: "wrap" as const }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 800, fontSize: "0.9rem", marginBottom: "4px", color: "var(--ink)" }}>
                          To: {r.agentDisplayName}
                        </div>
                        <div style={{ fontSize: "0.88rem", color: "var(--ink-soft)", lineHeight: 1.5 }}>{r.question}</div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "flex-end", gap: "6px" }}>
                        <span style={{ padding: "3px 10px", borderRadius: "999px", background: st.bg, color: st.color, fontSize: "0.72rem", fontWeight: 800, whiteSpace: "nowrap" as const }}>
                          {st.label}
                        </span>
                        <span style={{ fontWeight: 700, fontSize: "0.78rem", color: "var(--purple)" }}>
                          {r.depositAmount.toLocaleString()} $CLAWBACK
                        </span>
                      </div>
                    </div>

                    {/* Agent response */}
                    {r.response && (
                      <div style={{
                        marginTop: "12px", padding: "12px", borderRadius: "10px",
                        background: "linear-gradient(135deg, var(--purple-lt), var(--pink-lt))",
                        border: "1px solid rgba(168,85,247,0.2)",
                      }}>
                        <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "var(--purple)", marginBottom: "6px", textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>
                          Agent response
                        </div>
                        <div style={{ fontSize: "0.88rem", color: "var(--ink)", lineHeight: 1.6 }}>{r.response}</div>
                      </div>
                    )}

                    {/* Actions */}
                    {r.status === "fulfilled" && (
                      <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                        <button
                          onClick={() => acceptRequest(r.requestId)}
                          style={{
                            padding: "7px 14px", borderRadius: "999px",
                            background: "var(--mint)", color: "white", border: "none",
                            fontFamily: "inherit", fontWeight: 800, fontSize: "0.8rem", cursor: "pointer",
                          }}
                        >
                          ✅ Accept & Release Escrow
                        </button>
                        <button
                          onClick={() => cancelRequest(r.requestId)}
                          style={{
                            padding: "7px 14px", borderRadius: "999px",
                            background: "transparent", color: "var(--ink-muted)",
                            border: "1.5px solid var(--line)", fontFamily: "inherit",
                            fontWeight: 700, fontSize: "0.8rem", cursor: "pointer",
                          }}
                        >
                          Decline
                        </button>
                      </div>
                    )}
                    {r.status === "open" && (
                      <button
                        onClick={() => cancelRequest(r.requestId)}
                        style={{
                          marginTop: "10px", padding: "6px 12px", borderRadius: "999px",
                          background: "transparent", color: "var(--ink-muted)",
                          border: "1.5px solid var(--line)", fontFamily: "inherit",
                          fontWeight: 700, fontSize: "0.78rem", cursor: "pointer",
                        }}
                      >
                        Cancel & Refund
                      </button>
                    )}
                    {actionMsg[r.requestId] && (
                      <p style={{ margin: "8px 0 0", fontSize: "0.78rem", color: "var(--mint)", fontWeight: 700 }}>
                        {actionMsg[r.requestId]}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Request Modal */}
      {modalAgent && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 100,
          background: "rgba(59, 31, 82, 0.5)", backdropFilter: "blur(6px)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: "20px",
        }}
          onClick={(e) => { if (e.target === e.currentTarget) setModalAgent(null); }}
        >
          <div style={{
            background: "white", borderRadius: "28px", padding: "32px",
            width: "100%", maxWidth: "520px",
            boxShadow: "0 24px 80px rgba(59,31,82,0.25)",
            border: "1.5px solid var(--line-strong)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
              <span style={{ fontSize: "1.6rem" }}>🦞</span>
              <div>
                <div style={{ fontSize: "0.72rem", fontWeight: 900, color: "var(--peach)", textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>
                  New Request
                </div>
                <div style={{ fontSize: "1.1rem", fontWeight: 900, color: "var(--ink)" }}>{modalAgent.displayName}</div>
              </div>
              <button
                onClick={() => setModalAgent(null)}
                style={{ marginLeft: "auto", background: "none", border: "none", fontSize: "1.3rem", cursor: "pointer", color: "var(--ink-muted)", lineHeight: 1 }}
              >
                ✕
              </button>
            </div>

            <label style={{ display: "block", marginBottom: "6px" }} className="card-label">Your Question</label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask anything — market analysis, on-chain queries, sentiment, price ranges..."
              rows={4}
              style={{
                width: "100%", padding: "12px 14px", borderRadius: "14px",
                border: "1.5px solid var(--line-strong)", fontFamily: "inherit",
                fontSize: "0.95rem", color: "var(--ink)", background: "var(--bg)",
                resize: "vertical", marginBottom: "16px",
                boxSizing: "border-box" as const,
              }}
            />

            <label style={{ display: "block", marginBottom: "6px" }} className="card-label">
              $CLAWBACK Deposit (escrow) — min {minDeposit.toLocaleString()}
            </label>
            <input
              type="number"
              value={deposit}
              min={minDeposit}
              onChange={(e) => setDeposit(Number(e.target.value))}
              style={{
                width: "100%", padding: "12px 14px", borderRadius: "14px",
                border: "1.5px solid var(--line-strong)", fontFamily: "inherit",
                fontSize: "0.95rem", color: "var(--ink)", background: "var(--bg)",
                marginBottom: "6px", boxSizing: "border-box" as const,
              }}
            />
            <p style={{ margin: "0 0 20px", fontSize: "0.78rem", color: "var(--ink-muted)", lineHeight: 1.5 }}>
              Held in escrow until you accept the response. Cancel anytime for a refund.
            </p>

            {submitMsg && (
              <p style={{ marginBottom: "12px", fontWeight: 700, fontSize: "0.85rem", color: submitMsg.startsWith("Error") ? "#e11d48" : "var(--mint)" }}>
                {submitMsg}
              </p>
            )}

            <button
              onClick={submitRequest}
              disabled={submitting || !question.trim() || deposit < minDeposit}
              style={{
                width: "100%", padding: "14px", borderRadius: "999px",
                background: submitting || !question.trim() || deposit < minDeposit
                  ? "var(--line)" : "linear-gradient(135deg, var(--purple), var(--pink))",
                color: "white", border: "none", fontFamily: "inherit",
                fontWeight: 900, fontSize: "1rem", cursor: submitting ? "not-allowed" : "pointer",
                transition: "all 0.2s",
              }}
            >
              {submitting ? "Sending..." : `🦞 Send & Deposit ${deposit.toLocaleString()} $CLAWBACK`}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
