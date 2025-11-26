// lib/auth.js - Simple API key authentication middleware

// Generate a random API key for your frontend
// You can generate one with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
const VALID_API_KEYS = new Set([
  process.env.CLIENT_API_KEY || 'your-secure-key-here'
]);

// Optional: Rate limiting per API key
const apiKeyLimits = new Map();
const API_KEY_LIMIT = 1000; // 1000 requests per hour per key
const API_KEY_WINDOW = 60 * 60 * 1000; // 1 hour

function checkApiKey(req) {
  // Get API key from header or query param
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  
  if (!apiKey) {
    return { 
      valid: false, 
      error: 'API key required. Add X-API-Key header or ?apiKey= parameter.' 
    };
  }
  
  if (!VALID_API_KEYS.has(apiKey)) {
    return { 
      valid: false, 
      error: 'Invalid API key.' 
    };
  }
  
  // Check rate limit for this specific API key
  const now = Date.now();
  
  if (!apiKeyLimits.has(apiKey)) {
    apiKeyLimits.set(apiKey, {
      count: 1,
      resetTime: now + API_KEY_WINDOW
    });
    return { valid: true, remaining: API_KEY_LIMIT - 1 };
  }
  
  const record = apiKeyLimits.get(apiKey);
  
  // Reset if window expired
  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + API_KEY_WINDOW;
    apiKeyLimits.set(apiKey, record);
    return { valid: true, remaining: API_KEY_LIMIT - 1 };
  }
  
  // Check if over limit
  if (record.count >= API_KEY_LIMIT) {
    const retryAfter = Math.ceil((record.resetTime - now) / 1000);
    return { 
      valid: false, 
      error: `API key rate limit exceeded. Try again in ${retryAfter} seconds.`,
      retryAfter 
    };
  }
  
  // Increment count
  record.count++;
  apiKeyLimits.set(apiKey, record);
  
  return { valid: true, remaining: API_KEY_LIMIT - record.count };
}

module.exports = { checkApiKey };
