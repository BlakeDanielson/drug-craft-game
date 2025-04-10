const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');
require('dotenv').config(); // Load .env file for local development

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Supabase client
// Use environment variables for URL and Service Role Key
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey || !process.env.OPENAI_API_KEY) {
  console.error('Missing environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or OPENAI_API_KEY');
  // Don't throw here, let the handler return a 500 status
}

// Create Supabase client only if variables are present
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;


// Helper function to get element details by ID
async function getElementById(id) {
  if (!supabase) return null; // Guard clause
  const { data, error } = await supabase
    .from('elements')
    .select('*')
    .eq('id', id)
    .single();
  if (error) {
    console.error(`Error fetching element ${id}:`, error);
    return null;
  }
  return data;
}


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
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Check if Supabase client is initialized (environment variables might be missing)
  if (!supabase) {
    console.error('Supabase client not initialized. Check environment variables.');
    return res.status(500).json({ error: 'Server configuration error', message: 'Supabase client not available.' });
  }
   // Check for OpenAI API key specifically
   if (!process.env.OPENAI_API_KEY) {
    console.error('OpenAI API key not configured.');
    return res.status(500).json({ error: 'Server configuration error', message: 'OpenAI API key not configured.' });
  }


  try {
    console.log('API request received:', req.body);

    const { elements, isTest } = req.body; // elements should be [{id: number, name: string, ...}, ...]

    // --- Test Request Handling ---
    if (isTest) {
      console.log('Handling test request...');
      let testResults = { openai: { ok: false, message: 'Test failed.' }, supabase: { ok: false, message: 'Test failed.' } };

      // Test 1: OpenAI connection
      try {
        const testOpenAI = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: "ping" }],
          max_tokens: 5
        });
        testResults.openai.ok = true;
        testResults.openai.message = 'Connection successful.';
        console.log('OpenAI connection test successful.');
      } catch (error) {
        testResults.openai.message = `Connection failed: ${error.message}`;
        console.error('OpenAI connection test failed:', error);
      }

      // Test 2: Supabase connection (try fetching one element)
      try {
        const { data, error } = await supabase.from('elements').select('id').limit(1).single();
        if (error) throw error;
        testResults.supabase.ok = true;
        testResults.supabase.message = 'Connection successful.';
        console.log('Supabase connection test successful.');
      } catch (error) {
        testResults.supabase.message = `Connection failed: ${error.message}`;
        console.error('Supabase connection test failed:', error);
      }

      // Return combined test results
      const overallOk = testResults.openai.ok && testResults.supabase.ok;
      return res.status(overallOk ? 200 : 500).json({
        id: 'api_test_result',
        name: 'API Connection Test',
        icon: overallOk ? '✅' : '❌',
        category: 'test',
        description: `Test results: OpenAI (${testResults.openai.ok ? 'OK' : 'FAIL'}), Supabase (${testResults.supabase.ok ? 'OK' : 'FAIL'})`,
        result: overallOk,
        details: testResults
      });
    }

    // --- Regular Combination Logic ---
    if (!elements || !Array.isArray(elements) || elements.length !== 2) {
      return res.status(400).json({ error: 'Invalid input', message: 'Exactly two elements are required for combination.' });
    }
    // Ensure elements have IDs
    if (!elements[0].id || !elements[1].id) {
       return res.status(400).json({ error: 'Invalid input', message: 'Element IDs are missing.' });
    }


    // --- Check Supabase for Existing Combination ---
    const elementIds = elements.map(el => el.id).sort((a, b) => a - b);
    const [id1, id2] = elementIds;

    console.log(`Checking database for combination: ${id1} + ${id2}`);

    const { data: existingCombination, error: comboError } = await supabase
      .from('combinations')
      .select('result_element_id')
      .eq('element1_id', id1)
      .eq('element2_id', id2)
      .maybeSingle(); // Use maybeSingle to handle null result gracefully

    if (comboError) {
      console.error('Error checking for existing combination:', comboError);
      return res.status(500).json({ error: 'Database error', message: 'Failed to check combinations.' });
    }

    if (existingCombination) {
      console.log('Combination found in database. Result element ID:', existingCombination.result_element_id);
      // Fetch the full element details for the result
      const resultElement = await getElementById(existingCombination.result_element_id);
      if (resultElement) {
        console.log('Returning cached element:', resultElement);
        // Add isNewGlobalDiscovery flag (false for cached results)
        return res.status(200).json({ ...resultElement, isNewGlobalDiscovery: false });
      } else {
        console.error(`Failed to fetch element details for cached result ID: ${existingCombination.result_element_id}`);
        // If cache is inconsistent, maybe proceed to generate? For now, error out.
        return res.status(500).json({ error: 'Data inconsistency', message: 'Found combination record but could not fetch result element.' });
      }
    }

    console.log('Combination not found in database. Proceeding to AI generation.');


    // --- AI Generation ---
    // Prepare element info for the AI prompt using names and categories
    const elementInfoForPrompt = elements.map(el => `- ${el.name} (${el.category || 'unknown'})`).join('\n');

    // Create a prompt that describes what we want
    const prompt = `
    Generate a simple result for combining these elements in a crafting game.
    Focus on basic, fundamental combinations.
    The result should be the most obvious and straightforward combination.

    Input Elements:
    ${elementInfoForPrompt}

    Respond ONLY with a JSON object in this exact format (no extra text or explanations):
    {
      "name": "Result Name",
      "icon": "Emoji",
      "category": "Category (e.g., element, material, tool, liquid, gas, plant, food)",
      "description": "One simple sentence description.",
      "cost": 0 // Default cost for new elements
    }

    Examples:
    Inputs: Water, Earth -> {"name": "Mud", "icon": "🟤", "category": "material", "description": "Wet soil.", "cost": 0}
    Inputs: Fire, Water -> {"name": "Steam", "icon": "💨", "category": "gas", "description": "Hot water vapor.", "cost": 0}
    Inputs: Fire, Leaf -> {"name": "Ash", "icon": "⚫", "category": "material", "description": "Residue from burning.", "cost": 0}

    Generate the result for the provided Input Elements.
    `;

    // Generate a response using GPT
    console.log("Sending prompt to OpenAI...");
    const aiResponse = await openai.chat.completions.create({
      model: "gpt-3.5-turbo-0125", // Use a specific model version if needed
      messages: [
        { role: "system", content: "You generate simple crafting game combinations as JSON objects." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }, // Request JSON output directly
      temperature: 0.3,
      max_tokens: 150
    });

    // Parse the response
    const aiResultText = aiResponse.choices[0].message.content;
    console.log('Raw AI response:', aiResultText);
    let generatedElementData;
    try {
      generatedElementData = JSON.parse(aiResultText);
    } catch (parseError) {
      console.error("Failed to parse AI response JSON:", parseError, aiResultText);
      throw new Error('AI returned invalid JSON format.');
    }

    // Validate the AI result
    if (!generatedElementData.name || !generatedElementData.icon || !generatedElementData.category || !generatedElementData.description) {
      console.error("AI response missing required fields:", generatedElementData);
      throw new Error('AI response is missing required fields (name, icon, category, description).');
    }

    // --- Check/Insert Element ---
    let resultElementId;
    let finalElementData;

    // Check if an element with this name already exists
    console.log(`Checking if element "${generatedElementData.name}" exists...`);
    const { data: existingElement, error: elementCheckError } = await supabase
      .from('elements')
      .select('*')
      .eq('name', generatedElementData.name)
      .maybeSingle();

    if (elementCheckError) {
      console.error('Error checking for existing element:', elementCheckError);
      throw new Error('Database error checking for existing element.');
    }

    if (existingElement) {
      // Element already exists, use its ID
      resultElementId = existingElement.id;
      finalElementData = existingElement; // Use the existing element data
      console.log(`Element "${generatedElementData.name}" already exists with ID: ${resultElementId}`);
    } else {
      // Element is new, insert it
      console.log(`Element "${generatedElementData.name}" is new. Inserting...`);
      const { data: newElement, error: insertElementError } = await supabase
        .from('elements')
        .insert({
          name: generatedElementData.name,
          icon: generatedElementData.icon,
          category: generatedElementData.category,
          description: generatedElementData.description,
          cost: generatedElementData.cost || 0 // Use AI cost or default to 0
        })
        .select()
        .single();

      if (insertElementError) {
        console.error('Error inserting new element:', insertElementError);
        throw new Error('Database error inserting new element.');
      }
      resultElementId = newElement.id;
      finalElementData = newElement; // Use the newly inserted element data
      console.log(`New element inserted with ID: ${resultElementId}`);
    }

    // --- Insert Combination ---
    console.log(`Inserting combination: ${id1} + ${id2} -> ${resultElementId}`);
    const { error: insertCombinationError } = await supabase
      .from('combinations')
      .insert({
        element1_id: id1,
        element2_id: id2,
        result_element_id: resultElementId
      });

    // Handle potential unique constraint violation gracefully (e.g., race condition)
    if (insertCombinationError && insertCombinationError.code !== '23505') { // 23505 = unique_violation
      console.error('Error inserting combination:', insertCombinationError);
      throw new Error('Database error inserting combination.');
    } else if (insertCombinationError) {
       console.warn(`Combination ${id1}+${id2} seems to already exist despite initial check. Proceeding.`);
    } else {
       console.log('Combination inserted successfully.');
    }

    // Return the final element data (either existing or newly created)
    // Add isNewGlobalDiscovery flag (true for newly generated combinations)
    console.log('Returning final result element (new discovery):', finalElementData);
    return res.status(200).json({ ...finalElementData, isNewGlobalDiscovery: true });
  } catch (error) {
    console.error('Error generating combination:', error);
    return res.status(500).json({ error: 'Failed to generate combination', message: error.message });
  }
};
