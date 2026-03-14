# CLAWBACK Distribution Spec

## 1. Purpose

The dashboard now computes an epoch distribution preview directly from the existing treasury and epoch snapshot in `data/epoch-latest.json`, plus the agent reputation and signal datasets already used elsewhere in the repo.

The system answers three questions each epoch:

1. How much of the pool goes to holders, traders, and agents?
2. Which addresses or agents are eligible?
3. What SOL allocation does each participant receive under the current parameters?

The implementation is repo-local and JSON-backed:

- Config: `data/distribution-config.json`
- Engine: `lib/distribution.ts`
- API: `app/api/distribution/route.ts`
- Admin UI: `app/ui/dashboard-client.tsx`

## 2. Inputs

### Treasury / epoch input

`EpochSummary` from `data/epoch-latest.json` remains the source of truth for:

- `epochId`
- `openingBalance`
- `closingBalance`
- `activityCount`
- `addresses[]`

The effective pool size is:

```text
total_pool_sol = epoch.agentPool.totalPoolSol
```

If `agentPool.totalPoolSol` is unavailable, the engine falls back to `closingBalance`.

### Address-level input

Each `AddressStats` entry is transformed into allocation metrics:

```text
balance       = max(staked - unstaked, 0)
losses        = max(-netChange, 0)
volume        = staked + unstaked + claimed
participation = activityCount
```

These are proxies derived from the current treasury-facing schema, so no new wallet ledger is required.

### Agent input

Agent scoring uses:

- `data/agent-reputation.json`
- `data/agent-signals.sample.json`

The engine prefers signals matching the treasury epoch. If none exist, it uses the latest signal epoch present in the file and exposes that as `signalEpochUsed`.

## 3. Config Model

`data/distribution-config.json` stores:

- Category allocation percentages
- Holder scoring weights
- Trader scoring weights
- Agent scoring weights
- Eligibility thresholds
- Audit metadata (`updatedAt`, `updatedBy`)

Default shape:

```json
{
  "allocation": {
    "holdersPct": 45,
    "tradersPct": 25,
    "agentsPct": 30
  },
  "holderWeights": {
    "balance": 0.75,
    "participation": 0.25
  },
  "traderWeights": {
    "losses": 0.55,
    "volume": 0.3,
    "participation": 0.15
  },
  "agentWeights": {
    "reputation": 0.5,
    "accuracy": 0.3,
    "signals": 0.2
  },
  "eligibility": {
    "holderMinBalance": 100,
    "traderMinLosses": 10,
    "minActivityCount": 1,
    "agentMinSignals": 1,
    "activeAgentEpochLookback": 2
  }
}
```

Validation rules:

- `holdersPct + tradersPct + agentsPct` must equal `100`
- Each weight group must sum above `0`
- `minActivityCount` must be non-negative

## 4. Eligibility Rules

### Holders

A wallet is holder-eligible if:

```text
balance >= holderMinBalance
participation >= minActivityCount
```

### Traders

A wallet is trader-eligible if:

```text
losses >= traderMinLosses
participation >= minActivityCount
```

### Agents

An agent is eligible if:

```text
lastActiveEpoch >= latestAgentEpoch - activeAgentEpochLookback
signalsThisWindow >= agentMinSignals
```

## 5. Scoring Formulas

### Holder score

```text
holder_score =
  (balance * holderWeights.balance) +
  (participation * holderWeights.participation)
```

### Trader score

```text
trader_score =
  (losses * traderWeights.losses) +
  (volume * traderWeights.volume) +
  (participation * traderWeights.participation)
```

### Agent score

```text
agent_score =
  (reputationScore * agentWeights.reputation) +
  ((avgAccuracy * 100) * agentWeights.accuracy) +
  (signalsThisWindow * agentWeights.signals)
```

## 6. Pool Allocation

Configured category pools are:

```text
holders_pool = total_pool_sol * holdersPct / 100
traders_pool = total_pool_sol * tradersPct / 100
agents_pool  = total_pool_sol * agentsPct  / 100
```

If a category has no eligible participants for the epoch, its share is not stranded. Instead, the engine rebalances the inactive share across active categories in proportion to their configured percentages.

Example:

```text
configured: holders 45 / traders 25 / agents 30
active: holders + agents only
effective: holders 60 / agents 40
```

## 7. Per-Participant Payouts

Within each active category:

```text
participant_allocation = category_pool * participant_score / sum(category_scores)
```

Wallet totals are:

```text
wallet_total = holderAllocationSol + traderAllocationSol
```

The distribution response returns:

- `addresses[]`
- `agents[]`
- `pools.configured`
- `pools.effective`
- `pools.allocatedSol`
- `pools.unallocatedSol`

## 8. API Contract

### `GET /api/distribution`

Returns the computed distribution summary for the latest epoch, including config, effective pools, per-address allocations, and per-agent allocations.

### `POST /api/distribution`

Accepts a full or partial config payload, merges it into the current config, validates it, persists it to `data/distribution-config.json`, and returns the recomputed summary.

This route is intentionally aligned with the repo's existing JSON-backed API pattern used by request and epoch handlers.

## 9. UI Behavior

The dashboard now includes a small admin section that:

- Shows top wallet payouts
- Shows current holder/trader/agent splits
- Exposes editable weight and eligibility inputs
- Saves changes through `POST /api/distribution`
- Refreshes the live preview after each save

The wallet lookup panel also shows the selected address's:

- Total projected allocation
- Holder allocation component
- Trader allocation component
- Loss / volume / participation metrics

## 10. Operational Notes

- The feature is read/write only against committed JSON files in this repo.
- No new external storage or contract dependency is required.
- `next build` may be blocked in restricted sandboxes that disallow worker spawning; use `npx tsc --noEmit` as the baseline type check in those environments.
