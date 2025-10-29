# 🗺️ LocalExplorer

A Progressive Web App for discovering local attractions, events, and activities. Built with vanilla JavaScript and designed for adventure seekers who want to explore their surroundings.

## ✨ Features

- 🎫 **Local Events** - Discover concerts, sports, and entertainment (Ticketmaster)
- 🐦 **Bird Watching** - View recent bird sightings in your area (eBird)
- 🏞️ **National Parks** - Find and explore nearby parks (NPS)
- 🏕️ **Recreation Areas** - Discover camping and outdoor activities (Recreation.gov)
- 🍺 **Breweries** - Locate nearby breweries (Open Brewery DB)
- 📍 **What3Words** - Precise location addressing
- 🗺️ **Interactive Maps** - Google Maps integration
- 🌤️ **Weather** - Local weather forecasts (Open-Meteo)
- 📅 **Holiday Alerts** - Plan around local holidays
- 🧭 **Compass Navigation** - Navigate to your destinations
- 💾 **Offline Support** - Progressive Web App with service worker

## 🔐 Security

**All API keys are secured!** This app uses Netlify serverless functions to protect API keys from exposure. API keys are stored as environment variables and never exposed to the client.

### 🚀 Getting Started

#### Prerequisites

- A Netlify account (free tier works great!)
- API keys for the services you want to use (see below)

#### Deployment to Netlify

1. **Fork or Clone this repository**

2. **Connect to Netlify**
   - Go to [Netlify](https://app.netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Connect your GitHub repository

3. **Set Environment Variables**
   
   Go to: Site settings → Environment variables
   
   Add these environment variables with your API keys:
   
   ```
   MAPS_API_KEY=your_google_maps_key
   TICKETMASTER_API_KEY=your_ticketmaster_key
   HOLIDAY_API_KEY=your_holiday_api_key
   WHAT3WORDS_API_KEY=your_what3words_key
   FOURSQUARE_API_KEY=your_foursquare_key
   EBIRD_API_KEY=your_ebird_key
   RECREATION_GOV_API_KEY=your_recreation_key
   NPS_API_KEY=your_nps_key
   ```

4. **Deploy**
   - Click "Deploy site"
   - Wait for deployment to complete
   - Your app is live! 🎉

#### Obtaining API Keys

| Service | Get Key | Free Tier | Required |
|---------|---------|-----------|----------|
| Google Maps | [Get Key](https://developers.google.com/maps/documentation/javascript/get-api-key) | Yes | Yes |
| Ticketmaster | [Get Key](https://developer.ticketmaster.com/) | Yes | Optional |
| What3Words | [Get Key](https://accounts.what3words.com/register) | Yes | Optional |
| Foursquare | [Get Key](https://foursquare.com/developers/) | Yes | Optional |
| eBird | [Get Key](https://ebird.org/api/keygen) | Yes | Optional |
| Recreation.gov | [Get Key](https://ridb.recreation.gov/) | Yes | Optional |
| NPS | [Get Key](https://www.nps.gov/subjects/developer/get-started.htm) | Yes | Optional |
| HolidayAPI | [Get Key](https://holidayapi.com/) | Limited | Optional |

**Note**: The app will work with just Google Maps, but other features require their respective API keys.

### 📖 Documentation

- **[ACTION_REQUIRED.md](ACTION_REQUIRED.md)** - ⭐ Start here! Immediate setup steps
- **[QUICK_START.md](QUICK_START.md)** - Quick reference guide
- **[SECURITY_SETUP.md](SECURITY_SETUP.md)** - Detailed security setup
- **[DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)** - Complete deployment guide

## 💻 Local Development

To run the app locally with Netlify Functions:

```bash
# Install Netlify CLI globally
npm install -g netlify-cli

# Install dependencies
npm install

# Create local environment file
cp .env.example .env

# Edit .env and add your API keys
nano .env  # or use your preferred editor

# Start the development server
npm run dev
```

The app will be available at `http://localhost:8888` with Netlify Functions running locally.

## 🏗️ Architecture

### Frontend
- Vanilla JavaScript (no framework dependencies)
- Progressive Web App (PWA) with service worker
- Responsive design with CSS Grid and Flexbox
- Google Maps JavaScript API integration

### Backend (Serverless)
- Netlify Functions (AWS Lambda)
- 7 serverless functions proxying API requests
- Environment-based configuration
- CORS enabled for cross-origin requests

### File Structure

```
LocalExplorer/
├── netlify/
│   └── functions/          # Serverless functions
│       ├── ticketmaster.js # Events API
│       ├── what3words.js   # Location API
│       ├── foursquare.js   # Places API
│       ├── ebird.js        # Bird data API
│       ├── holiday.js      # Holiday API
│       ├── recreation.js   # Recreation API
│       └── nps.js          # National Parks API
├── js/
│   ├── api.js              # API integration layer
│   ├── app.js              # Main app logic
│   ├── maps.js             # Google Maps integration
│   ├── ui.js               # UI components
│   └── ...                 # Other modules
├── css/                    # Stylesheets
├── index.html              # Main HTML
├── manifest.json           # PWA manifest
└── netlify.toml            # Netlify config
```

## 🛡️ Security Features

✅ API keys stored as environment variables  
✅ Serverless functions proxy all API requests  
✅ CORS headers properly configured  
✅ Input validation on all endpoints  
✅ No sensitive data in client code  
✅ `.gitignore` configured to prevent accidental commits  

## 🎨 Themes

The app includes 20+ themes:
- Nautical themes (Polished Sailor, High Seas Neon)
- Retro themes (Retro 90s, Arcade 80s, Y2K 2000s)
- Nature themes (Evergreen Trails, Mojave Drift)
- Modern themes (Neon City, Metro 2010s)
- Food themes (Sushi Bar, BBQ Pit, Coffee Café)

## 📱 PWA Features

- ✅ Installable on mobile and desktop
- ✅ Offline support with service worker
- ✅ Add to home screen
- ✅ Full-screen experience
- ✅ Responsive design
- ✅ Push notifications ready (not yet implemented)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

## 🙏 Acknowledgments

- Weather data from [Open-Meteo](https://open-meteo.com/)
- Brewery data from [Open Brewery DB](https://www.openbrewerydb.org/)
- Bird data from [eBird](https://ebird.org/)
- Park data from [National Park Service](https://www.nps.gov/)
- Recreation data from [Recreation.gov](https://www.recreation.gov/)
- Events from [Ticketmaster](https://www.ticketmaster.com/)
- Places from [Foursquare](https://foursquare.com/)

## 🐛 Issues

If you encounter any issues, please:
1. Check the [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) for troubleshooting
2. Review Netlify function logs
3. Open an issue on GitHub with details

## 📞 Support

- 📧 Issues: [GitHub Issues](https://github.com/guySteve/LocalExplorer/issues)
- 📖 Docs: See documentation files in the repository
- 💬 Discussions: [GitHub Discussions](https://github.com/guySteve/LocalExplorer/discussions)

---

**Built with ❤️ for adventure seekers**

Deploy your own instance today and start exploring! 🗺️✨
