# 🗺️ LocalExplorer

A Progressive Web App for discovering local attractions, events, and activities. Built with **SvelteKit** and designed for **adventure seekers** who want to explore their surroundings.

## 🚀 Deployment

This app is now configured for **GitHub Pages** static hosting. Simply push to the `main` branch and GitHub Actions will automatically build and deploy your site!

## ✨ Features

### 🔍 Discovery & Search
- **Smart Search** - Find places, attractions, and points of interest via Google Places
- **Category Filters** - Quick access to various categories
- **Distance-Based Results** - Everything sorted by proximity

### 🍺 Breweries
- **Breweries** (OpenBreweryDB) - Nearby breweries and brew pubs
- Completely free - no API key required!

### 🌤️ Weather Features
- Current conditions with historical comparison
- "Hotter/colder than last year" insights
- 7-day forecast
- Sassy weather mode (optional humorous descriptions)
- **100% Free** - No API key required!

### 🗺️ Place Details & Reviews
- **Google Places Integration** - Place details, ratings, and reviews
- Address, phone, website
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

**Google Maps API Key:** This app requires a Google Maps API key for the maps functionality. The key can be configured as a GitHub Secret and will be injected during build time.

## 🚀 Deployment to GitHub Pages

### Automatic Deployment (GitHub Actions)

**Every push to `main` automatically deploys to GitHub Pages!**

The repository includes a GitHub Actions workflow that:
- ✅ Automatically builds on every push to `main`
- ✅ Deploys to GitHub Pages
- ✅ No external services required

**Setup Steps:**
1. **Fork or clone this repository**

2. **Enable GitHub Pages:**
   - Go to your repo → Settings → Pages
   - Under "Build and deployment" → Source, select "GitHub Actions"

3. **Add Google Maps API Key (Optional but Recommended):**
   - Go to your repo → Settings → Secrets and variables → Actions
   - Add `MAPS_API_KEY` with your Google Maps API key value

4. **Push to main branch** - Automatic deployment starts!

Your site will be available at: `https://<username>.github.io/<repository-name>/`

### Build Configuration

The build is configured via `svelte.config.js`:
- **Build command:** `npm run build`
- **Publish directory:** `build`
- **Adapter:** `@sveltejs/adapter-static`
- **Node version:** 18.x

### Verify Deployment

After deployment, verify:
1. ✅ Site loads correctly
2. ✅ Search functionality works (Google Places)
3. ✅ Weather displays (no API key needed - uses Open-Meteo)
4. ✅ Maps load (if MAPS_API_KEY is configured)
5. ✅ Breweries search works (no API key needed)

## 🔑 API Keys

| Service | Get Key | Free Tier | Required | Notes |
|---------|---------|-----------|----------|-------|
| Google Maps | [Get Key](https://developers.google.com/maps/documentation/javascript/get-api-key) | Yes | **Recommended** | For maps, search, and location services |
| **Weather** | **No Key Needed** | **100% Free** | **No** | **Uses Open-Meteo - works automatically!** |
| OpenBreweryDB | **No Key Needed** | **Free** | **No** | **Works automatically!** |

**Static Hosting Note:** This app now runs on GitHub Pages without serverless functions. Features that previously required API key proxying (eBird, Ticketmaster, What3Words, Foursquare, Recreation.gov, NPS) have been disabled in this version.

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
- **SvelteKit** - Modern framework with static site generation
- **Svelte** - Reactive component framework
- **Vite** - Lightning-fast build tool
- Progressive Web App (PWA) with service worker
- Responsive design with CSS Grid and Flexbox
- Google Maps JavaScript API integration

### Hosting
- **GitHub Pages** - Static hosting
- **No backend required** - All APIs are client-side or free public APIs
- **Automatic deployment** via GitHub Actions

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
│   │   ├── components/      # Svelte components
│   │   └── utils/           # API utilities
│   │       ├── api.js       # Core API functions
│   │       └── api-extended.js # Extended API functions
│   └── app.html             # HTML template
├── static/                  # Static assets
│   ├── css/                 # Stylesheets
│   ├── icon-*.png           # PWA icons
│   ├── manifest.json        # PWA manifest
│   └── .nojekyll            # GitHub Pages config
├── .github/
│   └── workflows/
│       └── github-pages.yml # Deployment workflow
├── build/                   # Production build (generated)
├── svelte.config.js         # SvelteKit config (static adapter)
└── vite.config.js           # Vite config with PWA
```

## 🛡️ Security Features

✅ Google Maps API key can be restricted to specific domains  
✅ No backend API keys exposed (features requiring them are disabled)  
✅ Uses free public APIs (Open-Meteo, OpenBreweryDB)  
✅ `.gitignore` configured to prevent accidental commits  
✅ Static hosting with no server-side vulnerabilities  

## 🎨 Themes

The theme picker has been simplified to 11 curated options:
- **Basic:** Default Light, Default Dark, High-Contrast (Sunlight), Night Vision
- **Military:** Naval, Army (Temperate), Army (Arid), Air Force
- **Fun:** Arcade, Monochrome, Retro90

Each theme updates CSS variables instantly and has a matching icon set (with fallbacks) so the UI stays cohesive.

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
- [CURRENT_FEATURES.md](CURRENT_FEATURES.md) - Architecture overview & feature map
- [SvelteKit Docs](https://kit.svelte.dev/docs) - Official documentation
- [Svelte Tutorial](https://svelte.dev/tutorial) - Interactive tutorial

## 📚 Documentation

- **[CURRENT_FEATURES.md](CURRENT_FEATURES.md)** - Feature inventory and architecture overview
- **[PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)** - Deployment/readiness snapshot
- **[MOBILE_UX_IMPROVEMENTS.md](MOBILE_UX_IMPROVEMENTS.md)** - Mobile-first changes and rationale
- **[EBIRD_INTEGRATION.md](EBIRD_INTEGRATION.md)** - Bird-watching API details

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

## 🙏 Acknowledgments

- Weather data from [Open-Meteo](https://open-meteo.com/) - Free weather API
- Brewery data from [Open Brewery DB](https://www.openbrewerydb.org/) - Free brewery database
- Maps and places from [Google Maps Platform](https://developers.google.com/maps)

## 🔧 Recent Updates

### November 2025
- ✅ **Migrated to GitHub Pages** - Now using static hosting instead of Netlify
- ✅ **Simplified Architecture** - Removed serverless functions, using only free public APIs
- ✅ **Collapsible Dashboard** - Primary Actions, Weather, and Category Grid use persistent accordion
- ✅ **Navigation Dashboard** - Compass modal with heading, bearing, distance, coordinates, etc.
- ✅ **Leaflet Layer Toggle** - GPS Tracks and Day Plan maps with Street/Topo/Satellite providers
- ✅ **Theme Refresh** - 11 curated theme options

## 🐛 Issues

If you encounter any issues, please:
1. Check that GitHub Pages is enabled in your repository settings
2. Verify that the GitHub Actions workflow completed successfully
3. Ensure your Google Maps API key is properly configured (if using maps)
4. Check the browser console for any JavaScript errors
5. Open an issue on GitHub with details if the problem persists

## 📞 Support

- 📧 Issues: [GitHub Issues](https://github.com/guySteve/LocalExplorer/issues)
- 📖 Docs: See documentation files in the repository
- 💬 Discussions: [GitHub Discussions](https://github.com/guySteve/LocalExplorer/discussions)

---

**Built with ❤️ for adventure seekers**

Fork this repository and start exploring! 🗺️✨

### Quick Start
1. Fork this repository
2. Enable GitHub Pages in Settings → Pages → Source: GitHub Actions
3. (Optional) Add `MAPS_API_KEY` secret for Google Maps
4. Push to main branch - your site will deploy automatically!
