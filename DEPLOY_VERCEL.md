# Deploying to Vercel

This project is a Next.js app (Next 15) that can be deployed to Vercel.

## Files added to help deployment
- `.vercelignore` - excludes anchor, target, and other non-frontend files
- `vercel.json` - uses the Next builder

## Quick steps (Vercel UI)
1. Go to https://vercel.com and sign in.
2. Click **New Project** → **Import Git Repository**.
3. Choose the `SkyTradeLinks/fractionalization` repository.
4. In the Root Directory field, ensure it's the repo root (leave empty unless you placed frontend in a subfolder).
5. Environment variables: none required for mock mode. When using real RPC you may need:
   - `NEXT_PUBLIC_RPC_URL` (devnet or mainnet URL)
   - `ANCHOR_WALLET` (if using server-side Anchor tasks)
6. Click **Deploy**.

## Quick steps (Vercel CLI)
1. Install Vercel CLI:
```bash
npm i -g vercel
```
2. From project root run:
```bash
vercel login
vercel --prod
```
3. Follow interactive prompts.

## Notes & Tips
- The repo contains `anchor/` and other backend-only code — we included a `.vercelignore` to exclude these files from uploads.
- If you use Arweave-hosted metadata or any external RPC keys, add them as Vercel Environment Variables.
- If you need server-side secrets (Anchor keys), do NOT add them to the frontend; consider a separate serverless function or CI job to manage that.
- Set `turbopack.root` in `next.config.ts` if Vercel warns about multiple lockfiles.

## Post-deploy
- Preview URL will be provided by Vercel after deploy.
- Static builds should show the same mock-based UI as `npm run dev`.

If you want, I can: 
- Create a `vercel` branch or GitHub Action for automatic deploys on push
- Add a sample `NEXT_PUBLIC_RPC_URL` env var and documentation for switching off mock data
