# 🚀 AWS re:Invent Announcements Tracker - Static Generation

A **static site** that automatically fetches and displays AWS announcements with AI-powered summaries. Uses GitHub Actions for hourly updates - **no serverless timeouts!**

## ✨ Features

- ✅ **FREE** - No Vercel Pro needed
- ✅ **Instant loads** - Pre-generated static data
- ✅ **No timeouts** - GitHub Actions handles processing
- ✅ **AI summaries** - Claude generates concise summaries
- ✅ **Auto-updates** - Runs every hour automatically
- ✅ **7-day history** - Shows announcements from last week
- ✅ **Filtering** - By category, search, and date range

## 🏗️ Architecture

```
GitHub Action (hourly)
  ↓
Fetch RSS feeds
  ↓
Generate AI summaries (50 items)
  ↓
Save to public/data/announcements.json
  ↓
Commit & push
  ↓
Vercel auto-deploys
  ↓
Users get instant static page!
```

## 🚀 Setup Instructions

### **Step 1: Create GitHub Repository**

1. Go to GitHub and create a new repository (e.g., `aws-reinvent-tracker`)
2. Clone it locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/aws-reinvent-tracker.git
   cd aws-reinvent-tracker
   ```

### **Step 2: Add Project Files**

1. Extract the provided archive to your repository
2. Or copy all files from this directory

Your structure should look like:
```
aws-reinvent-tracker/
├── .github/
│   └── workflows/
│       └── update-announcements.yml
├── scripts/
│   └── generate-data.js
├── public/
│   ├── index.html
│   └── data/
│       └── .gitkeep (create empty file)
├── package.json
├── vercel.json
├── .gitignore
└── README.md
```

### **Step 3: Add GitHub Secret (API Key)**

1. Go to your repository → **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Name: `ANTHROPIC_API_KEY`
4. Value: Your Anthropic API key (starts with `sk-ant-`)
5. Click **Add secret**

### **Step 4: Initial Setup**

```bash
# Install dependencies locally (optional - just for testing)
npm install

# Create data directory
mkdir -p public/data

# Commit everything
git add .
git commit -m "Initial commit: Static AWS tracker"
git push origin main
```

### **Step 5: Deploy to Vercel**

#### **Option A: Vercel CLI**

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd your-repo
vercel --prod
```

#### **Option B: Vercel Dashboard**

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click **Import Project**
3. Import your GitHub repository
4. Click **Deploy**
5. Done! ✅

### **Step 6: Trigger First Run**

The GitHub Action needs to run once to generate initial data:

**Option A: Manual Trigger**
1. Go to your repo → **Actions** tab
2. Click **Update AWS Announcements** workflow
3. Click **Run workflow** → **Run workflow**
4. Wait ~2-3 minutes for it to complete

**Option B: Just Wait**
- The action will run automatically on the next hour (e.g., 1:00 PM, 2:00 PM)

### **Step 7: Check Your Site!**

Visit your Vercel URL (e.g., `https://your-project.vercel.app`)

You should see:
- ✅ AWS announcements displayed
- ✅ AI-generated summaries
- ✅ Category filters working
- ✅ Search working
- ✅ Last updated timestamp

## 📊 How It Works

### **GitHub Action Schedule**

The workflow runs:
- ⏰ **Every hour** at minute 0 (e.g., 1:00, 2:00, 3:00)
- 🔨 **On push** to main branch
- 👆 **Manually** via workflow dispatch

### **Data Generation Process**

1. Fetches RSS feeds from AWS (no time limit!)
2. Filters to announcements from last 7 days
3. Processes up to 50 items with AI summaries
4. Saves to `public/data/announcements.json`
5. Commits and pushes (triggers Vercel deployment)

### **Frontend**

- Pure static HTML/CSS/JavaScript
- Fetches data from static JSON file
- Instant page loads
- Client-side filtering and search

## 🔧 Configuration

### **Change Update Frequency**

Edit `.github/workflows/update-announcements.yml`:

```yaml
schedule:
  - cron: '0 * * * *'  # Every hour
  # - cron: '0 */2 * * *'  # Every 2 hours
  # - cron: '0 9,17 * * *'  # 9 AM and 5 PM
  # - cron: '*/30 * * * *'  # Every 30 minutes
```

### **Change Number of Items**

Edit `scripts/generate-data.js` line 128:

```javascript
const itemsToProcess = recentAnnouncements.slice(0, 50); // Change 50 to desired number
```

### **Change Days of History**

Edit `scripts/generate-data.js` line 123:

```javascript
const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000); // Change 7 to desired days
```

## 💰 Cost Analysis

### **GitHub Actions**
- Free tier: 2,000 minutes/month
- Each run: ~2-3 minutes
- Hourly runs: ~720 runs/month × 3 min = **2,160 minutes**
- Cost: **FREE** (just within limit!)

Or run every 2 hours: 360 runs × 3 min = 1,080 minutes = **plenty of buffer**

### **Anthropic API**
- 50 announcements × $0.002 each = $0.10 per run
- Hourly: $0.10 × 24 × 30 = **$72/month** (yikes!)
- Every 2 hours: $0.10 × 12 × 30 = **$36/month** (better)
- Every 6 hours: $0.10 × 4 × 30 = **$12/month** (reasonable)

**Recommendation: Run every 2-4 hours for $12-36/month**

### **Vercel**
- Static site: **FREE** ✅
- No serverless functions = No limits!

## 🎯 Recommended Configuration

For best cost/freshness balance:

```yaml
# Every 2 hours
schedule:
  - cron: '0 */2 * * *'

# Process 30 items (not 50)
const itemsToProcess = recentAnnouncements.slice(0, 30);
```

Cost: ~$18/month for very fresh data

## 🐛 Troubleshooting

### **Action Fails on First Run**

Check:
1. `ANTHROPIC_API_KEY` secret is set correctly
2. Repo has write permissions for Actions:
   - Settings → Actions → General → Workflow permissions
   - Select "Read and write permissions"
   - Save

### **No Data Showing**

1. Check if Action ran successfully (Actions tab)
2. Check if `public/data/announcements.json` exists in repo
3. Hard refresh browser (Ctrl+Shift+R)

### **"Last updated" Shows Old Time**

1. Check Action logs for errors
2. Manually trigger workflow
3. Wait for Vercel to redeploy (~1-2 minutes)

### **Vercel Deploy Fails**

Make sure `public/` directory exists with `index.html`

## 📈 Monitoring

### **Check Action Status**

- Go to **Actions** tab in GitHub
- See all workflow runs and their status
- Click any run to see detailed logs

### **Check API Usage**

- Visit [console.anthropic.com](https://console.anthropic.com)
- Check Usage dashboard
- Should show steady usage matching your schedule

### **Check Site Performance**

- Visit [vercel.com/dashboard](https://vercel.com/dashboard)
- View analytics and bandwidth usage
- Static site = Very low resource usage ✅

## 🎉 Success Criteria

Your tracker is working perfectly when:

- ✅ GitHub Action runs successfully (green check)
- ✅ `announcements.json` updates in repo
- ✅ Site shows current data
- ✅ "Last updated" shows recent time
- ✅ AI summaries are present (not truncated)
- ✅ Filters and search work
- ✅ Page loads instantly

## 🚀 Going Further

### **Add More Sources**

Edit `scripts/generate-data.js` and add to `ANNOUNCEMENT_SOURCES`:

```javascript
{
  name: 'AWS Security Blog',
  url: 'https://aws.amazon.com/blogs/security/feed/',
  type: 'rss'
}
```

### **Customize Appearance**

Edit `public/index.html` CSS to match your branding

### **Add Email Notifications**

Use GitHub Actions to send email when new announcements arrive

## 💡 Why This Is Better

**vs Serverless:**
- ✅ No timeouts (Action has 6-hour limit!)
- ✅ No cold starts
- ✅ Instant page loads
- ✅ More reliable

**vs Manual Updates:**
- ✅ Automatic hourly updates
- ✅ Always fresh data
- ✅ No maintenance needed

**Cost:**
- Serverless: $20/month (Vercel Pro) + $5/month (API) = $25/month
- Static: $0/month (Vercel) + $12-36/month (API) = $12-36/month
- **Savings: $9-13/month** OR **Better data freshness for same cost**

## 🆘 Need Help?

1. Check Actions logs first (most errors show here)
2. Verify secret is set correctly
3. Check Anthropic console for API issues
4. Test locally: `npm install && npm run generate`

## ✨ Enjoy!

You now have a fully automated, reliable AWS announcement tracker that:
- Updates automatically
- Costs less than Starbucks
- Never times out
- Loads instantly

**No more serverless headaches!** 🎉
