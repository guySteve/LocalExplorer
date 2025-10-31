# SvelteKit Migration Guide

## Overview

LocalExplorer has been migrated from vanilla JavaScript to **SvelteKit**, a modern framework that provides:

- ⚡ **Faster Development**: Hot module replacement and instant updates
- 🎯 **Better Organization**: Component-based architecture with Svelte
- 📦 **Optimized Builds**: Automatic code splitting and tree-shaking
- 🔧 **Type Safety**: Optional TypeScript support with JSDoc
- 🚀 **Enhanced PWA**: Modern service worker with Workbox
- 🌐 **SSR Ready**: Server-side rendering capabilities (if needed)

## What Changed

### Project Structure

```
LocalExplorer/
├── src/
│   ├── routes/              # SvelteKit pages and layouts
│   │   ├── +layout.svelte   # App layout
│   │   └── +page.svelte     # Homepage
│   ├── lib/
│   │   ├── stores/          # Svelte stores for state management
│   │   │   ├── appState.js  # Global app state
│   │   │   └── storage.js   # LocalStorage utilities
│   │   └── components/      # Reusable Svelte components
│   └── app.html             # HTML template
├── static/                  # Static assets (CSS, images, manifest)
├── build/                   # Production build output
├── netlify/                 # Netlify serverless functions (unchanged)
├── svelte.config.js         # SvelteKit configuration
├── vite.config.js           # Vite configuration with PWA
└── _redirects               # Netlify redirects for SPA routing
```

### Key Files

- **`src/app.html`**: Replaces `index.html`, contains the HTML shell
- **`src/routes/+layout.svelte`**: App-wide layout wrapper
- **`src/routes/+page.svelte`**: Main page component
- **`src/lib/stores/`**: State management using Svelte stores
- **`vite.config.js`**: Build configuration with PWA plugin

### State Management

The vanilla JS global variables have been converted to **Svelte stores**:

```javascript
// Old (vanilla JS)
let currentTheme = DEFAULT_THEME;
let currentPosition = null;

// New (Svelte store)
import { currentTheme, currentPosition } from '$lib/stores/appState';

// Read value
$currentTheme

// Update value
currentTheme.set('sunset');
```

### PWA Configuration

Service worker is now managed by **vite-plugin-pwa** with automatic:
- Precaching of static assets
- Runtime caching strategies
- Workbox integration
- Automatic manifest generation

## Development

### Prerequisites

- Node.js 18+ 
- npm or pnpm

### Commands

```bash
# Install dependencies
npm install

# Start development server (with hot reload)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type checking (optional)
npm run check
```

### Development Server

The dev server runs at `http://localhost:5173` by default.

Changes to `.svelte` files hot-reload instantly without page refresh!

## Building & Deployment

### Production Build

```bash
npm run build
```

This creates an optimized build in the `build/` directory with:
- Minified JavaScript and CSS
- Service worker with precaching
- Optimized assets
- Split bundles for faster loading

### Netlify Deployment

The app uses **@sveltejs/adapter-netlify** for seamless Netlify deployment:

1. **Automatic**: Push to main branch (if GitHub Actions is configured)
2. **Manual**: `npm run deploy`
3. **One-Click**: Use the "Deploy to Netlify" button

#### Netlify Configuration

- **Build command**: `npm run build`
- **Publish directory**: `build`
- **Functions directory**: `netlify/functions` (unchanged)

### Environment Variables

Set these in Netlify dashboard (same as before):
- `TICKETMASTER_API_KEY`
- `HOLIDAY_API_KEY`
- `WHAT3WORDS_API_KEY`
- `FOURSQUARE_API_KEY`
- `EBIRD_API_KEY`
- `RECREATION_GOV_API_KEY`
- `NPS_API_KEY`

Note: `MAPS_API_KEY` is still in `key.js` (loaded from static)

## Migration Status

### ✅ Completed

- [x] SvelteKit setup and configuration
- [x] Project structure migration
- [x] State management (Svelte stores)
- [x] Build system (Vite)
- [x] PWA configuration
- [x] Netlify adapter
- [x] Theme system
- [x] LocalStorage utilities
- [x] Basic UI structure

### 🚧 In Progress

- [ ] Full component migration (Weather, Compass, Modals)
- [ ] Google Maps integration
- [ ] API integrations (all providers)
- [ ] Complete UI/UX parity

### 📝 Remaining

- [ ] E2E testing
- [ ] Performance optimization
- [ ] Documentation updates
- [ ] Migration guide for contributors

## Benefits of SvelteKit

### Developer Experience

- **Hot Module Replacement**: Changes reflect instantly
- **Better Debugging**: Source maps and dev tools
- **Less Boilerplate**: Svelte's reactive syntax is concise
- **Component Reusability**: Easy to create and share components

### Performance

- **Smaller Bundle Size**: Svelte compiles to vanilla JS (no runtime)
- **Faster Initial Load**: Code splitting and lazy loading
- **Optimized PWA**: Modern service worker strategies
- **Better SEO**: Optional SSR for search engines

### Maintainability

- **Organized Structure**: Clear separation of concerns
- **Type Safety**: JSDoc or TypeScript support
- **Testing**: Better tooling for unit and integration tests
- **Scalability**: Easy to add new features and routes

## Backwards Compatibility

### User Data

All user data (saved places, plans, settings) stored in `localStorage` is **fully compatible**. No data migration needed!

### API Keys

Existing API keys and environment variables work without changes.

### Netlify Functions

Serverless functions in `netlify/functions/` remain unchanged and fully compatible.

## Troubleshooting

### Build Errors

```bash
# Clear cache and rebuild
rm -rf .svelte-kit node_modules
npm install
npm run build
```

### Dev Server Issues

```bash
# Try a different port
npm run dev -- --port 3000
```

### PWA Not Working

Check that:
1. You're on HTTPS (or localhost)
2. Service worker is registered in browser dev tools
3. Manifest is properly linked

## Resources

- [SvelteKit Documentation](https://kit.svelte.dev/docs)
- [Svelte Tutorial](https://svelte.dev/tutorial)
- [Vite Documentation](https://vitejs.dev/)
- [vite-plugin-pwa](https://vite-pwa-org.netlify.app/)
- [Netlify Adapter](https://github.com/sveltejs/kit/tree/master/packages/adapter-netlify)

## Contributing

For contributors:

1. Familiarize yourself with [Svelte basics](https://svelte.dev/tutorial)
2. Understand [SvelteKit routing](https://kit.svelte.dev/docs/routing)
3. Follow the existing component structure
4. Test both dev and production builds
5. Ensure PWA functionality works

## Questions?

Open an issue or discussion on GitHub if you have questions about the migration!
