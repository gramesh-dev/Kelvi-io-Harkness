const https = require('https');

function callAnthropic(payload, apiKey) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(data)
      }
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          reject(new Error('Invalid JSON from Anthropic'));
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { message: 'Method not allowed' } });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: { message: 'ANTHROPIC_API_KEY not configured.' } });
  }

  const { model, max_tokens, system, messages } = req.body;

  try {
    const payload = {
      model: model || 'claude-sonnet-4-20250514',
      max_tokens: max_tokens || 500,
      messages
    };
    if (system) payload.system = system;

    const result = await callAnthropic(payload, apiKey);

    if (result.status !== 200) {
      return res.status(result.status).json(result.data);
    }

    res.json(result.data);
  } catch (err) {
    console.error('Anthropic API error:', err);
    res.status(500).json({ error: { message: 'Failed to reach Anthropic API.' } });
  }
};
