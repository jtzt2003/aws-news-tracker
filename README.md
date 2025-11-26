# 🚀 AWS re:Invent Tracker - Vercel Deployment Guide

## Quick Deploy to Vercel (5 Minutes)

### Prerequisites
- GitHub account
- Vercel account (sign up free at [vercel.com](https://vercel.com))
- Anthropic API key ([get one here](https://console.anthropic.com/))

---

## 🎯 Method 1: One-Click Deploy (Easiest)

### Step 1: Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/aws-reinvent-tracker)

1. Click the "Deploy" button above
2. Sign in to Vercel (or create account)
3. Connect your GitHub account
4. Name your project (e.g., `aws-reinvent-tracker`)
5. Click "Deploy"

### Step 2: Add Environment Variables

After deployment:

1. Go to your project dashboard
2. Click "Settings" → "Environment Variables"
3. Add the following:

```
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

4. Click "Save"
5. Go to "Deployments" → Click "..." → "Redeploy"

### Step 3: Access Your Tracker

Your tracker will be live at:
```
https://your-project-name.vercel.app
```

That's it! 🎉

---

## 🛠️ Method 2: Deploy via GitHub (Recommended)

### Step 1: Push to GitHub

```bash
# Create a new repository on GitHub
# Then push your code

git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/aws-reinvent-tracker.git
git push -u origin main
```

### Step 2: Import to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click "Import Git Repository"
3. Select your GitHub repository
4. Click "Import"
5. Configure project:
   - **Framework Preset:** Other
   - **Root Directory:** ./
   - **Build Command:** (leave empty)
   - **Output Directory:** public

### Step 3: Add Environment Variables

Before deploying, add:

```
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

### Step 4: Deploy

1. Click "Deploy"
2. Wait 2-3 minutes
3. Visit your live URL!

---

## 💻 Method 3: Deploy via CLI (For Developers)

### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 2: Login to Vercel

```bash
vercel login
```

### Step 3: Deploy

```bash
# Navigate to project directory
cd reinvent-vercel

# Deploy to preview
vercel

# Or deploy to production
vercel --prod
```

### Step 4: Add Environment Variables

```bash
# Add your API key
vercel env add ANTHROPIC_API_KEY

# Enter value when prompted
# Select: Production, Preview, Development

# Redeploy to apply
vercel --prod
```

---

## 📁 Project Structure

```
reinvent-vercel/
├── api/
│   ├── announcements.js    # GET /api/announcements
│   ├── stats.js            # GET /api/stats
│   └── health.js           # GET /api/health
├── lib/
│   └── utils.js            # Shared utilities
├── public/
│   └── index.html          # Frontend (React)
├── package.json            # Dependencies
└── vercel.json             # Vercel configuration
```

---

## 🔧 Configuration

### vercel.json

```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/**/*.js",
      "use": "@vercel/node"
    },
    {
      "src": "public/**",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/public/$1"
    }
  ]
}
```

### Environment Variables

Set these in Vercel dashboard:

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Your Claude API key |

---

## 🌐 Custom Domain

### Add Custom Domain

1. Go to Project Settings → Domains
2. Add your domain (e.g., `reinvent.example.com`)
3. Follow DNS instructions
4. Vercel handles SSL automatically!

### Supported Domains

- Vercel subdomain: `your-project.vercel.app`
- Custom domain: `your-domain.com`
- Subdomain: `tracker.your-domain.com`

---

## 📊 API Endpoints

Your deployed tracker will have:

### GET /api/announcements
```bash
curl https://your-project.vercel.app/api/announcements

# With filters
curl "https://your-project.vercel.app/api/announcements?category=AI_ML&limit=10"
```

### GET /api/stats
```bash
curl https://your-project.vercel.app/api/stats
```

### GET /api/health
```bash
curl https://your-project.vercel.app/api/health
```

---

## ⚙️ Advanced Configuration

### Caching

The app uses in-memory caching (5 minutes) to avoid API rate limits.

To adjust cache duration, edit `api/announcements.js`:

```javascript
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
// Change to:
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
```

### Timeout Settings

Serverless functions have a 10-second timeout on free tier.

For longer timeouts (Pro plan):

```json
{
  "functions": {
    "api/**/*.js": {
      "maxDuration": 30
    }
  }
}
```

### Memory Allocation

Increase memory for faster performance:

```json
{
  "functions": {
    "api/**/*.js": {
      "memory": 1024
    }
  }
}
```

---

## 🔍 Monitoring & Logs

### View Logs

1. Go to your project dashboard
2. Click "Deployments"
3. Select a deployment
4. Click "Logs" or "Runtime Logs"

### Real-Time Logs (CLI)

```bash
vercel logs your-project-name --follow
```

### Analytics

Vercel provides built-in analytics:
- Page views
- Top pages
- Visitor locations
- Performance metrics

Enable in: Settings → Analytics

---

## 🐛 Troubleshooting

### Issue: "Internal Server Error"

**Check:**
1. Logs in Vercel dashboard
2. Environment variables are set
3. API key is valid

**Solution:**
```bash
vercel env ls
vercel env add ANTHROPIC_API_KEY
vercel --prod
```

### Issue: "No announcements loading"

**Check:**
1. API endpoint: `/api/health`
2. Browser console for errors
3. CORS headers

**Solution:**
- Check if API key has credits
- Verify RSS feeds are accessible
- Check function logs in Vercel

### Issue: "Timeout Error"

**Cause:** Function exceeded time limit

**Solution:**
1. Reduce number of RSS items processed
2. Upgrade to Pro plan for longer timeout
3. Optimize code (reduce API calls)

### Issue: "API Rate Limit"

**Cause:** Too many requests to Anthropic API

**Solution:**
- Increase cache duration
- Reduce number of summaries generated
- Add rate limiting

---

## 💰 Pricing & Limits

### Vercel Free Tier

✅ **Included:**
- 100GB bandwidth/month
- Unlimited personal projects
- SSL certificates
- Custom domains
- Serverless functions
- Edge network

⚠️ **Limits:**
- 10-second function timeout
- 100 deployments/day
- 1000 serverless function invocations/day

### Vercel Pro ($20/month)

✅ **Upgrades:**
- 1TB bandwidth
- 60-second timeout
- Unlimited deployments
- Priority support
- Team collaboration

### Anthropic API Costs

- Pay per token
- Approximately $3-5 per 1000 summaries
- Free tier available for testing

**Cost Optimization:**
- Use caching (reduces API calls)
- Generate summaries only for new items
- Consider batch processing

---

## 🔐 Security Best Practices

### 1. Environment Variables

✅ **Do:**
- Store API keys in Vercel environment variables
- Use different keys for development/production
- Rotate keys regularly

❌ **Don't:**
- Commit API keys to Git
- Share keys publicly
- Hardcode sensitive data

### 2. CORS Configuration

Already configured in the API:

```javascript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};
```

For production, restrict origin:
```javascript
'Access-Control-Allow-Origin': 'https://your-domain.com'
```

### 3. Rate Limiting

Add basic rate limiting:

```javascript
// In api/announcements.js
const rateLimit = {};

function checkRateLimit(ip) {
  const now = Date.now();
  if (!rateLimit[ip]) {
    rateLimit[ip] = { count: 1, reset: now + 60000 };
    return true;
  }
  
  if (now > rateLimit[ip].reset) {
    rateLimit[ip] = { count: 1, reset: now + 60000 };
    return true;
  }
  
  if (rateLimit[ip].count >= 30) {
    return false; // Rate limited
  }
  
  rateLimit[ip].count++;
  return true;
}
```

---

## 🚀 Performance Optimization

### 1. Enable Edge Caching

Add to `vercel.json`:

```json
{
  "headers": [
    {
      "source": "/api/announcements",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "s-maxage=300, stale-while-revalidate"
        }
      ]
    }
  ]
}
```

### 2. Optimize Frontend

- Already using CDN for React
- Tailwind CSS via CDN
- No build step required
- Instant page loads

### 3. Reduce Bundle Size

Currently:
- Frontend: ~15KB (HTML + inline JS)
- API functions: ~5KB each
- Total: Minimal footprint

---

## 📱 Mobile & PWA

### Make it a PWA

Add to `public/index.html`:

```html
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#6B46C1">
```

Create `public/manifest.json`:

```json
{
  "name": "AWS re:Invent Tracker",
  "short_name": "re:Invent",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#1a202c",
  "theme_color": "#6B46C1",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    }
  ]
}
```

---

## 🔄 Continuous Deployment

### Automatic Deployments

Vercel automatically deploys when you push to GitHub:

- `main` branch → Production
- Other branches → Preview deployments
- Pull requests → Preview URLs

### Deployment Hooks

Trigger deployments via webhook:

1. Go to Settings → Git
2. Copy "Deploy Hook" URL
3. Use in CI/CD or cron jobs

```bash
curl -X POST https://api.vercel.com/v1/integrations/deploy/...
```

---

## ✅ Deployment Checklist

Before going live:

- [ ] API key added to Vercel environment variables
- [ ] Test API endpoints (`/api/health`, `/api/announcements`)
- [ ] Custom domain configured (optional)
- [ ] SSL certificate active (automatic)
- [ ] Analytics enabled
- [ ] Error tracking configured
- [ ] Tested on mobile devices
- [ ] Checked performance (Lighthouse)
- [ ] Reviewed Vercel logs
- [ ] Set up monitoring/alerts

---

## 🎉 Success!

Your AWS re:Invent Tracker is now live on Vercel!

**What's Working:**
✅ Serverless API with caching
✅ Real-time announcement updates
✅ AI-powered summaries
✅ Beautiful responsive UI
✅ Automatic SSL
✅ Global CDN
✅ Zero server management

**Next Steps:**
1. Share your URL with your team
2. Add custom domain (optional)
3. Monitor usage in Vercel dashboard
4. Customize categories or RSS feeds
5. Add more features!

---

## 📚 Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel CLI Reference](https://vercel.com/docs/cli)
- [Serverless Functions](https://vercel.com/docs/functions)
- [Environment Variables](https://vercel.com/docs/environment-variables)
- [Custom Domains](https://vercel.com/docs/custom-domains)

---

**Built with ❤️ for AWS re:Invent**
**Deployed on Vercel • Powered by Claude AI**
