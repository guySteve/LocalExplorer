// API Configuration for LocalExplorer
// This file configures the app to use secure Netlify Functions for API requests.
// API keys are stored securely as environment variables in Netlify.

// =============================================================================
// GOOGLE MAPS API KEY CONFIGURATION
// =============================================================================
// SECURITY NOTE: The Google Maps API key MUST be client-side for Google Maps JavaScript API
// It should be restricted in Google Cloud Console to only work with your specific domain(s).
// 
// RECOMMENDED RESTRICTIONS for production:
// 1. Application restrictions: Set to "HTTP referrers (web sites)"
// 2. Website restrictions: Add your Netlify domain (e.g., *.netlify.app, yourdomain.com)
// 3. API restrictions: Limit to "Maps JavaScript API", "Places API", and "Geocoding API" only
//
// SETUP INSTRUCTIONS:
// 1. Get your API key: https://developers.google.com/maps/documentation/javascript/get-api-key
// 2. Enable required APIs in Google Cloud Console:
//    - Maps JavaScript API
//    - Places API
//    - Geocoding API
// 3. Configure the key:
//    
//    FOR NETLIFY DEPLOYMENT:
//    - Go to Site Settings → Environment Variables
//    - Add: MAPS_API_KEY = your_actual_api_key
//    - Redeploy the site
//    
//    FOR LOCAL DEVELOPMENT:
//    - Create a .env file in the project root
//    - Add: MAPS_API_KEY=your_actual_api_key
//    - Run: npm run dev
//    
//    FOR MANUAL CONFIGURATION (Not Recommended):
//    - Uncomment the line below and add your key
//    - WARNING: Never commit API keys to git!
//
// window.MAPS_API_KEY = 'YOUR_KEY';

// The Maps API key is injected during build from Netlify environment variables
// It is set by the netlify/inject-env.js script during deployment
// window.MAPS_API_KEY will be set during build process

// If the Maps API key is not configured, the app will show a setup guide
// and will still function for some features (weather, manual location input, etc.)

// =============================================================================
// ALL OTHER API KEYS ARE SECURED VIA NETLIFY FUNCTIONS
// =============================================================================
// The frontend will make requests to these serverless endpoints:
window.USE_NETLIFY_FUNCTIONS = true;
window.NETLIFY_FUNCTIONS_BASE = '/.netlify/functions';

