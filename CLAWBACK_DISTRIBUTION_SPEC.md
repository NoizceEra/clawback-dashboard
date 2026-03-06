# CLAWBACK Distribution Spec (v1)

Design for off-chain, epoch-based refund distributions for the CLawback Pool.

## 1. High-Level

Every epoch (e.g. weekly):

1. Treasury wallet accumulates funds (creator rewards, external top-ups, etc.).
2. Accountant script computes per-address scores based on:
   - Realized losses in the epoch.
   - CLawback token holdings (size + persistence).
3. Pool `P` for the epoch is split proportionally by scores.
4. A payout file is generated and used to send actual transfers.

This is **off-chain logic** in v1 (Node/TypeScript script + cron), with no custom Solana program.

## 2. Inputs per Epoch

### 2.1 Global

- `epoch_id`: string (e.g. `"2026-03-09-w1"`).
- `epoch_start`: ISO timestamp.
- `epoch_end`: ISO timestamp.
- `pool_size`: number (total amount available for this epoch, e.g. in SOL or USDC).
- `loss_cap`: number (max loss counted per address for scoring).

### 2.2 Per Address `i`

For each participating wallet address `addr_i`:

- `loss_i`: realized loss during the epoch (same asset as pool, e.g. SOL/USDC).
- `hold_i`: average CLawback token balance during the epoch.
- Optional:
  - `hold_days_i`: number of days address held >= some minimum balance.
  - `volume_i`: optional trading volume metric (for future use).

These can initially come from:
- Local CSV/JSON exports (sample data).
- Later: RPC queries + off-chain logs.

## 3. Scoring Formula

For each address `i`:

1. **Capped loss**

```text
capped_loss_i = min(loss_i, loss_cap)
```

2. **Holding weight**

A function of average CLawback holdings.

Example tiered weighting (tweak as needed):

```text
if hold_i < H_MIN:          holding_weight_i = 0
else if hold_i < H_MED:     holding_weight_i = 1.0
else if hold_i < H_HIGH:    holding_weight_i = 1.25
else:                       holding_weight_i = 1.5
```

Where:
- `H_MIN`  = minimum CLawback balance to be eligible.
- `H_MED`  = mid-tier threshold.
- `H_HIGH` = high-tier threshold.

3. **Score**

```text
score_i = capped_loss_i * holding_weight_i
```

4. **Total score**

```text
S = sum(score_i for all i with score_i > 0)
```

If `S == 0`, no distribution for this epoch.

## 4. Payout Formula

Given epoch pool `P` (e.g. total SOL/USDC available to refund):

```text
reward_i = (score_i / S) * P
```

Optionally cap per-address refund as a fraction of `loss_i`:

```text
max_refund_ratio = 0.5  # e.g. cannot refund more than 50% of losses
reward_i = min(reward_i, loss_i * max_refund_ratio)
```

## 5. Accountant Script Responsibilities

Script (e.g. `scripts/computeEpoch.ts`) should:

1. Read configuration:
   - From `.env` or config file:
     - `EPOCH_LENGTH_DAYS`
     - `H_MIN`, `H_MED`, `H_HIGH`
     - `LOSS_CAP`
     - `MAX_REFUND_RATIO`
     - `POOL_SIZE` (for now from config; later from treasury balance).

2. Load activity data:
   - From `data/activity.sample.json` or a real data source later.
   - Normalize into per-address `loss_i`, `hold_i`, and other metrics.

3. Compute:
   - `score_i` for all addresses.
   - `S` (total score).
   - `reward_i` for each address.

4. Write outputs:
   - `data/epoch-latest.json` with:
     - `epoch_id`, `epoch_start`, `epoch_end`.
     - `pool_size`, `total_losses`, `total_refunded`.
     - `addresses`: array of `{ address, loss, hold, score, reward }`.
   - Optionally: `data/payouts-<epoch_id>.json` as a direct input for a payout script.

## 6. Automation & Timer

**v1 (off-chain automation):**

- Use OpenClaw cron or OS scheduler to run:

```bash
# Pseudo-commands
npm run compute:epoch
# (optional) node scripts/sendPayoutsFromEpoch.js data/payouts-<epoch_id>.json
```

- Epoch cadence: e.g. once per week.
- Signing strategy:
  - Semi-manual: load payouts file into a small CLI, approve and sign.
  - Fully automated: hot wallet key in secure storage (higher risk, better for later).

## 7. Future On-Chain Version (Sketch)

Later, this logic can move into a Solana program:

- Program owns a vault account holding the pool.
- Epoch boundaries and parameters are stored on-chain.
- Users or an off-chain oracle submit proofs of `loss_i` and `hold_i`.
- The program verifies and issues `reward_i` directly.

For now, v1 stays purely off-chain but follows this spec so migration is straightforward.