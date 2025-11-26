// Vercel serverless function: GET /api/announcements (with rate limiting)
const { fetchAllAnnouncements, getCorsHeaders } = require('../lib/utils');

// Cache announcements for 5 minutes
let cachedAnnouncements = null;
let cacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Rate limiting storage (in-memory, resets on cold start)
const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute window
const MAX_REQUESTS_PER_WINDOW = 10; // Max 10 requests per minute per IP

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of rateLimitStore.entries()) {
    if (now - data.resetTime > RATE_LIMIT_WINDOW) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean every minute

// Rate limiting function
function checkRateLimit(identifier) {
  const now = Date.now();
  
  if (!rateLimitStore.has(identifier)) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW
    });
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - 1 };
  }
  
  const record = rateLimitStore.get(identifier);
  
  // Reset if window expired
  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + RATE_LIMIT_WINDOW;
    rateLimitStore.set(identifier, record);
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - 1 };
  }
  
  // Check if over limit
  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    const retryAfter = Math.ceil((record.resetTime - now) / 1000);
    return { 
      allowed: false, 
      remaining: 0,
      retryAfter 
    };
  }
  
  // Increment count
  record.count++;
  rateLimitStore.set(identifier, record);
  
  return { 
    allowed: true, 
    remaining: MAX_REQUESTS_PER_WINDOW - record.count 
  };
}

// Get client identifier (IP address or fallback)
function getClientIdentifier(req) {
  // Try to get real IP (Vercel provides this)
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded ? forwarded.split(',')[0].trim() : 
             req.headers['x-real-ip'] || 
             req.socket?.remoteAddress || 
             'unknown';
  
  return ip;
}

module.exports = async (req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  try {
    // Get client identifier
    const clientId = getClientIdentifier(req);
    
    // Check rate limit
    const rateLimitResult = checkRateLimit(clientId);
    
    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', MAX_REQUESTS_PER_WINDOW);
    res.setHeader('X-RateLimit-Remaining', rateLimitResult.remaining);
    
    if (!rateLimitResult.allowed) {
      res.setHeader('Retry-After', rateLimitResult.retryAfter);
      return res.status(429).json({ 
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Please try again in ${rateLimitResult.retryAfter} seconds.`,
        retryAfter: rateLimitResult.retryAfter
      });
    }
    
    // Get query parameters
    const { category, search, limit = 50 } = req.query;

    // Check cache
    const now = Date.now();
    if (!cachedAnnouncements || (now - cacheTime) > CACHE_DURATION) {
      console.log('Cache miss, fetching fresh data...');
      cachedAnnouncements = await fetchAllAnnouncements();
      cacheTime = now;
    } else {
      console.log('Using cached data');
    }

    let filtered = [...cachedAnnouncements];

    // Filter by category
    if (category && category !== 'ALL') {
      filtered = filtered.filter(a => a.category === category);
    }

    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(a => 
        a.title.toLowerCase().includes(searchLower) ||
        a.summary.toLowerCase().includes(searchLower)
      );
    }

    // Apply limit (cap at 100)
    const maxLimit = Math.min(parseInt(limit), 100);
    filtered = filtered.slice(0, maxLimit);

    // Set cache headers for client-side caching
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    
    // Return response
    res.status(200).json({
      announcements: filtered,
      total: filtered.length,
      lastUpdate: new Date(cacheTime).toISOString(),
      cached: (now - cacheTime) < CACHE_DURATION
    });

  } catch (error) {
    console.error('Error in announcements endpoint:', error);
    res.status(500).json({ 
      error: 'Failed to fetch announcements',
      message: error.message 
    });
  }
};
