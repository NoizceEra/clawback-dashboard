# Clawback Dashboard — Operations Playbook

Single source of truth for deploying, maintaining, and safely operating the Clawback dashboard.

---

## 1. Overview & Stack

- **What it is:** Dashboard for tracking Clawback distributions, positions, and status.
- **Tech stack:**
  - Next.js / App Router (`app/`, `next.config.mjs`, `next-env.d.ts`)
  - TypeScript (`tsconfig.json`, `types/`)
  - UI + charts in `app/` and `lib/`
  - Data files in `data/` (CSV/JSON for distributions, etc.)
  - Agent skills in `skills/` for automated ingestion/updates
  - Hosting: Vercel (see `.vercel/`)

Key docs:

- `README.md` — overview
- `DEPLOYMENT.md` — deployment instructions
- `CLAWBACK_DISTRIBUTION_SPEC.md` — how distribution data is structured

---

## 2. Environments & Secrets

### Env

- Template: `.env.example`
- Actual: `.env` (local only) + Vercel env vars for production

Typical env vars (check `.env.example` for concrete names):

- `NEXT_PUBLIC_BASE_URL` or similar
- Any API keys used for data fetching (e.g., sheets, storage)

Hardening rules:

- [ ] No secrets in `data/` — treat `data/` as safe-to-commit public reference data.
- [ ] Only server-side code (not browser bundle) reads private env vars.
- [ ] Separate read-only tokens for public dashboards vs full admin access.

---

## 3. Deployment

### Local development

1. Copy `.env.example` → `.env` and fill values.
2. Install dependencies:
   - `npm install`
3. Run dev server:
   - `npm run dev`
4. Open `http://localhost:3000`.

Details: see `DEPLOYMENT.md`.

### Vercel

1. Connect repo to Vercel.
2. Configure env vars from `.env.example`.
3. Deploy via git push or Vercel UI.
4. When distribution data changes, update `data/` or configure skills in `skills/` to pull from canonical sources.

---

## 4. Operations & Heartbeats

### Operational tasks

- Render check: landing page responds with 200 and loads main chart/data.
- Data freshness: distribution data is up-to-date with source of truth.
- Error monitoring: Next.js logs show no recurring failures.

### Heartbeat integration

Use global optimizer from workspace root:

- `HEARTBEAT.md`, `HEARTBEAT_SERVICE.md`
- `scripts/heartbeat_optimizer.py`, `model_router.py`

Recommended heartbeat type:

- Name: `clawback-dashboard`
- Interval: 30–60 minutes.
- Model: Haiku.
- Behavior: hit `/` and verify basic invariants (status 200, key text present).

Pseudo snippet for `HEARTBEAT.md`:

```bash
result=$(python3 scripts/heartbeat_optimizer.py check clawback-dashboard)
should_check=$(echo $result | jq -r .should_check)

if [ "$should_check" = "true" ]; then
  python3 scripts/check_clawback_dashboard.py
  python3 scripts/heartbeat_optimizer.py record clawback-dashboard
fi
```

Where `scripts/check_clawback_dashboard.py` is a tiny HTTP check script.

---

## 5. Security Hardening Checklist

- [ ] Only static/public data checked into `data/` — no wallet secrets, private addresses, or API keys.
- [ ] API keys (if any) scoped read-only and limited by IP/domain.
- [ ] Next.js API routes secured; no unauthenticated destructive actions.
- [ ] Vercel project access limited to trusted accounts; 2FA enabled.
- [ ] Dependencies scanned periodically (`npm audit`).
- [ ] No direct exposure of internal Clawback control endpoints from this dashboard.

---

## 6. Shilling & Launch Playbook

- **Primary URL:** `<fill-in-prod-url>`
- **What to say:**
  - "Clawback Dashboard gives a transparent view of how the Clawback engine is distributing recovered funds."
  - Highlights: transparency, safety, and automation.
- **Assets:**
  - Screenshots of main dashboard views.
  - Short explanation of Clawback mechanism (link to `CLAWBACK_NOTES.md` in root if relevant).

Launch checklist:

- [ ] Confirm dashboard matches latest distribution spec (`CLAWBACK_DISTRIBUTION_SPEC.md`).
- [ ] Production deploy green; test on mobile + desktop.
- [ ] Public link shared in relevant channels (Discord, X, Molt guilds).
- [ ] OPERATIONS_PLAYBOOK.md linked from `MULTIPROJECT_OPERATIONS_INDEX.md` (root).

---

## 7. Runbooks

### Cold-start

1. Read this file.
2. Skim `README.md` and `DEPLOYMENT.md`.
3. Bootstrap `.env` from `.env.example`.
4. Run dev server; ensure data loads.

### Update distributions

1. Edit `data/` CSV/JSON to match `CLAWBACK_DISTRIBUTION_SPEC.md`.
2. Run local build to ensure no type errors.
3. Commit + deploy.

### Incident: dashboard down

1. Check Vercel status + deploy logs.
2. Confirm env vars present and correct.
3. Roll back to last good deployment if needed.
4. Inspect `data/` for malformed JSON/CSV.

Keep this file updated as Clawback architecture and requirements evolve.
