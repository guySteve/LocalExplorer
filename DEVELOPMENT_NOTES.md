# LocalExplorer Development Notes

## Overview
LocalExplorer is a Progressive Web App (PWA) built with SvelteKit for discovering local attractions, events, and activities.

## Technology Stack
- **Framework**: SvelteKit 2.48.4
- **Build Tool**: Vite 7.1.12
- **UI Framework**: Svelte 5.43.2
- **PWA**: vite-plugin-pwa 1.1.0
- **Service Worker**: Workbox 7.3.0
- **Deployment**: Netlify with serverless functions

## Architecture

### Frontend
```
src/
├── routes/
│   ├── +layout.svelte   # App layout with Google Maps SDK
│   └── +page.svelte     # Main application page
├── lib/
│   ├── components/      # Svelte components
│   ├── stores/          # State management
│   └── utils/           # API utilities
└── app.html             # HTML template
```

### Backend
```
netlify/functions/       # Serverless API proxies
├── ticketmaster.js      # Events API
├── what3words.js        # Location API
├── foursquare.js        # Places API
├── ebird.js            # Bird sightings API
├── holiday.js          # Holiday API
├── recreation.js       # Recreation areas API
└── nps.js              # National Parks API
```

## Key Features

### Core Components
- **Weather Widget** (`WeatherSimple.svelte`)
  - Uses Open-Meteo API (free, no key required)
  - Shows current weather and 7-day forecast
  - Compares current temperature to same date last year
  - Integrates bird sightings (when enabled)

- **Compass** (`Compass.svelte`)
  - 3D gyroscopic compass with device orientation
  - Voice-guided turn-by-turn navigation
  - GPS tracking and location accuracy
  - Automatic sensor permission request

- **Settings** (`SettingsModal.svelte`)
  - Theme selection (20+ themes)
  - Bird sightings toggle
  - Voice navigation toggle
  - Voice selection for navigation

### State Management
- Uses Svelte stores for reactive state
- Persists settings in localStorage
- Store files: `appState.js`, `storage.js`

## API Integration

### Required API Keys
| Service | Free Tier | Required | Usage |
|---------|-----------|----------|-------|
| Google Maps | Yes | Yes | Maps and location services |
| Open-Meteo | Yes (no key) | No | Weather data |
| Ticketmaster | Yes | Optional | Event listings |
| What3Words | Yes | Optional | Precise location addressing |
| Foursquare | Yes | Optional | Place discovery |
| eBird | Yes | Optional | Bird sightings |
| Recreation.gov | Yes | Optional | Recreation areas |
| NPS | Yes | Optional | National parks |
| HolidayAPI | Limited | Optional | Holiday information |

### Environment Variables
Set these in Netlify dashboard:
- `MAPS_API_KEY` or `GOOGLE_MAPS_API_KEY`
- `TICKETMASTER_API_KEY`
- `WHAT3WORDS_API_KEY`
- `FOURSQUARE_API_KEY`
- `EBIRD_API_KEY`
- `RECREATION_GOV_API_KEY`
- `NPS_API_KEY`
- `HOLIDAY_API_KEY`

## Development

### Local Development
```bash
# Install dependencies
npm install

# Create .env file for local API keys
cp .env.example .env

# Start dev server
npm run dev
```

### Building
```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

### Deployment
```bash
# Deploy to Netlify
npm run deploy

# Or use GitHub Actions for automated deployment
# See GITHUB_ACTIONS_DEPLOY.md for setup
```

## Recent Changes

### Weather System (Nov 2025)
- Replaced "past 30 days" view with "compared to last year" feature
- Shows if current weather is hotter or colder than same date last year
- Improved visual comparison with color-coded indicators

### Compass (Nov 2025)
- Fixed automatic sensor permission request on open
- No longer requires manual "Activate Sensors" button click
- Improved initialization flow

### Code Quality
- Consolidated redundant documentation files
- Removed unused components (WeatherWidget.svelte)
- Improved build process and error handling

## Testing

### Manual Testing Checklist
- [ ] Weather loads and displays correctly
- [ ] Weather comparison to last year works
- [ ] 7-day forecast displays properly
- [ ] Compass opens and requests permissions automatically
- [ ] Compass orientation updates correctly
- [ ] Settings persist across page reloads
- [ ] Theme changes apply correctly
- [ ] All buttons respond to clicks
- [ ] Location services work properly
- [ ] API integrations function as expected

### Build Verification
```bash
npm run build
# Should complete without errors
# Verify service worker is generated
```

## Troubleshooting

### Common Issues

**Weather not loading:**
- Check internet connection
- Verify Open-Meteo API is accessible
- Check browser console for errors

**Compass not working:**
- Ensure device has gyroscope/orientation sensors
- Grant sensor permissions when prompted
- Use HTTPS (required for sensor access)
- Try on a mobile device (better sensor support)

**Maps not loading:**
- Verify MAPS_API_KEY is set in Netlify
- Check browser console for API key errors
- Ensure Maps JavaScript API is enabled in Google Console

**Location not working:**
- Grant location permissions when prompted
- Ensure HTTPS is being used
- Check device location services are enabled

### Build Issues
If build fails:
1. Delete `.svelte-kit` and `node_modules`
2. Run `npm install`
3. Run `npm run build`

## Performance

### Bundle Size
- Optimized with automatic code splitting
- Service worker precaches ~275 KB
- Svelte compiles to minimal JavaScript

### PWA Features
- ✅ Installable on mobile and desktop
- ✅ Offline support with service worker
- ✅ Fast loading with caching strategies
- ✅ App-like experience

## Security

### Best Practices
- ✅ API keys stored as environment variables
- ✅ Serverless functions proxy API requests
- ✅ No secrets in client code
- ✅ CORS properly configured
- ✅ Input validation on endpoints

### Privacy
- Location data stays on device
- No tracking or analytics by default
- User preferences stored locally

## Contributing

### Code Style
- Use Svelte conventions
- Follow existing component patterns
- Add comments for complex logic
- Keep functions focused and small

### Component Guidelines
- Use Svelte 5 runes syntax (`$props`, `$state`, `$derived`, `$effect`)
- Dispatch events for parent communication
- Keep components reusable when possible
- Use CSS custom properties for theming

## Additional Resources

### Documentation
- [SvelteKit Docs](https://kit.svelte.dev/docs)
- [Svelte Tutorial](https://svelte.dev/tutorial)
- [Vite Docs](https://vitejs.dev/)

### Project Docs
- [README.md](README.md) - Project overview
- [NETLIFY_DEPLOY.md](NETLIFY_DEPLOY.md) - Deployment guide
- [GITHUB_ACTIONS_DEPLOY.md](GITHUB_ACTIONS_DEPLOY.md) - CI/CD setup

---

**Last Updated**: November 2025  
**Maintained by**: LocalExplorer Team
