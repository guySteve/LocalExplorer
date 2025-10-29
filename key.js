// API Configuration for LocalExplorer
// This file configures the app to use secure Netlify Functions for API requests.
// API keys are stored securely as environment variables in Netlify.

// For local development, you can set your Google Maps API key here
// (Google Maps must be loaded client-side)
window.MAPS_API_KEY = window.MAPS_API_KEY || 'AIzaSyB9PMHJVDip9WvIQVywmRjcdhqiQPrtXiY';

// All other API keys are now secured via Netlify Functions
// The frontend will make requests to these serverless endpoints:
window.USE_NETLIFY_FUNCTIONS = true;
window.NETLIFY_FUNCTIONS_BASE = '/.netlify/functions';

