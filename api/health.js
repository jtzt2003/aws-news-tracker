// Vercel serverless function: GET /api/health
const { getCorsHeaders } = require('../lib/utils');

module.exports = async (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'AWS re:Invent Tracker',
    version: '1.0.0'
  });
};
