# 🚀 Deployment Guide - LocalExplorer

Complete guide for deploying LocalExplorer to production with automatic CI/CD.

---

## Overview

LocalExplorer uses **Netlify** for hosting with **GitHub Actions** for automatic deployment. Every push to `main` triggers a build and deployment automatically.

### Architecture
- **Frontend:** SvelteKit PWA
- **Backend:** Netlify Serverless Functions (7 functions)
- **Hosting:** Netlify CDN
- **CI/CD:** GitHub Actions
- **Node Version:** 18.x

---

## Quick Start (5 Minutes)

### 1. Fork/Clone Repository
```bash
git clone https://github.com/guySteve/LocalExplorer.git
cd LocalExplorer
```

### 2. Create Netlify Site
1. Go to [https://app.netlify.com/](https://app.netlify.com/)
2. Click "Add new site" → "Import an existing project"
3. Connect to your GitHub repository
4. Netlify auto-detects settings from `netlify.toml` ✅
5. Click "Deploy site"

### 3. Add Environment Variables in Netlify
Go to Site Settings → Environment variables → Add a variable

**Required:**
```
MAPS_API_KEY = your_google_maps_api_key
```

**Optional (features gracefully degrade without these):**
```
EBIRD_API_KEY = your_ebird_api_key
TICKETMASTER_API_KEY = your_ticketmaster_key
WHAT3WORDS_API_KEY = your_what3words_key
RECREATION_GOV_API_KEY = your_recreation_gov_key
NPS_API_KEY = your_nps_api_key
```

### 4. Configure GitHub Actions
Go to your repo → Settings → Secrets and variables → Actions → New repository secret

Add these two secrets:
```
NETLIFY_AUTH_TOKEN = <from Netlify User Settings → Applications>
NETLIFY_SITE_ID = <from Netlify Site Settings → General>
```

### 5. Push to Main
```bash
git push origin main
```

✨ **Automatic deployment begins!** Watch the progress in GitHub Actions tab.

---

## Detailed Setup

### Prerequisites

**Accounts Needed:**
- GitHub account (free)
- Netlify account (free tier sufficient)
- Google Cloud account (for Maps API)

**Optional API Keys:**
- eBird API (free, 10k requests/day)
- Ticketmaster API (free tier available)
- What3Words API (free tier available)
- Recreation.gov API (free)
- National Park Service API (free)

### Getting API Keys

#### Google Maps API Key (Required)
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable these APIs:
   - Maps JavaScript API
   - Places API
   - Directions API
   - Geocoding API
4. Create credentials → API Key
5. Restrict the key:
   - Application restrictions: HTTP referrers
   - Add your domain: `*.netlify.app/*`, `your-domain.com/*`
   - API restrictions: Select the 4 APIs above

**Cost:** Free tier includes $200 credit/month (plenty for most uses)

#### eBird API Key (Optional)
1. Go to [https://ebird.org/api/keygen](https://ebird.org/api/keygen)
2. Fill out the form
3. Receive key instantly via email

**Cost:** Free, 10,000 requests/day

#### Other API Keys
See `README.md` for links to all API key registration pages.

---

## Automatic Deployment (GitHub Actions)

### How It Works

The `.github/workflows/netlify-deploy.yml` file triggers on:
- Every push to `main` branch
- Every pull request (preview deployments)
- Manual trigger via GitHub Actions UI

**Workflow Steps:**
1. Checkout code from repository
2. Setup Node.js 18 environment
3. Install dependencies with `npm ci`
4. Deploy to Netlify using `nwtgck/actions-netlify@v2.1`
5. Add deployment comment to PRs

### Configuration

The workflow uses these inputs:
```yaml
publish-dir: '.'              # Root directory (Netlify.toml handles rest)
production-branch: main        # Deploy to production on main
github-token: ${{ secrets.GITHUB_TOKEN }}  # Auto-provided by GitHub
```

And these secrets:
```yaml
NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

### Getting Netlify Credentials

**NETLIFY_AUTH_TOKEN:**
1. Login to Netlify
2. Click your avatar → User settings
3. Applications → Personal access tokens
4. New access token → Copy the token

**NETLIFY_SITE_ID:**
1. Go to your site in Netlify
2. Site settings → General
3. Site details → API ID
4. Copy the Site ID

### Viewing Deployment Status

**In GitHub:**
- Actions tab shows workflow runs
- Each commit shows deployment status
- PRs show deployment preview link in comments

**In Netlify:**
- Deploys tab shows all deployments
- Click any deploy to see logs
- Real-time log streaming during build

---

## Manual Deployment (Alternative)

If you prefer manual control or need to deploy from local machine:

### Install Netlify CLI
```bash
npm install -g netlify-cli
```

### Login to Netlify
```bash
netlify login
```
This opens a browser for authentication.

### Initialize Site (First Time)
```bash
netlify init
```
Follow prompts to connect to your Netlify site.

### Deploy to Production
```bash
# Full deployment
netlify deploy --prod

# Or use npm script
npm run deploy

# Preview deployment (test before production)
netlify deploy
```

### Deploy Specific Build
```bash
# Build locally first
npm run build

# Deploy the build folder
netlify deploy --prod --dir=build
```

---

## Build Configuration

### netlify.toml

This file at the root configures everything:

```toml
[build]
  command = "npm run build"
  publish = "build"
  functions = "netlify/functions"
```

**What it does:**
- `command`: Runs SvelteKit build + env injection
- `publish`: Serves the `build/` directory
- `functions`: Deploys serverless functions from `netlify/functions/`

### Build Command Explained

The `npm run build` script in `package.json`:
```json
"build": "vite build && node netlify/inject-env.js"
```

**Steps:**
1. `vite build` - SvelteKit builds the app
2. `node netlify/inject-env.js` - Injects Google Maps API key

### Environment Variable Injection

The `netlify/inject-env.js` script:
- Reads `MAPS_API_KEY` from Netlify environment
- Injects it into `build/key.js`
- This keeps the key out of source control
- Netlify functions handle all other API keys

---

## Netlify Functions

7 serverless functions proxy API requests:

```
netlify/functions/
├── ebird.js          # eBird bird sighting API
├── foursquare.js     # Foursquare Places API
├── holiday.js        # Holiday API
├── nps.js            # National Park Service API
├── recreation.js     # Recreation.gov API
├── ticketmaster.js   # Ticketmaster Events API
├── weather.js        # Open-Meteo Weather API
└── what3words.js     # What3Words Location API
```

**Why functions?**
- Keep API keys secure (not exposed to client)
- Add CORS headers
- Handle rate limiting
- Provide consistent error handling

**Deployment:**
- Functions automatically deploy with site
- Available at `/.netlify/functions/[name]`
- Run on AWS Lambda (managed by Netlify)

---

## Security Configuration

### Security Headers (netlify.toml)

Applied to all responses:
```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
```

### Content Security Policy

Comprehensive CSP in `netlify.toml`:
- Allows Google Maps, fonts, external APIs
- Blocks inline scripts (except trusted)
- Prevents XSS attacks
- Whitelists specific domains

### API Key Security

✅ **Secure:**
- All API keys stored as Netlify environment variables
- Never committed to git (`.gitignore` configured)
- Proxied through serverless functions
- Not exposed in client code

❌ **Exception:**
- `MAPS_API_KEY` is injected into `build/key.js` at build time
- This is necessary for Google Maps to work
- Key should be restricted to your domains in Google Cloud Console

---

## Caching Strategy

### Static Assets (netlify.toml)

Long-term caching for immutable assets:
```
/css/*     → Cache-Control: public, max-age=31536000, immutable
/js/*      → Cache-Control: public, max-age=31536000, immutable
/*.png     → Cache-Control: public, max-age=31536000, immutable
```

### Service Worker (vite.config.js)

PWA service worker provides:
- **Precaching:** Static assets cached on install
- **Runtime caching:** 
  - Google Fonts → CacheFirst (1 year)
  - Google Maps → NetworkFirst (1 week)
  - Page navigation → NetworkFirst (1 day)

### CDN Caching

Netlify CDN automatically caches:
- All static files on global edge nodes
- Smart invalidation on new deploys
- Instant purge capability

---

## Troubleshooting

### Build Fails

**"Module not found" error:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

**"Command failed with exit code 1":**
- Check Netlify build logs for specific error
- Verify all dependencies in `package.json`
- Ensure Node 18 is used (check `.nvmrc`)

### Functions Not Working

**"Function returned error" or 500:**
- Check function logs in Netlify dashboard
- Verify environment variables are set
- Test function locally: `netlify dev`

**CORS errors:**
- Functions include CORS headers
- Check browser console for specific error
- Verify function is returning response with headers

### Environment Variables Not Available

**In Netlify build:**
- Go to Site settings → Environment variables
- Ensure variables are set for "All scopes"
- Redeploy after adding variables

**In local development:**
- Copy `.env.example` to `.env`
- Fill in your local API keys
- Never commit `.env` to git

### Maps Not Loading

**"This page can't load Google Maps correctly":**
- Verify `MAPS_API_KEY` is set in Netlify
- Check key restrictions in Google Cloud Console
- Ensure billing is enabled on Google Cloud
- Verify APIs are enabled (Maps JavaScript, Places, Directions, Geocoding)

### GitHub Actions Failing

**"Error: Input required and not supplied: NETLIFY_AUTH_TOKEN":**
- Go to repo Settings → Secrets → Actions
- Add `NETLIFY_AUTH_TOKEN` and `NETLIFY_SITE_ID`

**"Deploy succeeded but site not updating":**
- Check if deploying to correct site ID
- Verify workflow is triggering on `main` branch
- Check Netlify deploy logs

---

## Performance Optimization

### Build Optimization

**Vite configuration (vite.config.js):**
- Tree-shaking removes unused code
- Code splitting for smaller bundles
- CSS minification
- Asset optimization

**SvelteKit configuration (svelte.config.js):**
- Preprocess and compile Svelte components
- SSR disabled (static site generation)
- Adapter optimized for Netlify

### Runtime Performance

**Service Worker:**
- Caches 275 precache entries (~1.27 MB)
- Instant load on repeat visits
- Offline functionality

**Lazy Loading:**
- Modals load on demand
- Maps loaded only when needed
- Images lazy loaded

### Monitoring

**Lighthouse Scores (Target):**
- Performance: 90+
- Accessibility: 90+
- Best Practices: 90+
- SEO: 90+

**Test with:**
```bash
# Chrome DevTools → Lighthouse
# Or use CLI
npm install -g lighthouse
lighthouse https://your-site.netlify.app
```

---

## Rollback & Recovery

### Rollback to Previous Deploy

**Via Netlify Dashboard:**
1. Go to Deploys tab
2. Find previous successful deploy
3. Click "..." menu → Publish deploy
4. Instant rollback (no rebuild needed)

**Via Netlify CLI:**
```bash
netlify rollback
```

### Emergency Fix

If site is broken:
1. **Immediate:** Rollback via Netlify dashboard
2. **Fix:** Make fix in local branch
3. **Test:** `npm run build` and `npm run preview`
4. **Deploy:** Push to `main` or manually deploy
5. **Verify:** Check site is working

### Deployment Locking

Prevent accidental deploys:
1. Go to Site settings → Build & deploy
2. Stop auto publishing
3. Manually approve deploys

---

## Production Checklist

Before going live:

### Code Quality
- [ ] `npm run check` passes (0 errors)
- [ ] No console errors in browser
- [ ] All features tested manually
- [ ] Mobile responsive on all screen sizes
- [ ] PWA installs correctly

### Configuration
- [ ] All required environment variables set
- [ ] API keys restricted to production domains
- [ ] `netlify.toml` security headers configured
- [ ] Service worker caching strategy tested
- [ ] Functions tested and returning correct data

### Performance
- [ ] Lighthouse score > 90 on all metrics
- [ ] Service worker precaching assets
- [ ] Images optimized
- [ ] No unnecessary network requests

### Security
- [ ] API keys not exposed in client code
- [ ] CSP headers properly configured
- [ ] HTTPS enabled (automatic with Netlify)
- [ ] No sensitive data in logs

### Monitoring
- [ ] Netlify analytics enabled (optional)
- [ ] Error tracking set up (e.g., Sentry - optional)
- [ ] Uptime monitoring configured (optional)

### Documentation
- [ ] README.md updated with deployment URL
- [ ] API key setup documented
- [ ] Known issues documented
- [ ] Contributors guide updated

---

## Advanced Configuration

### Custom Domain

1. **Add domain in Netlify:**
   - Site settings → Domain management
   - Add custom domain
   - Follow DNS setup instructions

2. **Update API key restrictions:**
   - Google Cloud Console
   - Add custom domain to HTTP referrers

3. **Update CSP if needed:**
   - Modify `netlify.toml` if domain requires special handling

### Deploy Previews

Enable for all PRs:
1. Site settings → Build & deploy → Deploy contexts
2. Enable "Deploy Previews"
3. Each PR gets unique preview URL

### Split Testing

A/B test features:
1. Site settings → Split Testing
2. Create branch with changes
3. Set percentage split
4. Netlify serves different versions

### Analytics

Enable Netlify Analytics:
1. Site settings → Analytics
2. Enable (paid feature)
3. View traffic, pageviews, bandwidth

---

## Support & Resources

### Documentation
- **This Guide:** Complete deployment reference
- **README.md:** Quick start and overview
- **CURRENT_FEATURES.md:** Feature documentation
- **EBIRD_INTEGRATION.md:** eBird API guide

### External Resources
- **Netlify Docs:** [docs.netlify.com](https://docs.netlify.com/)
- **GitHub Actions:** [docs.github.com/actions](https://docs.github.com/en/actions)
- **SvelteKit:** [kit.svelte.dev/docs](https://kit.svelte.dev/docs)

### Getting Help

**Build Issues:**
1. Check Netlify build logs
2. Review this deployment guide
3. Search [Netlify forums](https://answers.netlify.com/)

**GitHub Actions Issues:**
1. Check Actions tab for error details
2. Verify secrets are set correctly
3. Review workflow file syntax

**General Issues:**
1. Open issue on GitHub
2. Include error logs and steps to reproduce
3. Check existing issues first

---

## Changelog

### November 2025
- ✅ Added GitHub Actions workflow for automatic deployment
- ✅ Updated documentation for CI/CD setup
- ✅ Added `.nvmrc` for Node version consistency
- ✅ Verified security headers and CSP configuration
- ✅ Documented complete deployment process

---

**Ready to deploy!** 🚀

Follow the Quick Start above to get your LocalExplorer site live in 5 minutes.
