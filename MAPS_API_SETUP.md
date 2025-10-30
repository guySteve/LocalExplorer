# Google Maps API Setup Guide

## Overview
This guide explains how to properly configure the Google Maps API for Local Explorer.

## Recent Changes

### Performance Improvements
- ✅ Added `loading=async` parameter to Maps API script to improve load performance
- ✅ Fixed location detection to work even when Maps API is still loading
- ✅ Weather and bird sightings now update independently of Maps API status

### Deprecation Notice
Google has deprecated `google.maps.places.PlacesService` as of March 1st, 2025. While it continues to work and will be supported with 12 months notice before discontinuation, migration to the new Place API is recommended for future-proofing.

## API Key Configuration

### Step 1: Get Your API Key
1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - Maps JavaScript API
   - Places API
   - Geocoding API
4. Create credentials (API Key)

### Step 2: Configure API Restrictions

#### Application Restrictions
Set to "HTTP referrers (web sites)" and add your domains:
- For production: `*.netlify.app`, `yourdomain.com`
- For local development: `localhost:*`, `127.0.0.1:*`

#### API Restrictions
Limit the key to only these APIs:
- Maps JavaScript API
- Places API
- Geocoding API

### Step 3: Deploy the API Key

#### For Netlify Deployment (Recommended)
1. Go to your Netlify site dashboard
2. Navigate to Site Settings → Environment Variables
3. Add: `MAPS_API_KEY = your_actual_api_key`
4. Redeploy your site

The key will be automatically injected during build by `netlify/inject-env.js`.

#### For Local Development
Create a `.env` file in the project root:
```
MAPS_API_KEY=your_actual_api_key
```

Then run:
```bash
npm run dev
```

#### Alternative: Manual Configuration (Not Recommended)
Edit `key.js` and uncomment the line:
```javascript
window.MAPS_API_KEY = 'your_actual_api_key';
```

**WARNING:** Never commit API keys to git! The `.gitignore` file excludes `key.js` by default.

## Features That Work Without Maps API

The following features function independently of Google Maps:
- ✅ Weather forecasts (uses Open-Meteo API - free, no key required)
- ✅ Bird sightings (uses eBird API via Netlify Functions)
- ✅ Location input via manual entry
- ✅ Basic UI and navigation

## Features That Require Maps API

The following features need Maps API to be properly configured:
- 📍 Automatic geolocation with reverse geocoding
- 📍 Place search (restaurants, attractions, etc.)
- 📍 Place details (reviews, hours, ratings)
- 📍 Interactive maps and Street View
- 📍 Turn-by-turn directions

## Future Migration: Places API

### Current Implementation
The app currently uses the legacy `google.maps.places.PlacesService` which includes:
- `nearbySearch()` for finding places
- `getDetails()` for place information

### Recommended Future Migration
Google recommends migrating to the new Place API:
- Replace `nearbySearch()` with `Place.searchNearby()`
- Replace `getDetails()` with `Place.fetchFields()`

Migration guide: https://developers.google.com/maps/documentation/javascript/places-migration-overview

**Timeline:** The legacy API will continue to work with 12 months notice before any discontinuation.

## Troubleshooting

### "RefererNotAllowedMapError"
Your API key has referrer restrictions that don't include the current domain. Add your domain to the HTTP referrer list in Google Cloud Console.

### "Maps services failed to load"
1. Check that your API key is properly configured
2. Verify the required APIs are enabled in Google Cloud Console
3. Check browser console for specific error messages
4. Ensure no ad blockers or privacy extensions are blocking Maps API

### Weather/Location Not Updating
If the app shows "Enter a location to see the latest weather":
1. Enable GPS/location permissions in your browser
2. Or manually enter a location in the input field
3. Weather works independently of Maps API

### No Bird Sightings Visible
Bird sightings require:
1. A valid location (GPS or manual entry)
2. eBird API key configured in Netlify environment variables
3. The "Bird sightings" toggle enabled in Settings

## Performance Best Practices

### Current Optimizations
- ✅ `loading=async` parameter for Maps script
- ✅ Deferred script loading
- ✅ Service Worker for offline support
- ✅ Preconnect hints for Google Fonts
- ✅ PWA icons and manifest

### Lighthouse Score Targets
- Performance: 100
- Accessibility: 100
- Best Practices: 100
- SEO: 100

The app is optimized to achieve perfect Lighthouse scores on properly configured deployments.

## Support

For issues or questions:
1. Check the browser console for error messages
2. Verify API key configuration
3. Ensure all required APIs are enabled
4. Check that your deployment includes all required environment variables
