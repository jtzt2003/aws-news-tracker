// api/diagnose.js - Diagnostic endpoint to check API key status

module.exports = async (req, res) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  try {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      apiKeyStatus: 'NOT_SET',
      apiKeyPresent: false,
      apiKeyValid: false,
      anthropicConfigured: false,
      testSummary: null,
      error: null
    };

    // Check if API key exists
    if (process.env.ANTHROPIC_API_KEY) {
      diagnostics.apiKeyPresent = true;
      diagnostics.apiKeyStatus = 'PRESENT';
      
      // Check format
      if (process.env.ANTHROPIC_API_KEY.startsWith('sk-ant-')) {
        diagnostics.apiKeyValid = true;
        diagnostics.apiKeyStatus = 'VALID_FORMAT';
      } else {
        diagnostics.apiKeyStatus = 'INVALID_FORMAT';
        diagnostics.error = 'API key does not start with sk-ant-';
      }

      // Try to use it
      if (diagnostics.apiKeyValid) {
        try {
          const Anthropic = require('@anthropic-ai/sdk');
          const anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY
          });
          
          diagnostics.anthropicConfigured = true;

          // Try a simple test call
          const message = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 50,
            messages: [{
              role: 'user',
              content: 'Say "API key working!" in exactly those words.'
            }]
          });

          diagnostics.testSummary = message.content[0].text;
          diagnostics.apiKeyStatus = 'WORKING';
          
        } catch (error) {
          diagnostics.apiKeyStatus = 'ERROR';
          diagnostics.error = error.message;
        }
      }
    }

    res.setHeader('Content-Type', 'application/json');
    res.status(200).json(diagnostics);

  } catch (error) {
    console.error('Diagnostic error:', error);
    res.status(500).json({
      error: 'Diagnostic failed',
      message: error.message
    });
  }
};
