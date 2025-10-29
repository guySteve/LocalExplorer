// API Configuration for LocalExplorer
// This file configures the app to use secure Netlify Functions for API requests.
// API keys are stored securely as environment variables in Netlify.

// SECURITY NOTE: The Google Maps API key below should be restricted in Google Cloud Console
// to only work with your specific domain(s). This key must be client-side for Google Maps SDK.
// 
// RECOMMENDED RESTRICTIONS for production:
// 1. Application restrictions: Set to "HTTP referrers (web sites)"
// 2. Website restrictions: Add your Netlify domain (e.g., *.netlify.app, yourdomain.com)
// 3. API restrictions: Limit to "Maps JavaScript API" and "Places API" only
//
// For local development, you can set your Google Maps API key here
// (Google Maps must be loaded client-side)
window.MAPS_API_KEY = window.MAPS_API_KEY || 'YOUR_GOOGLE_MAPS_API_KEY_HERE';

// All other API keys are now secured via Netlify Functions
// The frontend will make requests to these serverless endpoints:
window.USE_NETLIFY_FUNCTIONS = true;
window.NETLIFY_FUNCTIONS_BASE = '/.netlify/functions';

