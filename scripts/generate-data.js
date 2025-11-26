// scripts/generate-data.js
// This script fetches AWS announcements and generates static JSON data

const fs = require('fs');
const path = require('path');
const Parser = require('rss-parser');
const Anthropic = require('@anthropic-ai/sdk');

const parser = new Parser();

// Initialize Anthropic client
let anthropic = null;
if (process.env.ANTHROPIC_API_KEY) {
  anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
  });
  console.log('✓ Anthropic API key found');
} else {
  console.log('⚠ No Anthropic API key - will use truncated summaries');
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

// Category keywords - ordered by specificity (most specific first)
const CATEGORY_KEYWORDS = {
  'SECURITY': ['security', 'secrets manager', 'kms', 'waf', 'shield', 'guardduty', 'inspector', 'macie', 'detective', 'iam role', 'iam policy', 'cognito', 'certificate manager', 'acm'],
  'AI_ML': ['machine learning', 'amazon bedrock', 'sagemaker', 'comprehend', 'rekognition', 'textract', 'generative ai', 'gen ai', 'foundation model', 'amazon q', 'polly', 'transcribe', 'translate', 'lex', 'personalize', 'forecast', 'fraud detector', 'lookout', 'deepracer'],
  'DATABASE': ['amazon rds', 'dynamodb', 'aurora', 'redshift', 'neptune', 'documentdb', 'timestream', 'elasticache', 'memorydb', 'database migration'],
  'CONTAINERS': ['amazon ecs', 'amazon eks', 'amazon ecr', 'container', 'kubernetes', 'docker', 'app runner', 'copilot'],
  'SERVERLESS': ['aws lambda', 'step functions', 'eventbridge', 'amazon sns', 'amazon sqs', 'app sync'],
  'COMPUTE': ['amazon ec2', 'aws fargate', 'aws batch', 'elastic compute', 'instance', 'graviton', 'lightsail', 'outposts', 'wavelength', 'local zones'],
  'STORAGE': ['amazon s3', 'amazon ebs', 'amazon efs', 'amazon fsx', 'storage gateway', 'backup', 'glacier', 'snow family'],
  'NETWORKING': ['amazon vpc', 'cloudfront', 'route 53', 'direct connect', 'transit gateway', 'elastic load balancing', 'elb', 'alb', 'nlb', 'app mesh', 'cloud map', 'global accelerator'],
  'ANALYTICS': ['amazon athena', 'amazon emr', 'amazon kinesis', 'amazon quicksight', 'aws glue', 'data lake', 'amazon msk', 'opensearch', 'elasticsearch', 'redshift', 'lake formation'],
  'DEVTOOLS': ['codecommit', 'codebuild', 'codedeploy', 'codepipeline', 'codeartifact', 'cloud9', 'x-ray', 'codewhisperer', 'codeguru', 'cloudshell']
};

// Categorize announcement
function categorizeAnnouncement(title, content) {
  const text = (title + ' ' + content).toLowerCase();
  
  // Check each category
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      // Use word boundaries for better matching
      // This prevents "ml" from matching in "multi" or "ai" in "email"
      const pattern = new RegExp('\\b' + keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
      if (pattern.test(text)) {
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

// Add delay helper
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Main generation function
async function generateData() {
  console.log('🚀 Starting data generation...');
  console.log(`⏰ ${new Date().toISOString()}`);
  
  const allRawAnnouncements = [];

  // Fetch from RSS feeds
  console.log('\n📡 Fetching RSS feeds...');
  for (const source of ANNOUNCEMENT_SOURCES) {
    if (source.type === 'rss') {
      console.log(`  Fetching ${source.name}...`);
      const items = await fetchRSSFeed(source.url);
      console.log(`  ✓ Got ${items.length} items`);
      allRawAnnouncements.push(...items.map(item => ({ ...item, sourceName: source.name })));
    }
  }

  console.log(`\n📊 Total items fetched: ${allRawAnnouncements.length}`);

  // Filter to last 7 days
  const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
  const recentAnnouncements = allRawAnnouncements.filter(raw => {
    const pubDate = new Date(raw.pubDate || raw.isoDate);
    return pubDate.getTime() >= sevenDaysAgo;
  });

  console.log(`📅 Filtered to ${recentAnnouncements.length} announcements from last 7 days`);

  // Process announcements with AI (limit to 50 to avoid excessive API costs)
  const itemsToProcess = recentAnnouncements.slice(0, 25);
  console.log(`\n🤖 Processing ${itemsToProcess.length} announcements with AI...`);
  
  const processed = [];
  for (let i = 0; i < itemsToProcess.length; i++) {
    const raw = itemsToProcess[i];
    try {
      process.stdout.write(`  Processing ${i + 1}/${itemsToProcess.length}...\r`);
      const announcement = await processAnnouncement(raw, raw.sourceName);
      processed.push(announcement);
      
      // Small delay to avoid rate limits
      if ((i + 1) % 10 === 0) {
        await delay(1000); // 1 second delay every 10 items
      }
    } catch (error) {
      console.error(`\n  ✗ Error processing item ${i + 1}:`, error.message);
    }
  }
  
  console.log(`\n✓ Successfully processed ${processed.length} announcements`);

  // Remove duplicates
  const uniqueAnnouncements = processed.reduce((acc, current) => {
    const exists = acc.find(item => item.id === current.id);
    if (!exists) acc.push(current);
    return acc;
  }, []);

  // Sort by timestamp
  uniqueAnnouncements.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  console.log(`📦 Final result: ${uniqueAnnouncements.length} unique announcements`);

  // Generate category stats
  const stats = {
    total: uniqueAnnouncements.length,
    byCategory: {},
    lastUpdated: new Date().toISOString()
  };

  for (const announcement of uniqueAnnouncements) {
    stats.byCategory[announcement.category] = (stats.byCategory[announcement.category] || 0) + 1;
  }

  // Save to JSON file
  const outputDir = path.join(__dirname, '..', 'public', 'data');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputData = {
    announcements: uniqueAnnouncements,
    stats,
    generatedAt: new Date().toISOString()
  };

  const outputPath = path.join(outputDir, 'announcements.json');
  fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));

  console.log(`\n✅ Data saved to ${outputPath}`);
  console.log(`📊 Stats:`, stats);
  console.log('\n🎉 Generation complete!');
}

// Run the generation
generateData().catch(error => {
  console.error('❌ Error during generation:', error);
  process.exit(1);
});
