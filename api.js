/**
 * API handler for standalone mode
 * 
 * This file is loaded in the browser and helps with:
 * 1. API request interception when running locally
 * 2. Fallback error handling
 */

(function() {
  console.log('API handler initialized');
  
  // Override fetch for API calls when needed
  const originalFetch = window.fetch;
  
  window.fetch = async function(url, options) {
    // Only intercept calls to our API endpoint
    if (typeof url === 'string' && url.includes('/api/generate-combination')) {
      console.log('API request intercepted:', url);
      
      try {
        // Try the original fetch first
        const response = await originalFetch(url, options);
        return response;
      } catch (error) {
        console.error('API request failed, providing helpful error:', error);
        
        // Create a Response object with an error message
        return new Response(
          JSON.stringify({
            error: 'Failed to connect to the API endpoint',
            message: 'Please make sure you have set up your OpenAI API key and the server is running.',
            details: error.message
          }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
    }
    
    // For all other requests, use the original fetch
    return originalFetch.apply(this, arguments);
  };
})(); 