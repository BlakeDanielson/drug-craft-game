const OpenAI = require('openai');
require('dotenv').config();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Ensure we're handling a POST request
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('API request received:', req.body);
    
    const { elements, isTest } = req.body;

    if (!elements || !Array.isArray(elements) || elements.length < 2) {
      return res.status(400).json({ error: 'Need at least two elements to combine' });
    }

    // Check for API key
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }

    // If this is just a test request, send a simple request to OpenAI to verify the API key
    if (isTest) {
      console.log('Handling test request - verifying OpenAI API key');
      
      try {
        // Send a simple request to OpenAI to verify the API key works
        const testResponse = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "user",
              content: "is the api connected?"
            }
          ],
          max_tokens: 50
        });
        
        // If we get here, the API key is valid
        console.log('OpenAI API key is valid:', testResponse.choices[0].message);
        return res.status(200).json({
          id: 'test_successful',
          name: 'API Test',
          icon: '✅',
          category: 'test',
          description: 'The OpenAI API connection is working correctly.',
          result: true,
          aiResponse: testResponse.choices[0].message.content
        });
      } catch (error) {
        // If there's an error, the API key is likely invalid
        console.error('OpenAI API key validation failed:', error);
        return res.status(500).json({
          error: 'OpenAI API key validation failed',
          message: error.message,
          details: 'Your API key might be invalid or has exceeded its rate limit'
        });
      }
    }

    // Extract element info for prompt
    const elementInfo = elements.map(el => {
      // Handle both string elements and object elements
      if (typeof el === 'string') {
        return `- ${el}`;
      } else if (el && el.name) {
        return `- ${el.name} (${el.category || 'unknown'})`;
      } else {
        return `- Unknown element`;
      }
    }).join('\n');

    console.log('Processing elements:', elementInfo);

    // Create a prompt that describes what we want
    const prompt = `
    You're a drug enthusiast with actual scientific knowledge. Create logical combinations that follow both science and drug culture knowledge:

    ${elementInfo}
    
    APPROACH:
    - For basic science combinations: Use real physical/chemical reactions (e.g., "water + fire = steam")
    - For drug culture combinations: Create practical, real-world items (e.g., "cannabis + paper = joint")
    - Combinations should be things that actually make sense to someone who knows about drugs
    
    EXAMPLES OF GOOD COMBINATIONS:
    - "water + fire" → "steam"
    - "water + air" → "humidity"
    - "water + earth" → "clay"
    - "fire + air" → "smoke"
    - "fire + earth" → "ash"
    - "air + earth" → "wind"
    - "coca leaf + sulfuric acid" → "cocaine extraction"
    - "cannabis + pipe" → "loaded pipe"
    - "loaded pipe + fire" → "lit pipe"
    - "ethanol + plant material" → "tincture"
    - "container + ethanol" → "container of ethanol"
    - "container of ethanol + fire" → "ethanol extraction"
    - "cannabis + heat" → "decarboxylated cannabis"
    - "cannabis + container" → "container of cannabis"
    
    Don't overthink it. Keep combinations simple and obvious. When given two elements that have an obvious combination in drug culture, provide that result.
    
    Respond with a JSON object in this format:
    {
      "id": "unique_id",
      "name": "Result Name",
      "icon": "Appropriate Emoji",
      "category": "material/chemical/tool/technique/drug",
      "description": "Brief description of what this is (1-2 sentences)",
      "complexity": "low/medium/high"
    }
    `;

    // Generate a response using GPT
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a knowledgeable drug enthusiast with a scientific background. You understand both the chemistry of substances and their practical applications in drug culture. You provide straightforward, logical combinations based on real-world principles."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.5,
      max_tokens: 350
    });

    // Parse the response
    const textResponse = response.choices[0].message.content.trim();
    console.log('Raw API response:', textResponse);
    
    // Try to extract a valid JSON object
    let jsonMatch = textResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to generate valid combination');
    }
    
    const result = JSON.parse(jsonMatch[0]);
    
    // Validate the result has the required fields
    if (!result.name || !result.icon || !result.category || !result.description) {
      throw new Error('Generated result is missing required fields');
    }
    
    // Set a unique ID if not provided
    if (!result.id) {
      const elementIds = elements.map(el => typeof el === 'string' ? el : el.id || '').filter(Boolean).sort().join('_');
      result.id = `${elementIds}_${Date.now().toString(36)}`;
    }

    // Make sure result flag is set
    result.result = true;

    console.log('Sending combination result:', result);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error generating combination:', error);
    return res.status(500).json({ error: 'Failed to generate combination', message: error.message });
  }
}; 