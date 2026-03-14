# Clawback Dashboard Operations Playbook

Single source of truth for deploying, operating, and adjusting the dashboard and distribution preview system.

## 1. Overview

- App framework: Next.js App Router
- Main data files: `data/epoch-latest.json`, `data/agent-reputation.json`, `data/agent-signals.sample.json`
- Distribution config: `data/distribution-config.json`
- Distribution engine: `lib/distribution.ts`
- Distribution API: `app/api/distribution/route.ts`
- Main UI: `app/ui/dashboard-client.tsx`

Key docs:

- `README.md`
- `DEPLOYMENT.md`
- `CLAWBACK_DISTRIBUTION_SPEC.md`

## 2. Environments And Secrets

- Local env template: `.env.example`
- Local env file: `.env`
- Production env: Vercel project settings

Hardening rules:

- No secrets in `data/`
- Server-only env vars stay out of client bundles
- Treat all JSON in `data/` as public reference state

## 3. Deployment

### Local development

1. Create `.env` from `.env.example`.
2. Install dependencies with `npm install`.
3. Run `npm run dev`.
4. Open `http://localhost:3000`.

### Production

1. Push the branch or trigger a Vercel deployment.
2. Confirm env vars are present.
3. Load `/` and `/api/distribution`.
4. Confirm the dashboard renders the latest epoch and distribution preview.

## 4. Distribution Operations

### Source of truth

The preview is computed from:

- `data/epoch-latest.json`
- `data/agent-reputation.json`
- `data/agent-signals.sample.json`
- `data/distribution-config.json`

The operator-editable control plane is `data/distribution-config.json`.

### Supported operator actions

- Adjust holder / trader / agent split percentages
- Adjust holder, trader, and agent scoring weights
- Adjust eligibility thresholds
- Preview the resulting per-address and per-agent allocations before deploy

### Validation invariants

Before saving config changes, ensure:

- `holdersPct + tradersPct + agentsPct = 100`
- Each weight group is greater than zero in total
- Thresholds are non-negative and make business sense for the current epoch sample
- `GET /api/distribution` returns `200`

## 5. Runbooks

### Cold start

1. Read this file.
2. Review `CLAWBACK_DISTRIBUTION_SPEC.md`.
3. Run `npm install` if dependencies are missing.
4. Start the app with `npm run dev`.
5. Load `/` and confirm the admin panel and payout preview appear.

### Recompute epoch input

1. Update the activity source file if needed.
2. Run `npm run compute:epoch`.
3. Reload the dashboard.
4. Confirm `/api/epoch/latest` and `/api/distribution` both reflect the new epoch.

### Adjust allocation parameters

1. Open the dashboard admin section.
2. Update percentages, weights, or thresholds.
3. Save through the UI.
4. Confirm the success message and updated preview.
5. Inspect `data/distribution-config.json` to verify the persisted values and `updatedAt`.

### API-only parameter update

1. Send `POST /api/distribution` with the desired config fields.
2. Confirm the response includes the recomputed summary.
3. Verify `data/distribution-config.json` changed as expected.
4. Refresh `/` to confirm the UI matches the API response.

### Verification checklist after any distribution change

1. Run `npx tsc --noEmit`.
2. Load `/api/distribution`.
3. Check that `pools.allocatedSol` is effectively the full pool and `unallocatedSol` is near zero.
4. Confirm top wallet and top agent payouts look reasonable for the current sample data.
5. Confirm the wallet lookup panel shows allocation breakdowns.

Note:

- In restricted sandboxes, `next build` may fail with `spawn EPERM` because Next.js cannot fork worker processes. In that case, use `npx tsc --noEmit` as the required verification step.

### Incident: distribution API failing

1. Call `/api/distribution` directly and capture the error payload.
2. Validate the JSON syntax of:
   - `data/epoch-latest.json`
   - `data/agent-reputation.json`
   - `data/agent-signals.sample.json`
   - `data/distribution-config.json`
3. Check that allocation percentages still sum to `100`.
4. Run `npx tsc --noEmit`.
5. Roll back the last config or data change if needed.

### Incident: dashboard renders but preview looks wrong

1. Compare `/api/epoch/latest` with `/api/distribution`.
2. Verify eligibility thresholds in `data/distribution-config.json`.
3. Check whether `signalEpochUsed` fell back to a different agent signal epoch.
4. Confirm the epoch sample has enough eligible holders, traders, or agents.
5. If a category is empty, verify the effective pool rebalance matches the spec.

## 6. Security Checklist

- No destructive unauthenticated routes beyond controlled JSON config writes in repo-local dev usage
- No wallet secrets or API secrets checked into `data/`
- Vercel access restricted to trusted operators
- Dependency health checked periodically

## 7. Launch Checklist

- Distribution spec matches implementation
- Dashboard works on desktop and mobile
- `/api/distribution` returns valid allocations
- Agent pool and wallet lookup remain in sync with the distribution engine
- Docs updated after any formula or config shape change
