# 🎯 Quick Deployment Reference

## 🚀 Three Ways to Deploy

### 1️⃣ One-Click Deploy (5 minutes)
```
1. Click "Deploy to Netlify" button
2. Connect GitHub
3. Add environment variables
4. Done!
```
📖 [Full Guide](NETLIFY_DEPLOY.md)

### 2️⃣ GitHub Actions (10 minutes setup, then automatic)
```
1. Create Netlify site
2. Add GitHub Secrets:
   - NETLIFY_AUTH_TOKEN
   - NETLIFY_SITE_ID
3. Push to main → Auto deploy!
```
📖 [Full Guide](GITHUB_ACTIONS_DEPLOY.md)

### 3️⃣ Netlify CLI (For developers)
```bash
npm install -g netlify-cli
netlify login
netlify init
netlify deploy --prod
```
📖 [Full Guide](NETLIFY_DEPLOY.md#method-3-deploy-via-netlify-cli)

---

## 🔑 Required Environment Variables

Add these in Netlify Dashboard → Site Settings → Environment Variables:

| Variable | Required? | Get Key |
|----------|-----------|---------|
| `MAPS_API_KEY` | ✅ Yes | [Google Maps](https://developers.google.com/maps/documentation/javascript/get-api-key) |
| `TICKETMASTER_API_KEY` | Optional | [Ticketmaster](https://developer.ticketmaster.com/) |
| `HOLIDAY_API_KEY` | Optional | [HolidayAPI](https://holidayapi.com/) |
| `WHAT3WORDS_API_KEY` | Optional | [What3Words](https://accounts.what3words.com/register) |
| `FOURSQUARE_API_KEY` | Optional | [Foursquare](https://foursquare.com/developers/) |
| `EBIRD_API_KEY` | Optional | [eBird](https://ebird.org/api/keygen) |
| `RECREATION_GOV_API_KEY` | Optional | [Recreation.gov](https://ridb.recreation.gov/) |
| `NPS_API_KEY` | Optional | [National Park Service](https://www.nps.gov/subjects/developer/get-started.htm) |

---

## ✅ Quick Checklist

- [ ] Create Netlify account
- [ ] Get Google Maps API key (required)
- [ ] Deploy to Netlify (choose method above)
- [ ] Add environment variables in Netlify
- [ ] Trigger redeploy
- [ ] Test your site
- [ ] ✨ Share with friends!

---

## 🐛 Common Issues

### Site deploys but doesn't work?
→ Add environment variables in Netlify, then redeploy

### Maps not loading?
→ Check MAPS_API_KEY is set correctly

### Functions returning errors?
→ Check Netlify function logs for details

---

## 📚 More Documentation

- **[NETLIFY_DEPLOY.md](NETLIFY_DEPLOY.md)** - Complete deployment guide
- **[GITHUB_ACTIONS_DEPLOY.md](GITHUB_ACTIONS_DEPLOY.md)** - Automated deployment
- **[ACTION_REQUIRED.md](ACTION_REQUIRED.md)** - Post-deployment checklist
- **[DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)** - Detailed checklist

---

**🎉 Ready to deploy? Pick a method above and get started!**
