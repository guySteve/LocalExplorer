# 🚀 Deploy LocalExplorer to Netlify

This guide will walk you through deploying LocalExplorer to Netlify in just a few minutes.

## ✅ Pre-Deployment Check

Before deploying, verify your repository is ready:

```bash
npm run check-deploy
```

This will check for all required files and configurations. ✓ All green? You're ready to deploy!

## 📋 Prerequisites

- A GitHub account with this repository
- A Netlify account (free tier works great!) - [Sign up here](https://app.netlify.com/signup)
- API keys for the services you want to use (see below)

## 🎯 Quick Deploy (Recommended)

### Method 1: Deploy via Netlify UI (Easiest)

1. **Click the Deploy Button** ⬇️

   [![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/guySteve/LocalExplorer)

2. **Connect to GitHub**
   - Authorize Netlify to access your GitHub account
   - Select the LocalExplorer repository
   - Click "Save & Deploy"

3. **Add Environment Variables**
   - Once deployed, go to: **Site settings** → **Environment variables**
   - Add the following variables (click "Add a variable" for each):

   ```
   MAPS_API_KEY=your_google_maps_api_key
   TICKETMASTER_API_KEY=your_ticketmaster_api_key
   HOLIDAY_API_KEY=your_holiday_api_key
   WHAT3WORDS_API_KEY=your_what3words_api_key
   FOURSQUARE_API_KEY=your_foursquare_api_key
   EBIRD_API_KEY=your_ebird_api_key
   RECREATION_GOV_API_KEY=your_recreation_gov_api_key
   NPS_API_KEY=your_nps_api_key
   ```

4. **Redeploy with Environment Variables**
   - Go to: **Deploys** tab
   - Click: **Trigger deploy** → **Deploy site**
   - Wait for deployment to complete (1-2 minutes)

5. **🎉 Done!** Your app is live at `https://your-site-name.netlify.app`

---

### Method 2: Manual Deployment via Netlify Dashboard

1. **Go to Netlify Dashboard**
   - Log in to: https://app.netlify.com
   - Click: **Add new site** → **Import an existing project**

2. **Connect Repository**
   - Choose: **GitHub**
   - Authorize Netlify (if not already done)
   - Search for and select: **LocalExplorer**

3. **Configure Build Settings**
   - **Branch to deploy**: `main` (or your default branch)
   - **Build command**: Leave empty or `echo 'Static site'`
   - **Publish directory**: `.` (root directory)
   - **Functions directory**: `netlify/functions` (auto-detected)

4. **Deploy Site**
   - Click: **Deploy site**
   - Wait for initial deployment (this will take 1-2 minutes)

5. **Add Environment Variables** (Same as Method 1, step 3)

6. **Redeploy** (Same as Method 1, step 4)

---

### Method 3: Deploy via Netlify CLI

This method is great for developers who prefer command-line tools.

1. **Install Netlify CLI**
   ```bash
   npm install -g netlify-cli
   ```

2. **Login to Netlify**
   ```bash
   netlify login
   ```
   This will open your browser for authentication.

3. **Initialize Netlify in Your Repository**
   ```bash
   cd /path/to/LocalExplorer
   netlify init
   ```
   Follow the prompts:
   - Choose: **Create & configure a new site**
   - Choose your team
   - Enter a site name (or leave blank for auto-generated)
   - Build command: Leave empty
   - Publish directory: `.`
   - Netlify functions folder: `netlify/functions`

4. **Set Environment Variables**
   ```bash
   netlify env:set MAPS_API_KEY "your_google_maps_api_key"
   netlify env:set TICKETMASTER_API_KEY "your_ticketmaster_api_key"
   netlify env:set HOLIDAY_API_KEY "your_holiday_api_key"
   netlify env:set WHAT3WORDS_API_KEY "your_what3words_api_key"
   netlify env:set FOURSQUARE_API_KEY "your_foursquare_api_key"
   netlify env:set EBIRD_API_KEY "your_ebird_api_key"
   netlify env:set RECREATION_GOV_API_KEY "your_recreation_gov_api_key"
   netlify env:set NPS_API_KEY "your_nps_api_key"
   ```

5. **Deploy**
   ```bash
   netlify deploy --prod
   ```

6. **🎉 Done!** Your site URL will be displayed in the terminal.

---

## 🔑 Getting API Keys

You'll need API keys for the services you want to use:

| Service | Free Tier | Get Key | Required? |
|---------|-----------|---------|-----------|
| **Google Maps** | Yes (with billing account) | [Get Key](https://developers.google.com/maps/documentation/javascript/get-api-key) | ✅ Required |
| **Ticketmaster** | Yes | [Get Key](https://developer.ticketmaster.com/) | Optional |
| **What3Words** | Yes | [Get Key](https://accounts.what3words.com/register) | Optional |
| **Foursquare** | Yes | [Get Key](https://foursquare.com/developers/) | Optional |
| **eBird** | Yes | [Get Key](https://ebird.org/api/keygen) | Optional |
| **Recreation.gov** | Yes | [Get Key](https://ridb.recreation.gov/) | Optional |
| **NPS** | Yes | [Get Key](https://www.nps.gov/subjects/developer/get-started.htm) | Optional |
| **HolidayAPI** | Limited | [Get Key](https://holidayapi.com/) | Optional |

**Note**: The app will work with just Google Maps API key, but other features require their respective keys.

---

## 🔒 Secure Your Google Maps API Key

After deploying, **IMPORTANT**: Restrict your Google Maps API key:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to: **APIs & Services** → **Credentials**
3. Find your API key and click **Edit**
4. Set **Application restrictions**:
   - Choose: **HTTP referrers (web sites)**
   - Add your domains:
     - `https://your-site-name.netlify.app/*`
     - `https://your-custom-domain.com/*` (if you have one)
5. Set **API restrictions**:
   - Choose: **Restrict key**
   - Select only:
     - Maps JavaScript API
     - Places API
     - Geocoding API

---

## 🔄 Automatic Deployments

Once connected to GitHub, Netlify will automatically:
- ✅ Deploy whenever you push to your main branch
- ✅ Create preview deployments for pull requests
- ✅ Run your serverless functions
- ✅ Use your environment variables

---

## ✅ Verify Deployment

After deployment, test these features:

1. **✅ Maps Load**: Open your site and verify Google Maps loads
2. **✅ Events Search**: Try searching for local events
3. **✅ Bird Sightings**: Check if bird data loads
4. **✅ Weather**: Verify weather information displays
5. **✅ Breweries**: Test brewery search (no API key needed)
6. **✅ PWA**: Try installing the app on mobile/desktop

---

## 🐛 Troubleshooting

### Maps Don't Load
- **Issue**: Google Maps not displaying
- **Solution**: 
  1. Verify `MAPS_API_KEY` is set in Netlify environment variables
  2. Check if API key is restricted to wrong domain
  3. Ensure billing is enabled in Google Cloud Console

### Functions Returning Errors
- **Issue**: API calls failing with 500 errors
- **Solution**:
  1. Check Netlify Function logs: **Functions** tab → Select function → **Function log**
  2. Verify all required environment variables are set
  3. Ensure API keys are valid and not expired
  4. Check API provider dashboards for rate limits

### Build Fails
- **Issue**: Deployment fails during build
- **Solution**:
  1. Check build logs in Netlify dashboard
  2. Verify `netlify.toml` configuration is correct
  3. Ensure all files are properly committed to Git

### Environment Variables Not Working
- **Issue**: Changes to environment variables not taking effect
- **Solution**:
  1. After adding/changing environment variables, you **must** redeploy
  2. Go to **Deploys** → **Trigger deploy** → **Deploy site**
  3. Environment variables only apply to new builds

---

## 📊 Monitor Your Deployment

After deployment, keep an eye on:

1. **Netlify Dashboard**
   - Deploy history and logs
   - Function execution logs
   - Build times and status

2. **API Usage**
   - Check each API provider's dashboard
   - Monitor quota usage
   - Watch for rate limit warnings

3. **Analytics** (Optional)
   - Enable Netlify Analytics for visitor insights
   - Or integrate Google Analytics

---

## 💡 Tips & Best Practices

### 🔐 Security
- ✅ Always use environment variables for API keys
- ✅ Never commit `.env` files
- ✅ Restrict API keys to your specific domains
- ✅ Rotate keys if they were ever exposed in Git history

### ⚡ Performance
- ✅ Enable Netlify's Asset Optimization (CDN)
- ✅ Use custom domain for better caching
- ✅ Monitor function execution times

### 🚀 Custom Domain (Optional)
1. Go to: **Domain settings** → **Add custom domain**
2. Follow Netlify's instructions to configure DNS
3. Netlify provides free SSL certificates automatically

---

## 📱 Progressive Web App Features

Once deployed, your users can:
- ✅ Install the app on their home screen
- ✅ Use offline (with service worker)
- ✅ Get a native app-like experience
- ✅ Receive push notifications (when implemented)

---

## 🔗 Useful Links

- **Netlify Dashboard**: https://app.netlify.com
- **Netlify Documentation**: https://docs.netlify.com
- **Netlify Functions**: https://docs.netlify.com/functions/overview/
- **Environment Variables**: https://docs.netlify.com/environment-variables/overview/
- **Custom Domains**: https://docs.netlify.com/domains-https/custom-domains/

---

## 💬 Need Help?

- 📖 Check [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) for detailed checklist
- 📝 See [QUICK_START.md](QUICK_START.md) for quick reference
- 🔒 Review [SECURITY_SETUP.md](SECURITY_SETUP.md) for security details
- 🐛 [Open an issue](https://github.com/guySteve/LocalExplorer/issues) on GitHub

---

## 🎉 Success!

Congratulations! Your LocalExplorer app is now live on Netlify. Share your site with friends and start exploring! 🗺️✨

**Your site URL**: `https://your-site-name.netlify.app`

---

**Built with ❤️ for adventure seekers**
