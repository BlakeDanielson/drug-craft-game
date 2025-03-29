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
    Generate a simple result for combining these elements in a drug-themed crafting game.
    Focus on basic, fundamental combinations that could lead to more complex ones later.
    The result should be the most obvious and straightforward combination of the input elements.

    Key rules:
    1. Keep it extremely simple - prefer basic combinations over complex ones
    2. Results should build gradually - don't skip steps in the production process
    3. Focus on direct combinations of just the two input elements
    4. Avoid complex chemical processes or equipment unless the inputs directly suggest them

    Here are examples of good simple combinations:
    Earth + Water = Mud (Wet earth, the basic growing medium)
    Fire + Air = Smoke (The simple result of burning in air)
    Water + Air = Mist (Water droplets in air)
    Earth + Fire = Ash (Basic burnt earth)
    Leaf + Fire = Smoke (Burning plant material)
    Seed + Earth = Sprout (The beginning of plant growth)
    Water + Fire = Steam (Heated water)
    Leaf + Water = Tea (Simple plant infusion)

    Now, please generate a simple result for combining these elements:
    ${elementInfo}
    
    Respond with a JSON object in this format:
    {
      "id": "unique_id_based_on_inputs",
      "name": "Simple Result Name",
      "icon": "Basic Emoji",
      "category": "Basic Category (element, plant, object, etc.)",
      "description": "One simple sentence describing what happens when these elements combine.",
      "result": true
    }

    Remember:
    1. Keep the combination as simple as possible
    2. Use basic, everyday terms
    3. Choose a clear, obvious emoji
    4. Focus on the immediate result of combining just these two elements
    5. Avoid complex processes or equipment
    `;

    // Generate a response using GPT
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that creates simple, logical combinations in a drug-themed crafting game. You focus on basic, fundamental combinations that could be used as building blocks for more complex items later."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.2, // Reduced temperature for more consistent, simpler outputs
      max_tokens: 250  // Reduced tokens since we want simpler responses
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