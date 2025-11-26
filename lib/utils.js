// Shared utilities for Vercel serverless functions
const Parser = require('rss-parser');

// RSS Parser instance
const parser = new Parser();

// AWS announcement sources
const ANNOUNCEMENT_SOURCES = [
  {
    name: 'AWS What\'s New',
    url: 'https://aws.amazon.com/about-aws/whats-new/recent/feed/',
    type: 'rss'
  }
];

// Category keywords for classification
const CATEGORY_KEYWORDS = {
  'AI_ML': ['machine learning', 'ml', 'ai'],
  'COMPUTE': ['ec2', 'lambda', 'fargate'],
  'STORAGE': ['s3', 'ebs', 'efs'],
  'DATABASE': ['rds', 'dynamodb', 'aurora'],
  'ANALYTICS': ['analytics', 'athena', 'emr'],
  'SECURITY': ['security', 'iam', 'cognito'],
  'NETWORKING': ['vpc', 'cloudfront', 'route 53'],
  'DEVTOOLS': ['codecommit', 'codebuild', 'codedeploy'],
  'CONTAINERS': ['ecs', 'eks', 'ecr'],
  'SERVERLESS': ['lambda', 'serverless', 'step functions']
};

// Helper: Categorize announcement using keywords
function categorizeAnnouncement(text) {
  const lowerText = text.toLowerCase();
  
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        return category;
      }
    }
  }
  
  return 'OTHER';
}

// Helper: Generate simple summary (NO AI)
function generateSummary(title, content) {
  return content.substring(0, 200) + '...';
}

// Helper: Fetch RSS feed with timeout
async function fetchRSSFeed(url) {
  console.log(`Fetching RSS from ${url}...`);
  const startTime = Date.now();
  
  try {
    const feed = await parser.parseURL(url);
    console.log(`RSS fetched in ${Date.now() - startTime}ms, got ${feed.items.length} items`);
    
    return feed.items.map(item => ({
      title: item.title,
      link: item.link,
      pubDate: item.pubDate || item.isoDate,
      content: item.contentSnippet || item.content || item.summary || '',
      source: feed.title
    }));
  } catch (error) {
    console.error(`Error fetching RSS from ${url} after ${Date.now() - startTime}ms:`, error.message);
    return [];
  }
}

// Helper: Process raw announcement (NO AI - just categorization)
function processAnnouncement(raw, source) {
  const category = categorizeAnnouncement(raw.title + ' ' + raw.content);
  const summary = generateSummary(raw.title, raw.content);
  
  return {
    id: Buffer.from(raw.link).toString('base64').substring(0, 16),
    title: raw.title,
    category: category,
    timestamp: new Date(raw.pubDate).toISOString(),
    summary: summary,
    fullText: raw.content,
    link: raw.link,
    source: source,
    isNew: (Date.now() - new Date(raw.pubDate)) < 3600000
  };
}

// Main: Fetch announcements - MINIMAL VERSION
async function fetchAllAnnouncements() {
  const overallStart = Date.now();
  console.log('[TEST] Starting minimal fetch...');
  
  const allRawAnnouncements = [];

  // Fetch from ONLY ONE RSS feed
  for (const source of ANNOUNCEMENT_SOURCES) {
    if (source.type === 'rss') {
      const items = await fetchRSSFeed(source.url);
      allRawAnnouncements.push(...items.map(item => ({ ...item, sourceName: source.name })));
    }
  }

  console.log(`[TEST] RSS fetch completed in ${Date.now() - overallStart}ms`);
  console.log(`[TEST] Fetched ${allRawAnnouncements.length} total items`);

  // Take only first 3 items
  const itemsToProcess = allRawAnnouncements.slice(0, 3);
  console.log(`[TEST] Processing ${itemsToProcess.length} items (NO AI)...`);

  // Process WITHOUT AI (instant)
  const processed = itemsToProcess.map(raw => 
    processAnnouncement(raw, raw.sourceName)
  );

  console.log(`[TEST] Processing completed in ${Date.now() - overallStart}ms`);
  console.log(`[TEST] Successfully processed ${processed.length} announcements`);
  console.log(`[TEST] TOTAL TIME: ${Date.now() - overallStart}ms`);

  return processed;
}

// CORS headers
function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };
}

module.exports = {
  fetchAllAnnouncements,
  categorizeAnnouncement,
  generateSummary,
  getCorsHeaders,
  CATEGORY_KEYWORDS
};