# CLAWBACK Distribution Spec (v1)

Design for off-chain, epoch-based SOL refund distributions for the $CLAWBACK Pool.

## 1. High-Level

Every epoch (e.g. every 10 minutes):

1. Creator rewards stream into a treasury wallet.
2. A small platform fee is skimmed from creator rewards (5–10%) to fund operations and development.
3. The remaining SOL becomes the epoch refund pool.
4. The Accountant script computes per-address scores based on:
   - Realized losses in the epoch.
   - $CLAWBACK token holdings (size + persistence).
5. The net pool is split proportionally by scores.
6. A payout file is generated and used to send actual transfers.

In v1 this logic lives entirely off-chain (Node/TypeScript script + cron), with no custom Solana program.

## 2. Platform Fee (Creator Reward Skim)

- `CREATOR_REWARD_FEE_BPS` (basis points) controls the platform cut from raw creator rewards.
  - Example: `500` (5%) to `1000` (10%).
- Flow per funding event:

```text
R_total = raw creator rewards received (SOL)
R_fee   = R_total * (CREATOR_REWARD_FEE_BPS / 10_000)
R_pool  = R_total - R_fee
```

- `R_fee` is retained by the platform treasury for ops/dev.
- `R_pool` is what the Accountant treats as `pool_size` for the epoch.

The dashboard and Accountant should both treat `pool_size` as **net after creator skim**.

## 3. Future (Optional) Claim-Time Fee (v2+)

Not active in v1, but planned for after launch:

- Small claim-time fee (e.g. 1%) on **large payouts only** (for example, payouts > 1 SOL).
- Small refunds (dust) remain fee-free.

Sketch:

```text
if reward_i > CLAIM_FEE_THRESHOLD_SOL:
    claim_fee_i = reward_i * CLAIM_FEE_BPS / 10_000
    reward_net_i = reward_i - claim_fee_i
else:
    claim_fee_i = 0
    reward_net_i = reward_i
```

This keeps the experience smooth for most users while letting big payouts contribute a bit more to platform sustainability.

---

(Sections 4–7 from the previous spec remain the same: inputs, scoring formula, payout formula, Accountant responsibilities, automation, and future on-chain version.)
