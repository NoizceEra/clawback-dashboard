# CLawback Dashboard + Accountant (v1)

Initial local/off-chain implementation of:

- A Next.js dashboard for the CLawback Pool
- A Node/TypeScript accountant script that computes the latest epoch summary
- API routes for latest epoch data and per-address stats

## Quick start

1. Install dependencies:
   `npm install`
2. (Optional) create a local env file:
   `copy .env.example .env.local`
3. Compute the latest epoch summary:
   `npm run compute:epoch`
4. Start development server:
   `npm run dev`

Open `http://localhost:3000`.

## Scripts

- `npm run dev` - start local Next.js dev server
- `npm run build` - production build
- `npm run start` - run production server
- `npm run compute:epoch` - run accountant and generate `data/epoch-latest.json`

## Data flow

1. `scripts/computeEpoch.ts` reads `data/activity.sample.json`.
2. It computes the latest epoch summary and writes `data/epoch-latest.json`.
3. API routes read `data/epoch-latest.json`.
4. Dashboard fetches:
   - `GET /api/epoch/latest`
   - `GET /api/epoch/address/[address]`
