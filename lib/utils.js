// Shared utilities for Vercel serverless functions
const Parser = require('rss-parser');
const Anthropic = require('@anthropic-ai/sdk');

const parser = new Parser();

// Initialize Anthropic client
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

// Category keywords
const CATEGORY_KEYWORDS = {
  'AI_ML': ['machine learning', 'ml', 'ai', 'artificial intelligence', 'bedrock', 'sagemaker'],
  'COMPUTE': ['ec2', 'lambda', 'fargate', 'batch', 'compute', 'instance'],
  'STORAGE': ['s3', 'ebs', 'efs', 'fsx', 'storage'],
  'DATABASE': ['rds', 'dynamodb', 'aurora', 'redshift', 'database'],
  'ANALYTICS': ['analytics', 'athena', 'emr', 'kinesis', 'quicksight'],
  'SECURITY': ['security', 'iam', 'cognito', 'kms', 'waf'],
  'NETWORKING': ['vpc', 'cloudfront', 'route 53', 'network'],
  'DEVTOOLS': ['codecommit', 'codebuild', 'codedeploy', 'codepipeline'],
  'CONTAINERS': ['ecs', 'eks', 'ecr', 'container', 'kubernetes'],
  'SERVERLESS': ['lambda', 'serverless', 'step functions', 'eventbridge']
};

// Categorize announcement
function categorizeAnnouncement(title, content) {
  const text = (title + ' ' + content).toLowerCase();
  
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        return category;
      }
    }
  }
  
  return 'OTHER';
}

// Generate AI summary
async function generateSummary(title, content) {
  if (!anthropic || !process.env.ANTHROPIC_API_KEY) {
    return content.substring(0, 200) + '...';
  }

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 150,
      messages: [{
        role: 'user',
        content: `Summarize this AWS announcement in 2-3 concise sentences:

Title: ${title}
Content: ${content.substring(0, 500)}`
      }]
    });

    return message.content[0].text.trim();
  } catch (error) {
    console.error('Error generating summary:', error.message);
    return content.substring(0, 200) + '...';
  }
}

// Fetch RSS feed
async function fetchRSSFeed(url) {
  try {
    const feed = await parser.parseURL(url);
    return feed.items;
  } catch (error) {
    console.error(`Error fetching RSS from ${url}:`, error.message);
    return [];
  }
}

// Process announcement
async function processAnnouncement(raw, source) {
  const summary = await generateSummary(raw.title, raw.contentSnippet || raw.content || '');
  const category = categorizeAnnouncement(raw.title, raw.contentSnippet || raw.content || '');
  
  return {
    id: raw.guid || raw.link,
    title: raw.title,
    summary,
    category,
    timestamp: raw.isoDate || raw.pubDate,
    link: raw.link,
    source,
    isNew: (Date.now() - new Date(raw.pubDate)) < 3600000
  };
}

// Main function - Process only 8 items to stay under timeout
async function fetchAllAnnouncements() {
  console.log('Fetching announcements...');
  const allRawAnnouncements = [];

  // Fetch from RSS feeds
  for (const source of ANNOUNCEMENT_SOURCES) {
    if (source.type === 'rss') {
      const items = await fetchRSSFeed(source.url);
      allRawAnnouncements.push(...items.map(item => ({ ...item, sourceName: source.name })));
    }
  }

  console.log(`Fetched ${allRawAnnouncements.length} total items`);

  // Process ONLY first 8 items (safe for 10-second timeout)
  const processed = [];
  for (const raw of allRawAnnouncements.slice(0, 8)) {
    try {
      const announcement = await processAnnouncement(raw, raw.sourceName);
      processed.push(announcement);
    } catch (error) {
      console.error('Error processing announcement:', error.message);
    }
  }

  console.log(`Processed ${processed.length} announcements`);

  // Remove duplicates
  const uniqueAnnouncements = processed.reduce((acc, current) => {
    const exists = acc.find(item => item.id === current.id);
    if (!exists) acc.push(current);
    return acc;
  }, []);

  // Sort by timestamp
  uniqueAnnouncements.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return uniqueAnnouncements;
}

// CORS headers
function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

module.exports = {
  fetchAllAnnouncements,
  categorizeAnnouncement,
  generateSummary,
  getCorsHeaders,
  CATEGORY_KEYWORDS
};