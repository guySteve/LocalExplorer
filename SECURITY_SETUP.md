# Securing API Keys for LocalExplorer on Netlify

This guide explains how to securely configure API keys for the LocalExplorer application when deploying to Netlify.

## Overview

API keys have been moved from client-side code to secure serverless functions (Netlify Functions). This prevents API keys from being exposed in the browser and protects them from unauthorized use.

## Architecture

- **Frontend**: Makes requests to Netlify Functions instead of directly calling external APIs
- **Netlify Functions**: Serverless functions that securely proxy requests to external APIs
- **Environment Variables**: API keys stored securely in Netlify's environment variable system

## Required API Keys

You'll need to obtain API keys for the following services:

1. **Google Maps API** (Required for map functionality)
   - Get key: https://developers.google.com/maps/documentation/javascript/get-api-key
   - Note: This key must be set client-side due to Google Maps SDK requirements

2. **Ticketmaster API** (For events)
   - Get key: https://developer.ticketmaster.com/

3. **What3Words API** (For location addressing)
   - Get key: https://accounts.what3words.com/register

4. **Foursquare API** (For place searches)
   - Get key: https://foursquare.com/developers/

5. **eBird API** (For bird sighting data)
   - Get key: https://ebird.org/api/keygen

6. **Recreation.gov API** (For recreation area data)
   - Get key: https://ridb.recreation.gov/

7. **National Park Service API** (For NPS data)
   - Get key: https://www.nps.gov/subjects/developer/get-started.htm

8. **HolidayAPI** (For holiday alerts)
   - Get key: https://holidayapi.com/

## Setting Up Environment Variables in Netlify

### Step 1: Deploy to Netlify

1. Connect your GitHub repository to Netlify
2. In Netlify, go to: **Site settings** → **Build & deploy** → **Environment**

### Step 2: Add Environment Variables

Add the following environment variables in Netlify:

```
MAPS_API_KEY=your_google_maps_api_key_here
TICKETMASTER_API_KEY=your_ticketmaster_api_key_here
HOLIDAY_API_KEY=your_holiday_api_key_here
WHAT3WORDS_API_KEY=your_what3words_api_key_here
FOURSQUARE_API_KEY=your_foursquare_api_key_here
EBIRD_API_KEY=your_ebird_api_key_here
RECREATION_GOV_API_KEY=your_recreation_gov_api_key_here
NPS_API_KEY=your_nps_api_key_here
```

**Important**: Replace the placeholder values with your actual API keys.

### Step 3: Redeploy

After adding the environment variables, trigger a new deployment for the changes to take effect.

## Local Development

For local development:

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in your API keys in the `.env` file

3. Install Netlify CLI:
   ```bash
   npm install -g netlify-cli
   ```

4. Run the development server:
   ```bash
   netlify dev
   ```

This will run the site locally with access to Netlify Functions.

## Security Best Practices

1. **Never commit API keys to Git**
   - The `.gitignore` file is configured to exclude `key.js` and `.env` files

2. **Rotate keys if exposed**
   - If you accidentally commit an API key, revoke it immediately and generate a new one

3. **Use API key restrictions**
   - Where possible (e.g., Google Maps), restrict API keys to specific domains

4. **Monitor usage**
   - Regularly check your API usage dashboards to detect any unauthorized use

## Netlify Functions

The following serverless functions have been created:

- `netlify/functions/ticketmaster.js` - Proxies Ticketmaster API requests
- `netlify/functions/what3words.js` - Proxies What3Words API requests
- `netlify/functions/foursquare.js` - Proxies Foursquare API requests
- `netlify/functions/ebird.js` - Proxies eBird API requests
- `netlify/functions/holiday.js` - Proxies HolidayAPI requests
- `netlify/functions/recreation.js` - Proxies Recreation.gov API requests
- `netlify/functions/nps.js` - Proxies National Park Service API requests

These functions are automatically deployed when you push to your Netlify-connected repository.

## Troubleshooting

### Functions Not Working

1. Check that environment variables are set correctly in Netlify
2. Verify the function logs in Netlify: **Functions** → Select function → **Function log**
3. Ensure you've redeployed after adding environment variables

### API Rate Limits

If you hit API rate limits, consider:
- Implementing caching in the serverless functions
- Upgrading to paid API tiers if available
- Reducing the frequency of API calls

## Support

If you encounter issues, check the browser console and Netlify function logs for error messages.
