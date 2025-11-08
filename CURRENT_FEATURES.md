# LocalExplorer - Current Features & Documentation

**Last Updated:** 2025-11-03

## Table of Contents
1. [Active Features](#active-features)
2. [Technical Stack](#technical-stack)
3. [Project Structure](#project-structure)
4. [API Integrations](#api-integrations)
5. [User Interface Components](#user-interface-components)
6. [Development](#development)
7. [Deployment](#deployment)

---

## Active Features

### 🔍 Search & Discovery
- **Unified Search**: Search for places, attractions, and points of interest
- **Category Filters**: Pre-defined categories with quick access:
  - Foodie Finds (Italian, Pizza, Cafes, Bakeries, Sushi)
  - Iconic Sights (Tourist Attractions, Museums, Art Galleries, Parks, Landmarks)
  - Night Out (Bars, Night Clubs, Movie Theaters, Bowling Alleys, Concert Venues)
  - Hidden Gems (Libraries, Book Stores, Gardens, Historical Sites)
  - Pet Friendly (Dog Parks, Pet Stores, Veterinary Care, Pet Cafes/Hotels)
  - Utilities & Help (Hospitals, Pharmacies, Police, Gas Stations, ATMs)
  - Outdoor (Parks, Trails, Nature Reserves, Beaches, Campgrounds)
  - Local Events (Music, Sports, Comedy, Festivals via Ticketmaster)
  - Breweries (Nearby Breweries, Micro Breweries, Brew Pubs via OpenBreweryDB)
  - Recreation (Campgrounds, Recreation Areas, National Parks via Recreation.gov & NPS)
  - **Bird Watching** (Recent Sightings, Rare Birds, Hotspots, Notable Species via eBird)

### 🧱 Modular Dashboard
- **Collapsible Widgets:** Primary Actions, Weather Intel, and Category Grid live inside a reusable accordion so users can declutter their home screen without losing context.
- **Persistent Preferences:** Widget open/closed state is saved in `widgetCollapseState` and restored on every visit.
- **Focused CTA:** The Support / Donate prompt now lives in Settings, keeping the main canvas strictly task-focused.

### 🐦 Bird Watching (eBird Integration)
- Recent bird sightings near your location
- Notable/rare species alerts
- Birding hotspot discovery with species counts
- Distance-based searching
- Detailed observation data (species, count, location, date)
- **Note:** Cannot submit observations via app (use eBird website/app)

### 📍 Location Services
- Automatic geolocation
- Location display with city/state/country
- Distance calculations for all results
- What3Words integration for precise coordinates

### 🌤️ Weather Features
- Current weather conditions
- Temperature, description, emoji representation
- Sassy weather mode (optional humorous descriptions)
- Historical comparison: "Hotter/colder than last year"
- 7-day forecast
- Weather history tracking

### 🗺️ Place Details & Reviews
- **Google Places Reviews**:
  - Most recent review (always shown)
  - Worst review from last year (if rating ≤3)
  - Balanced view with positive review
  - Author photos, names, ratings, and text
- Address and contact information
- What3Words precise location
- Categories and ratings
- Photos (when available)
- Navigation options

### 🧭 Navigation & Compass
- **Navigation Dashboard:** Compass modal rebuilt to surface heading, bearing, distance, current/target coordinates, altitude (MSL), speed, GPS accuracy, and ETA in one glance.
- **Night Mode:** Inverts the dashboard to dim red text on black for night-vision preservation.
- **Compass Core:** Real-time device orientation, distance calculations, and voice guidance still powered by existing sensors and speech settings.

### 💾 Collections
- Save favorite places
- View saved locations
- Organized collection management
- Persistent storage (localStorage)
- **Day Plan Map:** Plan tab now shows an interactive Leaflet map with numbered stops, route lines, and Street/Topo/Satellite toggles.

### 🗺️ Tracking & Map Layers
- **GPS Track Recorder Map:** While recording, a live Leaflet map plots your breadcrumb trail and can switch between Street, Topo, and Satellite tiles with a one-tap control.
- **Leaflet Layer Toggle:** Shared `attachTileToggle` helper exposes the existing `addTileLayer` providers so pros can flip layers even offline once tiles are cached.

### 🎨 Themes
Multiple visual themes:
- **Basic:** Default Light, Default Dark, High-Contrast (Sunlight), Night Vision
- **Military:** Naval, Army (Temperate), Army (Arid), Air Force
- **Fun:** Arcade, Monochrome, Retro90
- Theme assets trimmed to match the curated set; settings menu lists only these 11.

### 📱 Mobile Optimizations
- Touch-friendly buttons (44px minimum)
- Responsive layouts for all screen sizes
- Single-column layouts on small screens
- Disabled hover effects on touch devices
- Enhanced tap feedback
- Smooth scrolling
- Prevented zoom on input focus
- Optimized modals for mobile

### ⚙️ Settings
- Theme selection
- Bird sightings toggle
- Sassy weather mode toggle
- Voice navigation enable/disable
- Voice selection for navigation

---

## Technical Stack

### Frontend
- **Framework**: SvelteKit 2.x
- **Language**: JavaScript (ES Modules)
- **Styling**: CSS (CSS Variables for theming)
- **Build Tool**: Vite 5.x
- **Package Manager**: npm

### Svelte Version
- **Current**: Svelte 4.2.20
- Uses Svelte 4 syntax (`export let`, `on:click`, `$:` reactives)

### Backend / Serverless
- **Platform**: Netlify Functions
- **Runtime**: Node.js
- **Function Language**: JavaScript

### APIs Integrated
1. **Google Maps Places API** - Places search and details
2. **eBird API v2** - Bird observations and hotspots
3. **Ticketmaster API** - Local events
4. **OpenBreweryDB API** - Brewery data
5. **Recreation.gov API** - Recreation areas and campgrounds
6. **National Park Service API** - National parks data
7. **What3Words API** - Precision location codes
8. **Open-Meteo API** - Weather data

---

## Project Structure

```
LocalExplorer/
├── src/
│   ├── routes/
│   │   ├── +layout.svelte          # App layout with Google Maps script
│   │   └── +page.svelte            # Main page with all functionality
│   ├── lib/
│   │   ├── components/              # Svelte components
│   │   │   ├── Compass.svelte
│   │   │   ├── CollectionModal.svelte
│   │   │   ├── DetailsSheet.svelte  # Place details with reviews
│   │   │   ├── DonateModal.svelte
│   │   │   ├── FilterGrid.svelte    # Category buttons
│   │   │   ├── ForecastModal.svelte
│   │   │   ├── Header.svelte
│   │   │   ├── LocationDisplay.svelte
│   │   │   ├── PrimaryActions.svelte
│   │   │   ├── ResultsModal.svelte  # Search results
│   │   │   ├── SettingsModal.svelte
│   │   │   ├── SubMenuModal.svelte  # Subcategory selection
│   │   │   ├── SupportCTA.svelte
│   │   │   ├── UnifiedSearch.svelte
│   │   │   └── WeatherSimple.svelte # Current weather component
│   │   ├── stores/
│   │   │   └── appState.js          # Global state management
│   │   └── utils/
│   │       ├── api.js               # Google Places API utilities
│   │       ├── api-extended.js      # All other API integrations
│   │       └── weatherPhrases.js    # Sassy weather descriptions
│   ├── app.html                     # HTML template
│   └── app.css                      # Global styles
├── netlify/
│   └── functions/                   # Serverless functions
│       ├── ebird.js                 # eBird API proxy (12 endpoints)
│       ├── foursquare.js            # Foursquare API proxy
│       ├── holiday.js               # Holiday API proxy
│       ├── nps.js                   # National Park Service proxy
│       ├── recreation.js            # Recreation.gov proxy
│       ├── ticketmaster.js          # Ticketmaster API proxy
│       ├── weather.js               # Weather API proxy
│       └── what3words.js            # What3Words API proxy
├── static/
│   ├── manifest.json                # PWA manifest
│   └── [other static assets]
├── EBIRD_INTEGRATION.md             # eBird features documentation
├── MOBILE_UX_IMPROVEMENTS.md        # Mobile optimization details
├── README.md                        # Project overview
└── package.json                     # Dependencies and scripts
```

---

## API Integrations

### Environment Variables Required

```bash
# Google Maps
MAPS_API_KEY=your_google_maps_api_key

# eBird (optional but recommended)
EBIRD_API_KEY=your_ebird_api_key

# Ticketmaster (optional)
TICKETMASTER_API_KEY=your_ticketmaster_key

# What3Words (optional)
WHAT3WORDS_API_KEY=your_what3words_key

# Other APIs use free tiers without keys
```

### API Rate Limits
- **eBird**: 10,000 requests/day
- **Google Places**: Based on billing plan
- **Ticketmaster**: Varies by account
- **OpenBreweryDB**: No limit (free)
- **Recreation.gov**: No documented limit
- **NPS**: No limit
- **Open-Meteo**: No limit (free)

---

## User Interface Components

### Modals
All modals feature:
- Backdrop click to close
- ESC key to close
- Smooth animations
- Mobile-optimized layouts
- Accessible (ARIA labels)

**Active Modals:**
1. **Settings Modal** - Theme and preferences
2. **Collection Modal** - Saved places
3. **SubMenu Modal** - Category subcategories
4. **Results Modal** - Search results list
5. **Details Sheet** - Place information and reviews
6. **Forecast Modal** - 7-day weather forecast
7. **Donate Modal** - Support information
8. **Compass Overlay** - Navigation compass

### Interactive Elements
- All buttons have visual feedback
- Touch targets meet 44px minimum
- Keyboard navigation supported
- Screen reader friendly

---

## Development

### Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type check
npm run check
```

### Development Server
- Runs on `http://localhost:5173`
- Hot module replacement (HMR)
- Fast refresh

### Build Process
1. SvelteKit builds to `.svelte-kit/output`
2. Netlify adapter processes for deployment
3. Environment variables injected during build
4. Service worker generated for PWA

### Code Standards
- Svelte 4 syntax (not Svelte 5)
- ES modules
- CSS variables for theming
- Semantic HTML
- Accessibility best practices

---

## Deployment

### Automatic CI/CD via GitHub Actions

**Every push to `main` triggers automatic deployment!**

The repository includes `.github/workflows/netlify-deploy.yml` which:
- Runs on push to `main` branch
- Runs on pull requests (preview deployments)
- Can be manually triggered via workflow_dispatch
- Uses Netlify GitHub Action for seamless deployment

#### GitHub Actions Setup
```yaml
Required Secrets (in repo settings):
- NETLIFY_AUTH_TOKEN
- NETLIFY_SITE_ID
```

#### Deployment Flow
1. Code pushed to main/PR created
2. GitHub Actions checks out code
3. Node.js 18 environment set up
4. Dependencies installed (npm ci)
5. Deployed to Netlify via actions-netlify
6. Netlify builds with environment variables
7. Functions deployed to edge
8. Site live with CDN

### Netlify Configuration

The `netlify.toml` file configures:
- **Build command:** `npm run build`
- **Publish directory:** `build`
- **Functions directory:** `netlify/functions`
- **Security headers:** CSP, XSS protection, frame options
- **Cache control:** Long-term caching for static assets
- **Redirects:** PWA fallback routing

#### Security Headers Applied
```
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: strict-origin-when-cross-origin
- Content-Security-Policy: (comprehensive CSP)
```

### Environment Variables

**Required:**
```bash
MAPS_API_KEY=your_google_maps_api_key
```

**Optional (features work without these):**
```bash
EBIRD_API_KEY=your_ebird_api_key
TICKETMASTER_API_KEY=your_ticketmaster_api_key
WHAT3WORDS_API_KEY=your_what3words_api_key
RECREATION_GOV_API_KEY=your_recreation_gov_api_key
NPS_API_KEY=your_nps_api_key
```

Set these in:
- **Netlify Dashboard:** Site settings → Environment variables
- **Local Development:** Copy `.env.example` to `.env`

### Manual Deployment

If needed, you can deploy manually:

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Initialize (first time)
netlify init

# Deploy to production
netlify deploy --prod

# Or use npm script
npm run deploy
```

### Build Process

1. **SvelteKit Build:**
   ```bash
   vite build
   ```
   - Compiles Svelte components
   - Bundles JavaScript with tree-shaking
   - Optimizes CSS
   - Generates static assets

2. **Netlify Adapter:**
   - Converts SvelteKit output for Netlify
   - Prepares serverless functions
   - Configures redirects and headers

3. **Environment Injection:**
   ```bash
   node netlify/inject-env.js
   ```
   - Injects MAPS_API_KEY into built files
   - Maintains security (key only in output, not source)

4. **PWA Service Worker:**
   - Vite PWA plugin generates service worker
   - Precaches static assets
   - Enables offline functionality
   - Manages cache strategies

### Deployment Checklist

Before deploying:
- ✅ `npm run check` passes (0 errors)
- ✅ All required environment variables set in Netlify
- ✅ `netlify.toml` configuration correct
- ✅ GitHub secrets configured for Actions
- ✅ `.env.example` matches production requirements
- ✅ Service worker configuration valid
- ✅ Functions tested locally

After deployment:
- ✅ Site loads correctly
- ✅ Google Maps displays (MAPS_API_KEY works)
- ✅ Weather widget shows data (no key needed)
- ✅ Search functionality operational
- ✅ Optional features work if keys provided
- ✅ PWA installs correctly
- ✅ Service worker active
- ✅ All modals and interactions work

### Monitoring & Logs

**Netlify Dashboard provides:**
- Build logs (view build output)
- Function logs (serverless function calls)
- Deploy history (rollback capability)
- Analytics (if enabled)
- Real-time deploys (track progress)

**GitHub Actions provides:**
- Workflow run history
- Build status badges
- PR deployment comments
- Failure notifications

---

## Known Limitations

1. **eBird Observations**: Cannot submit observations via API (use eBird website/app)
2. **Google Places Reviews**: Limited to what Google provides (not all places have reviews)
3. **Location Services**: Requires user permission for accurate results
4. **Compass**: Requires device with orientation sensors
5. **Voice Navigation**: Requires browser support for Web Speech API
6. **Offline**: Some features require internet connection

---

## Feature Status

### ✅ Fully Functional
- Search and discovery
- All category filters
- Bird watching features
- Weather display
- Place details with reviews
- Navigation compass
- Collections
- Theme switching
- Mobile optimization

### 🚧 No Longer Supported
- "Happening Near You" component (removed per user request)
- Old weather components (Weather.svelte, WeatherWidget.svelte)

---

## Support & Resources

### Documentation
- **This File**: Complete feature reference
- **EBIRD_INTEGRATION.md**: Detailed eBird features
- **MOBILE_UX_IMPROVEMENTS.md**: Mobile optimization details
- **README.md**: Quick start guide

### External Resources
- **SvelteKit**: https://kit.svelte.dev/docs
- **Svelte**: https://svelte.dev/docs
- **eBird API**: https://documenter.getpostman.com/view/664302/S1ENwy59
- **Google Places**: https://developers.google.com/maps/documentation/places

---

## Recent Changes

### Latest Updates (November 2025)
1. ✅ Removed "Happening Near You" component
2. ✅ Added Google Places reviews (with intelligent filtering)
3. ✅ Expanded eBird integration (12 endpoints, 4 UI features)
4. ✅ Enhanced mobile optimizations
5. ✅ Cleaned up unused components and documentation
6. ✅ Fixed code review issues

### Previous Updates
- Downgraded from Svelte 5 to Svelte 4 for stability
- Added comprehensive bird watching features
- Implemented compass navigation with voice guidance
- Created theme system with 26 themes
- Mobile-first responsive design

---

**For the most up-to-date information, check the git commit history.**
