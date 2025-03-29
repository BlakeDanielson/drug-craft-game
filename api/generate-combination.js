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
    Generate a factually accurate result related to illicitdrug production or recreational drug use for combining these elements in a crafting game.
    The game follows these rules:
    1. Each combination must be logical and based on real-world chemistry or drug production methods
    2. Results should be specific items, not generic categories
    3. Each result needs a unique ID, name, emoji icon, category, and description
    4. Categories can be: element, equipment, chemical, object, plant, animal, mineral, artifact, process, beverage, food, etc.

    Here are some example combinations to understand the game's style:
    Earth + Water = Plant (A basic plant grown from seeds and earth)
    Fire + Air = Smoke (Smoke produced from burning materials)
    Water + Air = Mist (Fine water droplets suspended in air)
    Earth + Fire = Ash (Residue left after burning)
    Leaf + Fire = Joint (A rolled paper containing dried plant material)
    Seed + Earth = Cultivation (The process of growing and tending to plants)
    Water + Fire = Steam (Water vapor produced by boiling water)
    Steam + Leaf = Vaporizer (A device that converts substances into vapor)
    Leaf + Water = Tea (An infusion of plant material in hot water)
    Seed + Fire = Roasted Seeds (Seeds that have been heated until cooked)

    Now, please generate a result for combining these elements:
    ${elementInfo}
    
    Respond with a JSON object in this format:
    {
      "id": "unique_id_based_on_inputs",
      "name": "Name of Real Result (specific, not generic)",
      "icon": "Emoji",
      "category": "Category (like 'element', 'equipment', 'chemical', 'object', 'plant', 'animal', 'mineral', 'artifact', etc.)",
      "description": "Brief 1-2 sentence factual description with accurate information about use, effects, chemistry, or cultural context",
      "result": true
    }

    Make sure the result:
    1. Is logically consistent with the input elements
    2. Has a unique and specific name
    3. Uses an appropriate emoji icon
    4. Is categorized correctly
    5. Has a factual description that explains the combination
    `;

    // Generate a response using GPT
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an illicit drug expert with extensive knowledge of all real world elements and their combinations. You understand how all drugs in the world are made and created. You create logical, specific combinations that follow real-world chemistry and drug production methods."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
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