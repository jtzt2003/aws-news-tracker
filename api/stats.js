// Vercel serverless function: GET /api/stats
const { fetchAllAnnouncements, getCorsHeaders } = require('../lib/utils');

// Use same cache as announcements
let cachedAnnouncements = null;
let cacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

module.exports = async (req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }

  try {
    // Check cache
    const now = Date.now();
    if (!cachedAnnouncements || (now - cacheTime) > CACHE_DURATION) {
      cachedAnnouncements = await fetchAllAnnouncements();
      cacheTime = now;
    }

    // Calculate statistics
    const stats = {
      total: cachedAnnouncements.length,
      lastUpdate: new Date(cacheTime).toISOString(),
      newCount: cachedAnnouncements.filter(a => a.isNew).length,
      categories: {},
      sources: {}
    };

    cachedAnnouncements.forEach(a => {
      stats.categories[a.category] = (stats.categories[a.category] || 0) + 1;
      stats.sources[a.source] = (stats.sources[a.source] || 0) + 1;
    });

    res.status(200).json(stats);

  } catch (error) {
    console.error('Error in stats endpoint:', error);
    res.status(500).json({ 
      error: 'Failed to fetch stats',
      message: error.message 
    });
  }
};
