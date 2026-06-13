# LocalExplorer on Azure Static Web Apps (Free Tier)

The codebase has been **fully migrated** from Netlify to Azure Static Web Apps (SWA). The Free plan costs **$0/month** and includes 100 GB bandwidth, free SSL, 2 custom domains, and a managed Azure Functions API.

## What was changed (already done)

| Area | Change |
|---|---|
| Adapter | `@sveltejs/adapter-netlify` → `svelte-adapter-azure-swa` in `svelte.config.js` |
| Serverless functions | `netlify/functions/*.js` converted to ES modules in `src/lib/server/legacy/` |
| API routing | New catch-all SvelteKit route `src/routes/svc/fn/[name]/+server.js` wraps the legacy handlers. Client now calls `/svc/fn/<name>` instead of `/.netlify/functions/<name>` |
| Reserved routes | All app API routes moved from `/api/*` to `/svc/*` (Azure SWA reserves `/api` for its managed Functions). `eco-route` and `maps-key` updated. |
| CI/CD | `.github/workflows/azure-static-web-apps.yml` builds and deploys on push to `main` |
| Packages | `netlify-cli` and `@sveltejs/adapter-netlify` removed; `svelte-adapter-azure-swa` + `workbox-build` added |
| Env injection | `netlify/inject-env.js` now loads `.env` locally and finds `key.js` in the SWA output (`build/static/key.js`) |

The build output is:
- `build/static/` — static client assets (deployed to SWA CDN)
- `build/server/` — Azure Functions app running the SvelteKit server (SSR + `/svc/*` endpoints)
- `build/staticwebapp.config.json` — generated routing config

## Remaining steps (one-time, manual)

### 1. Create the Static Web App (Free)

Easiest via the Azure Portal:
1. Portal → **Create resource** → **Static Web App**
2. Plan: **Free**
3. Source: **GitHub** → repo `guySteve/LocalExplorer`, branch `main`
4. Build presets: **Custom** — App location `/`, API location `build/server`, Output location `build/static`
5. Create. Azure adds a deploy token; copy the **deployment token** from the SWA resource → *Manage deployment token*.

> Note: Azure will try to add its own workflow file. You can delete the auto-generated one and keep `.github/workflows/azure-static-web-apps.yml` (already in this repo) — just set the secret below.

Or via CLI (install with `winget install Microsoft.AzureCLI`):
```bash
az login
az group create -n localexplorer-rg -l eastus2
az staticwebapp create -n localexplorer -g localexplorer-rg --sku Free
az staticwebapp secrets list -n localexplorer --query "properties.apiKey" -o tsv
```

### 2. Add GitHub repository secrets

Repo → Settings → Secrets and variables → Actions:
- `AZURE_STATIC_WEB_APPS_API_TOKEN` — the deployment token from step 1
- `MAPS_API_KEY` — Google Maps key (injected into client at build time)
- `WEATHER_API_KEY` — optional Google Weather key

### 3. Set runtime app settings (server-side env vars)

These are read by the Functions backend at runtime (portal → SWA → Environment variables, or CLI):
```bash
az staticwebapp appsettings set -n localexplorer --setting-names \
  MAPS_API_KEY=<key> \
  WEATHER_API_KEY=<key> \
  EBIRD_API_KEY=<key> \
  NPS_API_KEY=<key> \
  TICKETMASTER_API_KEY=<key> \
  WHAT3WORDS_API_KEY=<key> \
  FOURSQUARE_API_KEY=<key> \
  RECREATION_GOV_API_KEY=<key> \
  HOLIDAY_API_KEY=<key> \
  AZURE_OPENAI_ENDPOINT=<endpoint> \
  AZURE_OPENAI_KEY=<key> \
  AZURE_OPENAI_DEPLOYMENT=<deployment>
```

### 4. Push to main

The GitHub Actions workflow will build and deploy automatically. Your site will be live at `https://<generated-name>.azurestaticapps.net`.

## Caveats

- **EcoRoute streaming**: SWA managed Functions buffer responses, so `/svc/eco-route` streaming may arrive all at once instead of token-by-token. The UI handles this gracefully.
- **Free plan has no SLA** — fine for personal use; Standard is $9/mo if you ever need it.
- **Netlify leftovers**: `netlify.toml`, `_redirects`, and `netlify/functions/` are still in the repo as reference; safe to delete once Azure is confirmed working.
