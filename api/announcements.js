// Vercel serverless function: GET /api/announcements
const { fetchAllAnnouncements, getCorsHeaders } = require('../lib/utils');

// Cache announcements for 5 minutes to avoid rate limits
let cachedAnnouncements = null;
let cacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

module.exports = async (req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }

  try {
    // Get query parameters
    const { category, search, limit = 50 } = req.query;

    // Check cache
    const now = Date.now();
    if (!cachedAnnouncements || (now - cacheTime) > CACHE_DURATION) {
      console.log('Cache miss, fetching fresh data...');
      try {
        cachedAnnouncements = await fetchAllAnnouncements();
        cacheTime = now;
        console.log(`Successfully fetched ${cachedAnnouncements.length} announcements`);
      } catch (fetchError) {
        console.error('Error fetching announcements:', fetchError);
        
        // If we have stale cache, use it
        if (cachedAnnouncements && cachedAnnouncements.length > 0) {
          console.log('Using stale cache due to fetch error');
        } else {
          // No cache available, return error
          throw fetchError;
        }
      }
    } else {
      console.log('Using cached data');
    }

    // Ensure we have data
    if (!cachedAnnouncements || cachedAnnouncements.length === 0) {
      throw new Error('No announcements available. This could be due to RSS feed issues or rate limiting.');
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

    // Apply limit
    filtered = filtered.slice(0, parseInt(limit));

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
