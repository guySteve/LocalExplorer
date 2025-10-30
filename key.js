// API Configuration for LocalExplorer
// This file configures the app to use secure Netlify Functions for API requests.
// API keys are stored securely as environment variables in Netlify.

// SECURITY NOTE: The Google Maps API key MUST be client-side for Google Maps JavaScript API
// It should be restricted in Google Cloud Console to only work with your specific domain(s).
// 
// RECOMMENDED RESTRICTIONS for production:
// 1. Application restrictions: Set to "HTTP referrers (web sites)"
// 2. Website restrictions: Add your Netlify domain (e.g., *.netlify.app, yourdomain.com)
// 3. API restrictions: Limit to "Maps JavaScript API", "Places API", and "Geocoding API" only
//
// The Maps API key can be set as an environment variable in Netlify build settings
// and injected during build, or set directly here for client-side use.
// For Netlify deployment, set MAPS_API_KEY in environment variables and it will be
// available at window.MAPS_API_KEY when the site is built.

// The Maps API key is injected during build from Netlify environment variables
// It is set by the netlify/inject-env.js script during deployment
// window.MAPS_API_KEY will be set during build process

// All other API keys are secured via Netlify Functions
// The frontend will make requests to these serverless endpoints:
window.USE_NETLIFY_FUNCTIONS = true;
window.NETLIFY_FUNCTIONS_BASE = '/.netlify/functions';

