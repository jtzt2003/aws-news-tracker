# 🚀 Quick Start - Deploy in 5 Minutes

## Step-by-Step Deployment

### 1️⃣ Get Your API Key (1 minute)

1. Go to [console.anthropic.com](https://console.anthropic.com/)
2. Sign up or log in
3. Click "API Keys"
4. Create a new key
5. Copy it (starts with `sk-ant-`)

### 2️⃣ Deploy to Vercel (2 minutes)

**Option A: GitHub (Recommended)**

```bash
# 1. Push to GitHub
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/aws-reinvent-tracker.git
git push -u origin main

# 2. Go to vercel.com/new
# 3. Import your GitHub repository
# 4. Click "Deploy"
```

**Option B: Vercel CLI**

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Login
vercel login

# 3. Deploy
vercel --prod
```

### 3️⃣ Add Environment Variable (1 minute)

**Via Vercel Dashboard:**
1. Go to your project
2. Settings → Environment Variables
3. Add:
   - Name: `ANTHROPIC_API_KEY`
   - Value: `sk-ant-your-key-here`
4. Save
5. Deployments → Redeploy

**Via CLI:**
```bash
vercel env add ANTHROPIC_API_KEY
# Paste your key when prompted
# Select: Production, Preview, Development
vercel --prod
```

### 4️⃣ Access Your Tracker (30 seconds)

Your tracker is live at:
```
https://your-project-name.vercel.app
```

**Test it:**
- Visit the URL in your browser
- You should see AWS announcements!
- Try searching and filtering

---

## ✅ Verification Checklist

Your deployment is successful if:

- [ ] Homepage loads without errors
- [ ] Announcements appear on the page
- [ ] Search works
- [ ] Category filters work
- [ ] "View" button opens AWS articles
- [ ] Stats show at the bottom
- [ ] No errors in browser console

---

## 🔧 Local Development (Optional)

To run locally before deploying:

```bash
# Install dependencies
npm install

# Add .env file
echo "ANTHROPIC_API_KEY=sk-ant-your-key-here" > .env

# Start development server
vercel dev

# Open http://localhost:3000
```

---

## 📊 API Endpoints

Once deployed, your API will be at:

```
https://your-project.vercel.app/api/announcements
https://your-project.vercel.app/api/stats
https://your-project.vercel.app/api/health
```

Test with curl:
```bash
curl https://your-project.vercel.app/api/health
```

---

## 🎨 Customization

### Change Update Frequency

Edit `lib/utils.js`:
```javascript
// Fetch more announcements
allRawAnnouncements.slice(0, 50) // Change from 30 to 50
```

### Add More RSS Feeds

Edit `lib/utils.js`:
```javascript
const ANNOUNCEMENT_SOURCES = [
  {
    name: 'Your Custom Feed',
    url: 'https://your-feed-url.com/rss',
    type: 'rss'
  },
  // ... existing sources
];
```

### Modify Cache Duration

Edit `api/announcements.js`:
```javascript
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
// Change to 10 minutes:
const CACHE_DURATION = 10 * 60 * 1000;
```

---

## 🐛 Troubleshooting

### Problem: "No announcements loading"

**Check:**
1. Is `ANTHROPIC_API_KEY` set in Vercel?
2. Does API key have credits?
3. Check Vercel logs for errors

**Solution:**
```bash
# View logs
vercel logs your-project-name

# Verify environment variable
vercel env ls
```

### Problem: "Internal Server Error"

**Check Function Logs:**
1. Go to Vercel Dashboard
2. Click your project
3. Deployments → Latest → Logs
4. Look for error messages

### Problem: "API key not working"

**Verify:**
1. Key format: `sk-ant-...`
2. No extra spaces or quotes
3. Key is active in Anthropic console

**Fix:**
```bash
vercel env rm ANTHROPIC_API_KEY production
vercel env add ANTHROPIC_API_KEY production
# Enter correct key
vercel --prod
```

---

## 🌐 Custom Domain

To use your own domain:

1. Go to Vercel project
2. Settings → Domains
3. Add domain: `tracker.yourdomain.com`
4. Update DNS records (Vercel provides instructions)
5. SSL is automatic!

---

## 📱 Share Your Tracker

Your tracker URL:
```
https://your-project-name.vercel.app
```

Share with:
- Your team
- On social media
- In Slack/Discord
- Via email

The tracker updates automatically every 5 minutes!

---

## 💡 Pro Tips

1. **Enable Analytics**
   - Vercel Dashboard → Settings → Analytics
   - See visitor stats and performance

2. **Set Up Monitoring**
   - Use Vercel's built-in monitoring
   - Get alerts for errors

3. **Preview Deployments**
   - Push to any branch for preview URL
   - Test changes before production

4. **Automatic Updates**
   - Push to `main` branch
   - Vercel auto-deploys
   - Zero downtime!

---

## 🎉 Success!

Your AWS re:Invent Tracker is now:
- ✅ Live on Vercel
- ✅ Serverless (zero maintenance)
- ✅ Auto-scaling
- ✅ Global CDN
- ✅ Free SSL
- ✅ AI-powered

**Enjoy tracking AWS announcements!** 🚀

---

## 📚 Next Steps

- [ ] Add custom domain (optional)
- [ ] Enable Vercel Analytics
- [ ] Share with your team
- [ ] Customize RSS feeds
- [ ] Add more categories
- [ ] Set up monitoring

For detailed information, see [README.md](README.md)

**Questions?** Check the [full deployment guide](README.md#troubleshooting)
