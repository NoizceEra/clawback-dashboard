# Deploying to Vercel

This project is fully local/off-chain in v1 and uses placeholder addresses.

## 1. Push repository

Push the repository to GitHub/GitLab/Bitbucket.

## 2. Create Vercel project

1. In Vercel, click **Add New Project**.
2. Import this repository.
3. Framework preset should auto-detect as **Next.js**.

## 3. Configure environment variables

In Vercel project settings, add:

- `CLAWBACK_TOKEN_MINT` = `PLACEHOLDER_TOKEN_MINT_ADDRESS`
- `CLAWBACK_TREASURY_ADDRESS` = `PLACEHOLDER_TREASURY_ADDRESS`

Use real addresses when ready.

## 4. Build and deploy settings

Default settings are sufficient:

- Install command: `npm install`
- Build command: `npm run build`
- Output: Next.js managed by Vercel

## 5. Keep epoch summary fresh

The dashboard reads `data/epoch-latest.json`. For v1, update it by running:

`npm run compute:epoch`

Then commit and redeploy.

## 6. Local verification before deployment

1. `npm install`
2. `npm run compute:epoch`
3. `npm run build`
4. `npm run dev`

Check:

- `/api/epoch/latest` returns JSON summary
- `/api/epoch/address/<placeholder-address>` returns per-address stats
- Dashboard loads and displays epoch data
