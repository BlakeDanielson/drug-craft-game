const test = async () => {
  try {
    const OpenAI = require('openai');
    require('dotenv').config();
    
    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    console.log('Testing OpenAI API connection...');
    
    // Test simple completion
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Say hello' }],
      max_tokens: 10
    });
    
    console.log('OpenAI API Test: SUCCESS');
    console.log('Response:', response.choices[0].message.content);
  } catch (error) {
    console.log('OpenAI API Test: FAILED');
    console.error('Error message:', error.message);
  }
};

test(); 