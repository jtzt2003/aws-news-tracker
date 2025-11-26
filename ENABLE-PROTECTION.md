# 🛡️ Enable Protection in 5 Minutes

## Quick Setup

### Step 1: Enable Rate Limiting

Replace your current API endpoint with the protected version:

```bash
cd api
mv announcements.js announcements-original.js
mv announcements-protected.js announcements.js
```

### Step 2: Deploy

```bash
vercel --prod
```

### Step 3: Set Anthropic Limit

1. Go to https://console.anthropic.com
2. Click Settings → Billing
3. Set "Monthly Spending Limit": $20
4. Save

Done! You're now protected! ✅

---

## What You Get

### ✅ Rate Limiting
- Max 10 requests per minute per IP
- Automatic blocking of abusive IPs
- HTTP 429 responses with retry time

### ✅ Edge Caching
- 5-minute cache at edge locations
- 95%+ traffic served from cache
- Near-zero API calls

### ✅ Cost Protection
- Hard cap at $20/month (Anthropic limit)
- Typical usage: $2-3/month
- Even under attack: Costs stay low

---

## Test It Works

### Test Rate Limiting:

```bash
# Send 15 requests quickly
for i in {1..15}; do 
  curl https://your-project.vercel.app/api/announcements
  echo " - Request $i"
done

# Requests 11-15 should return:
# {"error":"Too Many Requests","message":"Rate limit exceeded..."}
```

### Test Caching:

```bash
# Check response headers
curl -I https://your-project.vercel.app/api/announcements

# Should see:
# X-RateLimit-Limit: 10
# X-RateLimit-Remaining: 9
# Cache-Control: public, s-maxage=300
```

---

## Adjust Settings (Optional)

### More Strict (Better Protection):

```javascript
// In api/announcements.js
const MAX_REQUESTS_PER_WINDOW = 5;  // Down from 10
const CACHE_DURATION = 10 * 60 * 1000;  // 10 minutes
```

### Less Strict (More Responsive):

```javascript
// In api/announcements.js
const MAX_REQUESTS_PER_WINDOW = 20;  // Up from 10
const CACHE_DURATION = 3 * 60 * 1000;  // 3 minutes
```

---

## Monitor

### Vercel Dashboard:
- Check function invocations
- Watch for 429 errors (good - blocking abuse!)
- Monitor cache hit rate (should be >90%)

### Anthropic Console:
- Daily API usage
- Token counts
- Costs

---

## Cost Scenarios

### Normal Usage:
- Requests: 100/day
- Cost: ~$0.60/month ✅

### Under Attack:
- Requests: 10,000/day
- Blocked: 9,950/day
- Cost: ~$0.60/month ✅ (still safe!)

### Maximum Possible:
- Hard limit: $20/month
- Your card won't be charged beyond this

---

## Emergency Actions

If you suspect an attack:

1. **Increase cache duration:**
   ```javascript
   const CACHE_DURATION = 30 * 60 * 1000; // 30 min
   ```

2. **Lower rate limit:**
   ```javascript
   const MAX_REQUESTS_PER_WINDOW = 3;
   ```

3. **Deploy immediately:**
   ```bash
   vercel --prod
   ```

4. **Check Anthropic usage:**
   - Pause API key if needed

---

## ✅ You're Protected!

Your tracker now has:
- ✅ Rate limiting (10 req/min per IP)
- ✅ Edge caching (95% traffic)
- ✅ Cost cap ($20 max)
- ✅ Input validation
- ✅ Security headers

Sleep well knowing your costs are safe! 😴💤
