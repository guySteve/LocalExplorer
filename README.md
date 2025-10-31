# 🗺️ LocalExplorer

A Progressive Web App for discovering local attractions, events, and activities. Built with vanilla JavaScript and designed for adventure seekers who want to explore their surroundings.

## 🚀 Quick Deploy to Netlify

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/guySteve/LocalExplorer)

**Ready to deploy?** Choose your method:
- 🎯 **[One-Click Deploy Guide](NETLIFY_DEPLOY.md)** - Full deployment instructions (Recommended)
- 🤖 **[GitHub Actions Setup](GITHUB_ACTIONS_DEPLOY.md)** - Automated deployments on every push
- ⚡ **Quick Start**: Click the button above, add API keys, and you're live!

**Before deploying**, verify your setup:
```bash
npm run check-deploy
```
Or run: `./check-deploy-ready.sh`

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

## 🚀 Deployment Options

Choose the deployment method that works best for you:

### Option 1: One-Click Deploy (Easiest)
1. Click the **Deploy to Netlify** button at the top
2. Connect your GitHub account
3. Add API keys in Netlify dashboard
4. Done! 🎉

📖 **[Complete Deployment Guide](NETLIFY_DEPLOY.md)**

### Option 2: Automated Deployments with GitHub Actions
Set up once, then deployments happen automatically on every push:
1. Create a Netlify site
2. Add GitHub Secrets (NETLIFY_AUTH_TOKEN, NETLIFY_SITE_ID)
3. Push to main branch - GitHub Actions deploys automatically!

📖 **[GitHub Actions Setup Guide](GITHUB_ACTIONS_DEPLOY.md)**

### Option 3: Manual Deployment via CLI
For developers who prefer command-line tools:
```bash
npm install -g netlify-cli
netlify login
netlify init
netlify deploy --prod
```

📖 **[CLI Deployment Instructions](NETLIFY_DEPLOY.md#method-3-deploy-via-netlify-cli)**

---

## 🔑 Required API Keys

#### Obtaining API Keys

| Service | Get Key | Free Tier | Required | Notes |
|---------|---------|-----------|----------|-------|
| Google Maps | [Get Key](https://developers.google.com/maps/documentation/javascript/get-api-key) | Yes | Yes | Required for maps and location |
| **Weather (Open-Meteo)** | **No Key Needed** | **100% Free** | **No** | **Weather works automatically - no API key required!** |
| Ticketmaster | [Get Key](https://developer.ticketmaster.com/) | Yes | Optional | For event listings |
| What3Words | [Get Key](https://accounts.what3words.com/register) | Yes | Optional | For precise location addressing |
| Foursquare | [Get Key](https://foursquare.com/developers/) | Yes | Optional | For place discovery |
| eBird | [Get Key](https://ebird.org/api/keygen) | Yes | Optional | For bird sighting features |
| Recreation.gov | [Get Key](https://ridb.recreation.gov/) | Yes | Optional | For recreation areas |
| NPS | [Get Key](https://www.nps.gov/subjects/developer/get-started.htm) | Yes | Optional | For national parks |
| HolidayAPI | [Get Key](https://holidayapi.com/) | Limited | Optional | For holiday information |

**Note**: The app will work with just Google Maps! Weather is built-in and FREE (no key required). Other features require their respective API keys.

### 📖 Documentation

- **[NETLIFY_DEPLOY.md](NETLIFY_DEPLOY.md)** - ⭐ Complete Netlify deployment guide
- **[GITHUB_ACTIONS_DEPLOY.md](GITHUB_ACTIONS_DEPLOY.md)** - 🤖 Automated deployment setup

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
1. Check [NETLIFY_DEPLOY.md](NETLIFY_DEPLOY.md) for deployment troubleshooting and Netlify configuration help
2. Review Netlify function logs
3. Open an issue on GitHub with details

## 📞 Support

- 📧 Issues: [GitHub Issues](https://github.com/guySteve/LocalExplorer/issues)
- 📖 Docs: See documentation files in the repository
- 💬 Discussions: [GitHub Discussions](https://github.com/guySteve/LocalExplorer/discussions)

---

**Built with ❤️ for adventure seekers**

Deploy your own instance today and start exploring! 🗺️✨
