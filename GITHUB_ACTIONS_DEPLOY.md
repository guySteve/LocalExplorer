# 🤖 GitHub Actions Automated Deployment

This guide explains how to set up automated deployments to Netlify using GitHub Actions.

## 📋 What This Does

Once configured, this GitHub Actions workflow will:
- ✅ Automatically deploy to Netlify when you push to `main` branch
- ✅ Create preview deployments for pull requests
- ✅ Post deployment URLs as comments on PRs and commits
- ✅ Require minimal manual intervention

## 🚀 Setup Instructions

### Step 1: Create a Netlify Site

First, you need to create a site on Netlify (if you haven't already):

**Option A: Via Netlify Dashboard**
1. Go to [Netlify Dashboard](https://app.netlify.com)
2. Click **"Add new site"** → **"Import an existing project"**
3. Connect your GitHub repository
4. Configure build settings (or use defaults)
5. Click **"Deploy site"**

**Option B: Via Netlify CLI**
```bash
netlify login
netlify init
```

### Step 2: Get Your Netlify Site ID and Auth Token

#### Get Site ID:
1. Go to [Netlify Dashboard](https://app.netlify.com)
2. Select your site
3. Go to **Site settings** → **General**
4. Copy the **Site ID** (looks like: `12345678-1234-1234-1234-123456789abc`)

#### Get Auth Token:
1. Go to [Netlify User Settings](https://app.netlify.com/user/applications)
2. Scroll to **Personal access tokens**
3. Click **"New access token"**
4. Give it a name (e.g., "GitHub Actions Deploy")
5. Copy the token immediately (you won't be able to see it again!)

### Step 3: Add GitHub Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"**
4. Add the following two secrets:

   **Secret 1:**
   - Name: `NETLIFY_AUTH_TOKEN`
   - Value: Your Netlify personal access token from Step 2

   **Secret 2:**
   - Name: `NETLIFY_SITE_ID`
   - Value: Your Netlify site ID from Step 2

### Step 4: Set Netlify Environment Variables

The GitHub Actions workflow will deploy your site, but you still need to configure API keys in Netlify:

1. Go to [Netlify Dashboard](https://app.netlify.com)
2. Select your site
3. Go to **Site settings** → **Environment variables**
4. Add all required API keys:
   ```
   MAPS_API_KEY=your_google_maps_api_key
   TICKETMASTER_API_KEY=your_ticketmaster_api_key
   HOLIDAY_API_KEY=your_holiday_api_key
   WHAT3WORDS_API_KEY=your_what3words_api_key
   FOURSQUARE_API_KEY=your_foursquare_api_key
   EBIRD_API_KEY=your_ebird_api_key
   RECREATION_GOV_API_KEY=your_recreation_gov_api_key
   NPS_API_KEY=your_nps_api_key
   ```

### Step 5: Test the Workflow

1. Make a small change to your repository (e.g., update README)
2. Commit and push to the `main` branch:
   ```bash
   git add .
   git commit -m "Test GitHub Actions deployment"
   git push origin main
   ```
3. Go to **Actions** tab in your GitHub repository
4. Watch the deployment workflow run
5. Once complete, check your Netlify site!

---

## 🔄 How It Works

### Automatic Deployments

**On Push to Main:**
- Workflow triggers automatically
- Deploys to production
- Posts deployment URL as commit comment

**On Pull Request:**
- Creates a preview deployment
- Posts preview URL as PR comment
- Useful for reviewing changes before merging

**Manual Trigger:**
- You can manually trigger deployment from the Actions tab
- Click **"Run workflow"** on the `Deploy to Netlify` workflow

### Workflow Configuration

The workflow file is located at `.github/workflows/netlify-deploy.yml`:

```yaml
name: Deploy to Netlify

on:
  push:
    branches:
      - main        # Deploy production on main branch
  pull_request:
    branches:
      - main        # Deploy preview on PRs
  workflow_dispatch: # Allow manual triggers
```

---

## ✅ Verification

After setup, verify everything works:

1. **Check GitHub Actions**
   - Go to **Actions** tab in your repository
   - You should see a green checkmark ✅ for successful runs

2. **Check Netlify**
   - Go to your Netlify site dashboard
   - You should see deployments from "GitHub Actions"

3. **Check Your Site**
   - Visit your deployed site URL
   - Test that all features work correctly

---

## 🐛 Troubleshooting

### Workflow Fails with "Unauthorized"
- **Problem**: `NETLIFY_AUTH_TOKEN` is invalid or missing
- **Solution**: 
  1. Verify the token in GitHub Secrets
  2. Generate a new token in Netlify if needed
  3. Update the GitHub Secret

### Workflow Fails with "Site not found"
- **Problem**: `NETLIFY_SITE_ID` is incorrect or missing
- **Solution**: 
  1. Check the Site ID in Netlify dashboard
  2. Verify the GitHub Secret matches exactly

### Deployment Succeeds but Site Doesn't Work
- **Problem**: Environment variables not set in Netlify
- **Solution**: 
  1. Add all API keys to Netlify environment variables
  2. Trigger a new deployment

### Functions Return 500 Errors
- **Problem**: Missing API keys in Netlify environment
- **Solution**: 
  1. Go to Netlify → Site settings → Environment variables
  2. Add all required API keys
  3. Redeploy the site

---

## 🔒 Security Notes

### GitHub Secrets
- ✅ Secrets are encrypted and never exposed in logs
- ✅ Only workflows in your repository can access them
- ✅ Rotate tokens periodically for security

### Netlify Environment Variables
- ✅ Never commit API keys to Git
- ✅ Environment variables are only accessible to functions
- ✅ Use domain restrictions on API keys where possible

---

## 🎯 Best Practices

### Development Workflow
1. Create a feature branch
2. Make changes and test locally
3. Open a pull request
4. Review the preview deployment
5. Merge to main when ready
6. Production automatically deploys

### Branch Protection (Recommended)
1. Go to **Settings** → **Branches**
2. Add rule for `main` branch
3. Enable:
   - Require pull request reviews
   - Require status checks (GitHub Actions)
   - Require branches to be up to date

---

## 📊 Monitoring

### GitHub Actions
- View workflow runs in **Actions** tab
- Check logs for each step
- Debug failed deployments

### Netlify Dashboard
- Monitor deployment history
- Check function execution logs
- View site analytics

---

## 🔗 Alternative: Netlify's Native GitHub Integration

If you prefer, you can use Netlify's built-in GitHub integration instead of GitHub Actions:

**Pros:**
- ✅ Simpler setup (no GitHub Secrets needed)
- ✅ Managed by Netlify
- ✅ Automatic preview deployments

**Cons:**
- ❌ Less customization
- ❌ No GitHub Actions workflow runs

**To use native integration:**
1. In Netlify Dashboard, go to **Site settings** → **Build & deploy**
2. Link your GitHub repository
3. Configure build settings
4. Netlify handles deployments automatically

---

## 💡 Tips

1. **Fast Deployments**: This is a static site with no build step, so deployments are very fast (usually < 1 minute)

2. **Preview Deployments**: Use PR previews to test changes before merging to main

3. **Rollbacks**: If something goes wrong, rollback to a previous deployment in Netlify dashboard

4. **Custom Domains**: Configure custom domains in Netlify (automatically gets HTTPS)

5. **Deploy Contexts**: Netlify supports different environment variables for production vs. previews

---

## 📖 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Netlify Actions Documentation](https://github.com/marketplace/actions/netlify-actions)
- [Netlify CLI Documentation](https://docs.netlify.com/cli/get-started/)
- [Netlify Deploy Documentation](https://docs.netlify.com/site-deploys/overview/)

---

## 🎉 You're All Set!

Once configured, you can forget about manual deployments. Just push to main and let GitHub Actions handle the rest! 🚀

**Happy deploying!** 🗺️✨
