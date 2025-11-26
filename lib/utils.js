// Shared utilities for Vercel serverless functions
const Parser = require('rss-parser');
const { Anthropic } = require('@anthropic-ai/sdk');

// RSS Parser instance
const parser = new Parser();

// Anthropic client
let anthropic = null;
if (process.env.ANTHROPIC_API_KEY) {
  anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
  });
}

// AWS announcement sources
const ANNOUNCEMENT_SOURCES = [
  {
    name: 'AWS What\'s New',
    url: 'https://aws.amazon.com/about-aws/whats-new/recent/feed/',
    type: 'rss'
  },
  {
    name: 'AWS News Blog',
    url: 'https://aws.amazon.com/blogs/aws/feed/',
    type: 'rss'
  }
];

// Category keywords for classification
const CATEGORY_KEYWORDS = {
  'AI_ML': ['machine learning', 'ml', 'ai', 'artificial intelligence', 'bedrock', 'sagemaker', 'comprehend', 'rekognition', 'textract', 'generative ai', 'gen ai', 'foundation model'],
  'COMPUTE': ['ec2', 'lambda', 'fargate', 'batch', 'compute', 'instance', 'graviton', 'elastic compute'],
  'STORAGE': ['s3', 'ebs', 'efs', 'fsx', 'storage', 'backup', 'glacier'],
  'DATABASE': ['rds', 'dynamodb', 'aurora', 'redshift', 'neptune', 'documentdb', 'timestream', 'database', 'elasticache', 'memorydb'],
  'ANALYTICS': ['analytics', 'athena', 'emr', 'kinesis', 'quicksight', 'glue', 'data lake', 'msk', 'kafka'],
  'SECURITY': ['security', 'iam', 'cognito', 'secrets manager', 'kms', 'waf', 'shield', 'guardduty', 'inspector', 'macie', 'detective'],
  'NETWORKING': ['vpc', 'cloudfront', 'route 53', 'direct connect', 'transit gateway', 'network', 'api gateway', 'app mesh', 'cloud map'],
  'DEVTOOLS': ['codecommit', 'codebuild', 'codedeploy', 'codepipeline', 'codeartifact', 'cloud9', 'x-ray', 'developer', 'devops'],
  'CONTAINERS': ['ecs', 'eks', 'ecr', 'container', 'kubernetes', 'docker', 'app runner'],
  'SERVERLESS': ['lambda', 'serverless', 'step functions', 'eventbridge', 'sns', 'sqs', 'api gateway']
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

// Helper: Generate AI summary using Claude
async function generateSummary(title, content) {
  // EMERGENCY: Skip ALL AI to make it work
  console.log('[EMERGENCY] Skipping AI, using truncation');
  return content.substring(0, 200) + '...';
}

// Helper: Fetch RSS feed
async function fetchRSSFeed(url) {
  try {
    const feed = await parser.parseURL(url);
    return feed.items.map(item => ({
      title: item.title,
      link: item.link,
      pubDate: item.pubDate || item.isoDate,
      content: item.contentSnippet || item.content || item.summary || '',
      source: feed.title
    }));
  } catch (error) {
    console.error(`Error fetching RSS from ${url}:`, error.message);
    return [];
  }
}

// Helper: Process raw announcement into structured format
async function processAnnouncement(raw, source) {
  const category = categorizeAnnouncement(raw.title + ' ' + raw.content);
  const summary = await generateSummary(raw.title, raw.content);
  
  return {
    id: Buffer.from(raw.link).toString('base64').substring(0, 16),
    title: raw.title,
    category: category,
    timestamp: new Date(raw.pubDate).toISOString(),
    summary: summary,
    fullText: raw.content,
    link: raw.link,
    source: source,
    isNew: (Date.now() - new Date(raw.pubDate)) < 3600000 // New if < 1 hour old
  };
}

// Main: Fetch all announcements with configurable backfill
async function fetchAllAnnouncements() {
  const TIMEOUT_MS = 25000; // 25 second safety timeout (before Vercel's 30s)
  
  // Wrap in timeout protection
  return Promise.race([
    fetchAllAnnouncementsInternal(),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Processing timeout - try reducing items')), TIMEOUT_MS)
    )
  ]);
}

// Internal function with actual logic
async function fetchAllAnnouncementsInternal() {
  const startTime = Date.now();
  console.log('[TIMING] Starting fetchAllAnnouncements...');
  
  console.log('[TIMING] Fetching announcements from all sources...');
  const allRawAnnouncements = [];

  // Fetch from RSS feeds
  for (const source of ANNOUNCEMENT_SOURCES) {
    if (source.type === 'rss') {
      console.log(`[TIMING] Fetching RSS from ${source.name}...`);
      const fetchStart = Date.now();
      const items = await fetchRSSFeed(source.url);
      console.log(`[TIMING] ${source.name} fetched in ${Date.now() - fetchStart}ms, got ${items.length} items`);
      allRawAnnouncements.push(...items.map(item => ({ ...item, sourceName: source.name })));
    }
  }

  console.log(`[TIMING] Total RSS fetch time: ${Date.now() - startTime}ms`);
  console.log(`[TIMING] Fetched ${allRawAnnouncements.length} total items from RSS feeds`);

  // EMERGENCY: Skip date filtering, just take first 10 for speed
  const recentAnnouncements = allRawAnnouncements.slice(0, 10);
  console.log(`[TIMING] Taking first 10 items (no filtering)`);

  // Process announcements (categorize + summarize)
  const processed = [];
  const BATCH_SIZE = 10; // Process 10 at a time (faster)
  const DELAY_MS = 0; // No delay to be fastest
  const MAX_ITEMS = 10; // Ultra-safe: only 10 items
  
  console.log(`[TIMING] Starting to process ${MAX_ITEMS} announcements...`);
  const processStart = Date.now();
  
  // Split into batches to avoid rate limits
  for (let i = 0; i < Math.min(recentAnnouncements.length, MAX_ITEMS); i += BATCH_SIZE) {
    const batch = recentAnnouncements.slice(i, i + BATCH_SIZE);
    console.log(`[TIMING] Processing batch of ${batch.length} items...`);
    const batchStart = Date.now();
    
    // Process batch in parallel
    const batchResults = await Promise.allSettled(
      batch.map(raw => processAnnouncement(raw, raw.sourceName))
    );
    
    console.log(`[TIMING] Batch completed in ${Date.now() - batchStart}ms`);
    
    // Collect successful results
    batchResults.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        processed.push(result.value);
      } else {
        console.error(`[ERROR] Announcement ${i + idx} failed:`, result.reason?.message);
      }
    });
    
    // Delay between batches (except for last batch)
    if (i + BATCH_SIZE < Math.min(recentAnnouncements.length, MAX_ITEMS)) {
      if (DELAY_MS > 0) await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }
  }
  
  console.log(`[TIMING] Total processing time: ${Date.now() - processStart}ms`);
  console.log(`[TIMING] Successfully processed ${processed.length} out of ${Math.min(recentAnnouncements.length, MAX_ITEMS)} announcements`);

  // Remove duplicates by ID
  const uniqueAnnouncements = processed.reduce((acc, current) => {
    const exists = acc.find(item => item.id === current.id);
    if (!exists) {
      acc.push(current);
    }
    return acc;
  }, []);

  // Sort by timestamp (newest first)
  uniqueAnnouncements.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const totalTime = Date.now() - startTime;
  console.log(`[TIMING] TOTAL FUNCTION TIME: ${totalTime}ms`);
  console.log(`[TIMING] Returning ${uniqueAnnouncements.length} announcements`);
  return uniqueAnnouncements;
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