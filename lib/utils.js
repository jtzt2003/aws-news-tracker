// lib/utils-configurable.js - Version with configurable backfill days

const Parser = require('rss-parser');
const Anthropic = require('@anthropic-ai/sdk');

// Configuration - Set via environment variable
const BACKFILL_DAYS = parseInt(process.env.BACKFILL_DAYS) || 7; // Default: 7 days
const MAX_ITEMS = parseInt(process.env.MAX_ITEMS) || 100; // Max items to process

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
  'AI_ML': ['machine learning', 'ml', 'ai', 'artificial intelligence', 'bedrock', 'sagemaker', 'comprehend', 'rekognition', 'textract', 'generative ai', 'gen ai', 'foundation model'],
  'COMPUTE': ['ec2', 'lambda', 'fargate', 'batch', 'compute', 'instance', 'graviton', 'elastic compute'],
  'STORAGE': ['s3', 'ebs', 'efs', 'fsx', 'storage', 'backup', 'glacier'],
  'DATABASE': ['rds', 'dynamodb', 'aurora', 'redshift', 'neptune', 'documentdb', 'timestream', 'database', 'elasticache', 'memorydb'],
  'ANALYTICS': ['analytics', 'athena', 'emr', 'kinesis', 'quicksight', 'glue', 'data lake', 'msk', 'kafka'],
  'SECURITY': ['security', 'iam', 'cognito', 'secrets manager', 'kms', 'waf', 'shield', 'guardduty', 'inspector', 'macie', 'detective'],
  'NETWORKING': ['vpc', 'cloudfront', 'route 53', 'direct connect', 'transit gateway', 'network', 'api gateway', 'app mesh', 'cloud map'],
  'DEVTOOLS': ['codecommit', 'codebuild', 'codedeploy', 'codepipeline', 'codeartifact', 'cloud9', 'x-ray', 'developer', 'devops'],
  'CONTAINERS': ['ecs', 'eks', 'ecr', 'container', 'kubernetes', 'docker', 'app runner'],
  'SERVERLESS': ['lambda', 'serverless', 'step functions', 'eventbridge', 'sns', 'sqs', 'api gateway'],
  'OTHER': []
};

// Categorize announcement based on content
function categorizeAnnouncement(title, content) {
  const text = (title + ' ' + content).toLowerCase();
  
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (category === 'OTHER') continue;
    
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        return category;
      }
    }
  }
  
  return 'OTHER';
}

// Generate AI summary using Claude
async function generateSummary(title, content) {
  // Fallback to simple truncation if no API key
  if (!anthropic || !process.env.ANTHROPIC_API_KEY) {
    return content.substring(0, 200) + '...';
  }

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 150,
      messages: [{
        role: 'user',
        content: `Summarize this AWS announcement in 2-3 concise sentences, focusing on the key benefit and what's new:

Title: ${title}
Content: ${content.substring(0, 500)}`
      }]
    });

    return message.content[0].text.trim();
  } catch (error) {
    console.error('Error generating summary:', error.message);
    // Fallback to truncation on error
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

// Process single announcement
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
    isNew: (Date.now() - new Date(raw.pubDate)) < 3600000 // New if < 1 hour old
  };
}

// Main: Fetch all announcements with configurable backfill
async function fetchAllAnnouncements() {
  console.log(`Fetching announcements from all sources (backfill: ${BACKFILL_DAYS} days)...`);
  const allRawAnnouncements = [];

  // Fetch from RSS feeds
  for (const source of ANNOUNCEMENT_SOURCES) {
    if (source.type === 'rss') {
      const items = await fetchRSSFeed(source.url);
      allRawAnnouncements.push(...items.map(item => ({ ...item, sourceName: source.name })));
    }
  }

  console.log(`Fetched ${allRawAnnouncements.length} total items from RSS feeds`);

  // Filter to last N days
  const cutoffDate = Date.now() - (BACKFILL_DAYS * 24 * 60 * 60 * 1000);
  const recentAnnouncements = allRawAnnouncements.filter(raw => {
    const pubDate = new Date(raw.pubDate || raw.isoDate);
    return pubDate.getTime() >= cutoffDate;
  });

  console.log(`Filtered to ${recentAnnouncements.length} announcements from last ${BACKFILL_DAYS} days`);

  // Process announcements (categorize + summarize)
  // Limit to MAX_ITEMS to avoid excessive API calls
  const itemsToProcess = Math.min(recentAnnouncements.length, MAX_ITEMS);
  const processed = [];
  
  for (const raw of recentAnnouncements.slice(0, itemsToProcess)) {
    try {
      const announcement = await processAnnouncement(raw, raw.sourceName);
      processed.push(announcement);
    } catch (error) {
      console.error('Error processing announcement:', error.message);
    }
  }

  console.log(`Processed ${processed.length} announcements (${itemsToProcess - processed.length} failed)`);

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

  console.log(`Final result: ${uniqueAnnouncements.length} unique announcements`);
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
  BACKFILL_DAYS,
  MAX_ITEMS
};