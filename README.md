# 🗺️ LocalExplorer

A Progressive Web App for discovering local attractions, events, and activities. Built with **SvelteKit** and designed for **adventure seekers** who want to explore their surroundings.

## 🚀 Quick Deploy to Netlify

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/guySteve/LocalExplorer)

**Ready to deploy?** 
- ⚡ **Quick Start**: Click the button above, add API keys, and you're live!
- For detailed setup, see deployment instructions below

## ✨ Features

### 🔍 Discovery & Search
- **Smart Search** - Find places, attractions, and points of interest
- **Category Filters** - Quick access to 11 categories with 50+ subcategories
- **Distance-Based Results** - Everything sorted by proximity

### 🐦 Bird Watching (eBird Integration)
- Recent bird sightings near you
- Notable/rare species alerts
- Birding hotspot discovery
- Detailed observation data
- 📱 *Note: Submit observations via eBird website/app*

### 🏞️ Outdoor & Recreation
- **National Parks** (NPS API)
- **Recreation Areas** (Recreation.gov)
- **Campgrounds & Trails**
- **Nature Reserves & Beaches**

### 🎭 Events & Entertainment
- **Local Events** (Ticketmaster) - Concerts, sports, comedy, festivals
- **Breweries** (OpenBreweryDB) - Nearby breweries and brew pubs
- **Night Life** - Bars, clubs, theaters, venues

### 🌤️ Weather Features
- Current conditions with historical comparison
- "Hotter/colder than last year" insights
- 7-day forecast
- Sassy weather mode (optional humorous descriptions)
- **100% Free** - No API key required!

### 🗺️ Place Details & Reviews
- **Google Places Reviews** - Smart filtering shows:
  - Most recent review
  - Worst review from last year (if critical)
  - Balanced positive review
- Address, phone, website
- What3Words precise location
- Photos and ratings
- Distance and directions

### 🧭 Navigation & Compass
- Turn-by-turn compass navigation
- Voice guidance (customizable voices)
- Real-time direction updates
- Works offline once destination set
- Auto-requests sensor permissions

### 💾 Collections & Settings
- Save favorite places
- 26 visual themes (Naval, Retro 90, Arcade 80, etc.)
- Customize bird alerts, weather style, voice settings

### 📱 Mobile Optimized
- Touch-friendly (44px minimum targets)
- Responsive layouts for all screen sizes
- Smooth animations and transitions
- PWA - Add to home screen

## 🔐 Security

**All API keys are secured!** This app uses Netlify serverless functions to protect API keys from exposure. Keys are stored as environment variables and never exposed to the client.

## 🚀 Deployment

### Automatic Deployment (GitHub Actions)

**Every push to `main` automatically deploys to Netlify!**

The repository includes GitHub Actions workflow that:
- ✅ Automatically builds on every push to `main`
- ✅ Runs on pull requests for testing
- ✅ Deploys directly to Netlify
- ✅ Comments deployment status on PRs

**Setup Steps:**
1. **Fork or clone this repository**
2. **Connect to Netlify:**
   - Go to [Netlify](https://app.netlify.com/)
   - Create new site from Git
   - Select your repository
   - Netlify will auto-detect settings from `netlify.toml`

3. **Add Secrets to GitHub:**
   - Go to your repo → Settings → Secrets and variables → Actions
   - Add `NETLIFY_AUTH_TOKEN` (from Netlify: User Settings → Applications)
   - Add `NETLIFY_SITE_ID` (from Netlify: Site Settings → General)

4. **Add Environment Variables in Netlify Dashboard:**
   ```bash
   MAPS_API_KEY=your_google_maps_key
   EBIRD_API_KEY=your_ebird_key          # Optional
   TICKETMASTER_API_KEY=your_tm_key     # Optional
   WHAT3WORDS_API_KEY=your_w3w_key      # Optional
   RECREATION_GOV_API_KEY=your_rec_key   # Optional
   NPS_API_KEY=your_nps_key              # Optional
   ```

5. **Push to main branch** - Automatic deployment starts!

### Manual Deployment (Alternative)

If you prefer manual control:

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Initialize site
netlify init

# Deploy
netlify deploy --prod
```

### Build Configuration

The following are automatically configured via `netlify.toml`:
- **Build command:** `npm run build`
- **Publish directory:** `build`
- **Functions directory:** `netlify/functions`
- **Node version:** 18.x (via `.nvmrc` or package.json)

### Verify Deployment

After deployment, verify:
1. ✅ Site loads correctly
2. ✅ Search functionality works
3. ✅ Weather displays (no API key needed)
4. ✅ Maps load (requires MAPS_API_KEY)
5. ✅ Optional features work if API keys provided

## 🔑 API Keys

| Service | Get Key | Free Tier | Required | Notes |
|---------|---------|-----------|----------|-------|
| Google Maps | [Get Key](https://developers.google.com/maps/documentation/javascript/get-api-key) | Yes | **Yes** | Required for maps and location |
| **Weather** | **No Key Needed** | **100% Free** | **No** | **Works automatically!** |
| eBird | [Get Key](https://ebird.org/api/keygen) | Yes (10K/day) | No | For bird watching features |
| Ticketmaster | [Get Key](https://developer.ticketmaster.com/) | Yes | No | For event listings |
| What3Words | [Get Key](https://accounts.what3words.com/register) | Yes | No | For precise location codes |
| OpenBreweryDB | **No Key Needed** | **Free** | **No** | **Works automatically!** |
| Recreation.gov | [Get Key](https://ridb.recreation.gov/) | Yes | No | For recreation areas |
| NPS | [Get Key](https://www.nps.gov/subjects/developer/get-started.htm) | Yes | No | For national parks |

**Minimum Required:** Just Google Maps API key. Everything else works without keys or is optional!

## 📖 Documentation

- **[DEPLOYMENT.md](DEPLOYMENT.md)** - 🚀 Complete deployment guide with CI/CD setup
- **[CURRENT_FEATURES.md](CURRENT_FEATURES.md)** - 📋 Complete feature list and technical details
- **[EBIRD_INTEGRATION.md](EBIRD_INTEGRATION.md)** - 🐦 eBird API features documentation
- **[MOBILE_UX_IMPROVEMENTS.md](MOBILE_UX_IMPROVEMENTS.md)** - 📱 Mobile optimization details

## 💻 Local Development

```bash
# Install dependencies
npm install

# Create local environment file (for API keys)
cp .env.example .env

# Edit .env and add your API keys
nano .env  # or use your preferred editor

# Start the development server
npm run dev
```

The app will be available at `http://localhost:5173` with hot module replacement.

### Build for Production

```bash
# Build the app
npm run build

# Preview production build
npm run preview
```

## 🏗️ Architecture

### Frontend
- **SvelteKit** - Modern framework with SSR capabilities
- **Svelte** - Reactive component framework
- **Vite** - Lightning-fast build tool
- Progressive Web App (PWA) with service worker
- Responsive design with CSS Grid and Flexbox
- Google Maps JavaScript API integration

### Backend (Serverless)
- Netlify Functions (AWS Lambda)
- 7 serverless functions proxying API requests
- Environment-based configuration
- CORS enabled for cross-origin requests

### File Structure

```
LocalExplorer/
├── src/
│   ├── routes/              # SvelteKit pages
│   │   ├── +layout.svelte   # App layout
│   │   └── +page.svelte     # Homepage
│   ├── lib/
│   │   ├── stores/          # Svelte stores
│   │   │   ├── appState.js  # App state
│   │   │   └── storage.js   # Storage utilities
│   │   └── components/      # Svelte components
│   └── app.html             # HTML template
├── netlify/
│   └── functions/           # Serverless functions
│       ├── ticketmaster.js  # Events API
│       ├── what3words.js    # Location API
│       ├── foursquare.js    # Places API
│       ├── ebird.js         # Bird data API
│       ├── holiday.js       # Holiday API
│       ├── recreation.js    # Recreation API
│       └── nps.js           # National Parks API
├── static/                  # Static assets
│   ├── css/                 # Stylesheets
│   ├── icon-*.png           # PWA icons
│   └── manifest.json        # PWA manifest
├── build/                   # Production build (generated)
├── svelte.config.js         # SvelteKit config
├── vite.config.js           # Vite config with PWA
└── netlify.toml             # Netlify config
├── manifest.json           # PWA manifest
└── netlify.toml            # Netlify config
```

## 🛡️ Security Features

✅ API keys stored as environment variables  
✅ Serverless functions proxy all API requests  
✅ CORS headers properly configured  
✅ Input validation on all endpoints  
✅ No sensitive data in client code  
✅ `.gitignore` configured to prevent accidental commits  

## 🎨 Themes

The app includes 20+ themes:
- Nautical themes (Polished Sailor, High Seas Neon)
- Retro themes (Retro 90s, Arcade 80s, Y2K 2000s)
- Nature themes (Evergreen Trails, Mojave Drift)
- Modern themes (Neon City, Metro 2010s)
- Food themes (Sushi Bar, BBQ Pit, Coffee Café)

## 📱 PWA Features

- ✅ Installable on mobile and desktop
- ✅ Offline support with service worker
- ✅ Add to home screen
- ✅ Full-screen experience
- ✅ Responsive design
- ✅ Push notifications ready (not yet implemented)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### For Developers

If you're new to SvelteKit, check out:
- [DEVELOPMENT_NOTES.md](DEVELOPMENT_NOTES.md) - Developer guide and architecture
- [SvelteKit Docs](https://kit.svelte.dev/docs) - Official documentation
- [Svelte Tutorial](https://svelte.dev/tutorial) - Interactive tutorial

## 📚 Documentation

- **[DEVELOPMENT_NOTES.md](DEVELOPMENT_NOTES.md)** - 📝 Developer notes and architecture
- **[NETLIFY_DEPLOY.md](NETLIFY_DEPLOY.md)** - 🚀 Netlify deployment instructions
- **[GITHUB_ACTIONS_DEPLOY.md](GITHUB_ACTIONS_DEPLOY.md)** - 🤖 CI/CD setup

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

## 🙏 Acknowledgments

- Weather data from [Open-Meteo](https://open-meteo.com/)
- Brewery data from [Open Brewery DB](https://www.openbrewerydb.org/)
- Bird data from [eBird](https://ebird.org/)
- Park data from [National Park Service](https://www.nps.gov/)
- Recreation data from [Recreation.gov](https://www.recreation.gov/)
- Events from [Ticketmaster](https://www.ticketmaster.com/)
- Places from [Foursquare](https://foursquare.com/)

## 🔧 Recent Updates

### November 2025
- ✅ **Weather Comparison** - Now compares current weather to same date last year (hotter/colder indicator)
- ✅ **Compass Enhancement** - Automatic sensor permission request on open
- ✅ **Documentation** - Consolidated development notes into single DEVELOPMENT_NOTES.md
- ✅ **Code Cleanup** - Removed redundant documentation files

### Earlier Updates
All API functions have been updated with improved error handling:
- ✅ **Proper error handling** for all API responses
- ✅ **eBird, Ticketmaster, What3Words** and all other APIs now gracefully handle errors

To verify API functionality, run:
```bash
node verify-api-functions.cjs
```

## 🐛 Issues

If you encounter any issues, please:
1. Check [NETLIFY_DEPLOY.md](NETLIFY_DEPLOY.md) for deployment troubleshooting
2. Review [DEVELOPMENT_NOTES.md](DEVELOPMENT_NOTES.md) for common issues
3. Review Netlify function logs
4. Run `node verify-api-functions.cjs` to verify API function integrity
5. Open an issue on GitHub with details

## 📞 Support

- 📧 Issues: [GitHub Issues](https://github.com/guySteve/LocalExplorer/issues)
- 📖 Docs: See documentation files in the repository
- 💬 Discussions: [GitHub Discussions](https://github.com/guySteve/LocalExplorer/discussions)

---

**Built with ❤️ for adventure seekers**

Deploy your own instance today and start exploring! 🗺️✨
