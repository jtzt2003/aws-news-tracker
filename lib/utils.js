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
  if (!anthropic || !process.env.ANTHROPIC_API_KEY) {
    // Fallback to first 200 characters if no API key
    return content.substring(0, 200) + '...';
  }

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 150,
      messages: [{
        role: 'user',
        content: `Summarize this AWS announcement in 2-3 concise sentences. Focus on what's new and why it matters:

Title: ${title}

Content: ${content}

Summary:`
      }]
    });

    return message.content[0].text.trim();
  } catch (error) {
    console.error('Error generating summary:', error.message);
    return content.substring(0, 200) + '...';
  }
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

// Main: Fetch all announcements
async function fetchAllAnnouncements() {
  console.log('Fetching announcements from all sources...');
  const allRawAnnouncements = [];

  // Fetch from RSS feeds
  for (const source of ANNOUNCEMENT_SOURCES) {
    if (source.type === 'rss') {
      const items = await fetchRSSFeed(source.url);
      allRawAnnouncements.push(...items.map(item => ({ ...item, sourceName: source.name })));
    }
  }

  console.log(`Fetched ${allRawAnnouncements.length} total items from RSS feeds`);

  // Take only first 5 items to stay under 10-second timeout
  const itemsToProcess = allRawAnnouncements.slice(0, 5);
  console.log(`Processing ${itemsToProcess.length} most recent announcements`);

  // Process announcements (categorize + summarize with AI)
  const processed = [];
  for (const raw of itemsToProcess) {
    try {
      const announcement = await processAnnouncement(raw, raw.sourceName);
      processed.push(announcement);
    } catch (error) {
      console.error('Error processing announcement:', error.message);
    }
  }

  console.log(`Successfully processed ${processed.length} announcements`);

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