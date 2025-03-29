document.addEventListener('DOMContentLoaded', function() {
  // Initial elements - basic drug components as building blocks
  const initialElements = [
    { id: 'leaf', name: 'Coca Seeds', icon: '🌿', category: 'natural' },
    { id: 'seed', name: 'Seed', icon: '🌱', category: 'natural' },
    { id: 'water', name: 'Water', icon: '💧', category: 'element' },
    { id: 'fire', name: 'Fire', icon: '🔥', category: 'element' },
    { id: 'air', name: 'Air', icon: '💨', category: 'element' },
    { id: 'earth', name: 'Earth', icon: '🌍', category: 'element' }
  ];
  
  // Cache for storing previously generated combinations
  let combinationCache = {};
  
  // Track discovered elements
  let discoveredElements = [...initialElements];
  
  // App settings with default values
  let appSettings = {
    useApi: true,  // Always true as we're removing fallbacks
    apiStatus: 'unknown'
  };
  
  // DOM elements
  const elementsList = document.getElementById('elements-list');
  const combinationZone = document.getElementById('combination-zone');
  const firstElement = document.getElementById('first-element');
  const secondElement = document.getElementById('second-element');
  const resultZone = document.getElementById('result-zone');
  const resetButton = document.getElementById('reset-button');
  const searchBar = document.getElementById('search-bar');
  const categoriesContainer = document.getElementById('categories');
  
  // Settings panel elements
  const settingsPanel = document.getElementById('settings-panel');
  const settingsToggle = document.getElementById('toggle-settings');
  const closeButton = document.getElementById('close-settings');
  const testApiButton = document.getElementById('test-api-button');
  const apiStatus = document.getElementById('api-status');
  const apiMessage = document.getElementById('api-message');
  
  // Selected elements for combination
  let selectedElements = [];
  
  // Active category filter
  let activeCategory = 'all';
  
  // Initialize the game
  function initGame() {
    console.log('Game initialization started');
    console.log('Initial elements:', initialElements);
    
    // Load saved data
    loadFromLocalStorage();
    console.log('After loading from localStorage, discovered elements:', discoveredElements);
    
    // Make sure we have the basic elements
    ensureBasicElements();
    
    // Render the UI
    renderCategories();
    renderElements();
    
    // Set up event listeners
    setupEventListeners();
    
    // Set up settings panel
    initializeSettings();
    
    // Initialize the game area
    updateCombinationArea();
    
    console.log('Game initialization completed');
  }
  
  // Ensure the basic elements are always available
  function ensureBasicElements() {
    // Make sure each initial element exists in discoveredElements
    initialElements.forEach(initialElement => {
      const elementExists = discoveredElements.some(element => element.id === initialElement.id);
      if (!elementExists) {
        console.log('Adding missing basic element:', initialElement.name);
        discoveredElements.push(initialElement);
      }
    });
    
    // Save to ensure persistence
    saveToLocalStorage();
  }
  
  // Load data from localStorage
  function loadFromLocalStorage() {
    // Try to load cache from localStorage
    try {
      const savedCache = localStorage.getItem('drugCraftCombinations');
      if (savedCache) {
        combinationCache = JSON.parse(savedCache);
      }
    } catch (e) {
      console.error('Error loading cache:', e);
    }
    
    // Try to load discovered elements from localStorage
    try {
      const savedElements = localStorage.getItem('drugCraftElements');
      if (savedElements) {
        discoveredElements = JSON.parse(savedElements);
      } else {
        discoveredElements = [...initialElements];
      }
    } catch (e) {
      console.error('Error loading elements:', e);
      discoveredElements = [...initialElements];
    }
    
    // Try to load settings from localStorage
    try {
      const savedSettings = localStorage.getItem('drugCraftSettings');
      if (savedSettings) {
        const loadedSettings = JSON.parse(savedSettings);
        // Always force useApi to true
        appSettings = { ...loadedSettings, useApi: true };
      }
    } catch (e) {
      console.error('Error loading settings:', e);
    }
  }
  
  // Initialize settings panel and controls
  function initializeSettings() {
    // Toggle settings panel visibility
    settingsToggle.addEventListener('click', function() {
      settingsPanel.style.display = 'block';
      // Test API automatically when opening settings
      testApiConnection();
    });
    
    // Close settings panel
    closeButton.addEventListener('click', function() {
      settingsPanel.style.display = 'none';
    });
    
    // Set up test API button
    testApiButton.addEventListener('click', function() {
      testApiConnection();
    });
  }
  
  // Test the API connection
  async function testApiConnection() {
    const apiStatusElement = document.getElementById('api-status');
    const apiMessage = document.getElementById('api-message');
    
    apiStatusElement.textContent = 'Testing...';
    apiStatusElement.className = 'status testing';
    
    // Update the message to indicate testing is in progress
    apiMessage.innerHTML = '<p>Testing OpenAI API connection...</p>';
    
    const apiUrl = determineApiEndpoint();
    
    console.log('Testing API connection to:', apiUrl);
    
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          elements: ['Test Element 1', 'Test Element 2'],
          isTest: true
        }),
      });
      
      console.log('API test response status:', response.status);
      
      // Check if the response is OK
      if (response.ok) {
        // Check the content type to make sure it's JSON
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          // We have JSON
          const data = await response.json();
          console.log('API test response data:', data);
          
          // Update API status
          appSettings.apiStatus = 'available';
          saveToLocalStorage();
          
          apiStatusElement.textContent = 'Connected';
          apiStatusElement.className = 'status connected';
          
          // Show the AI's response
          apiMessage.innerHTML = `
            <p>OpenAI API is working! New combinations will be generated using AI.</p>
            <div class="ai-test-response">
              <p><strong>AI Test Response:</strong></p>
              <p>${data.aiResponse || 'No response'}</p>
            </div>
          `;
        } else {
          // Not JSON - probably HTML error page
          const textResponse = await response.text();
          console.error('API returned non-JSON response:', textResponse);
          
          // Update API status
          appSettings.apiStatus = 'unavailable';
          saveToLocalStorage();
          
          apiStatusElement.textContent = 'Error';
          apiStatusElement.className = 'status error';
          
          apiMessage.innerHTML = `
            <p>API server responded but with incorrect format.</p>
            <p class="error-message">Expected JSON but received HTML/text</p>
            <p>Your Vercel deployment might be missing the API route.</p>
          `;
        }
      } else {
        try {
          // Try to parse as JSON first
          const errorData = await response.json();
          console.error('API test failed with response:', errorData);
          
          // Update API status
          appSettings.apiStatus = 'unavailable';
          saveToLocalStorage();
          
          apiStatusElement.textContent = 'Error';
          apiStatusElement.className = 'status error';
          
          apiMessage.innerHTML = `
            <p>Could not connect to OpenAI API.</p>
            <p class="error-message">${errorData.message || 'Unknown error'}</p>
            <p>${errorData.details || 'Please check your API key and try again.'}</p>
          `;
        } catch (parseError) {
          // If it's not JSON, get the text content
          const textResponse = await response.text();
          console.error('Failed to parse error response as JSON:', textResponse);
          
          // Update API status
          appSettings.apiStatus = 'unavailable';
          saveToLocalStorage();
          
          apiStatusElement.textContent = 'Error';
          apiStatusElement.className = 'status error';
          
          apiMessage.innerHTML = `
            <p>API server returned an error (${response.status}).</p>
            <p class="error-message">The API endpoint might not be set up correctly.</p>
            <p>Check your Vercel deployment settings.</p>
          `;
        }
      }
    } catch (error) {
      console.error('API test error:', error);
      
      // Update API status
      appSettings.apiStatus = 'unavailable';
      saveToLocalStorage();
      
      apiStatusElement.textContent = 'Disconnected';
      apiStatusElement.className = 'status disconnected';
      
      let errorMessage = error.message;
      // Check for common syntax error when getting HTML instead of JSON
      if (errorMessage.includes("Unexpected token '<'")) {
        errorMessage = "Received HTML instead of JSON. API endpoint may not exist.";
      }
      
      apiMessage.innerHTML = `
        <p>Could not reach the API server.</p>
        <p class="error-message">${errorMessage}</p>
        <p>Please check your Vercel deployment includes the API folder.</p>
      `;
    }
  }
  
  // Update the API status and save it
  function updateApiStatus(status) {
    appSettings.apiStatus = status;
    saveSettings();
    updateApiStatusDisplay();
  }
  
  // Update the visual display of the API status
  function updateApiStatusDisplay() {
    const statusCircle = apiStatus.querySelector('.status-circle');
    let statusText = '';
    let statusClass = '';
    
    switch(appSettings.apiStatus) {
      case 'available':
        statusText = 'Available';
        statusClass = 'green';
        break;
      case 'unavailable':
        statusText = 'Unavailable';
        statusClass = 'red';
        break;
      case 'testing':
        statusText = 'Testing...';
        statusClass = 'yellow';
        break;
      default:
        statusText = 'Unknown';
        statusClass = 'yellow';
    }
    
    // Remove all status classes
    statusCircle.classList.remove('red', 'green', 'yellow');
    // Add the current status class
    statusCircle.classList.add(statusClass);
    
    // Update the text
    apiStatus.innerHTML = `<span class="status-circle ${statusClass}"></span>${statusText}`;
  }
  
  // Save settings to localStorage
  function saveSettings() {
    try {
      localStorage.setItem('drugCraftSettings', JSON.stringify(appSettings));
    } catch (e) {
      console.error('Error saving settings:', e);
    }
  }
  
  // Determine the API endpoint based on environment
  function determineApiEndpoint() {
    const hostname = window.location.hostname;
    let basePath = '';
    
    // For Vercel deployments
    if (hostname.includes('vercel.app') || hostname.includes('.app') || hostname.includes('.com')) {
      // For Vercel, the API routes are in the /api directory
      basePath = '/api';
    }
    // For localhost development (assuming port 3000 for API server)
    else if (hostname === 'localhost' || hostname === '127.0.0.1') {
      // Check if we're running on the default serve port (3000) or using a static file server
      const port = window.location.port;
      if (port === '3000') {
        basePath = '/api'; // Next.js API routes
      } else {
        // When using a static file server like 'npx serve', we need to point to the API server
        basePath = 'http://localhost:3000/api';
      }
    }
    // For GitHub Pages or other static hosting
    else {
      basePath = '/api'; // Fallback to relative path
    }
    
    console.log('API base path:', basePath);
    // Make sure we use the correct URL format for Vercel deployments
    return `${basePath}/generate-combination`;
  }
  
  // Render category filters
  function renderCategories() {
    // Get unique categories
    const categories = ['all'];
    discoveredElements.forEach(element => {
      if (element.category && !categories.includes(element.category)) {
        categories.push(element.category);
      }
    });
    
    console.log('Rendering categories:', categories);
    
    // Render category buttons
    categoriesContainer.innerHTML = '';
    categories.forEach(category => {
      const button = document.createElement('button');
      button.className = `category ${category === activeCategory ? 'active' : ''}`;
      button.textContent = category.charAt(0).toUpperCase() + category.slice(1);
      button.dataset.category = category;
      categoriesContainer.appendChild(button);
    });
    
    // Make sure we have an active category
    if (categories.length > 0 && !categories.includes(activeCategory)) {
      activeCategory = 'all';
      const allCategoryButton = categoriesContainer.querySelector('[data-category="all"]');
      if (allCategoryButton) {
        allCategoryButton.classList.add('active');
      }
    }
  }
  
  // Render all discovered elements in the panel
  function renderElements(searchTerm = '') {
    elementsList.innerHTML = '';
    
    // Filter elements by search term and category
    const filteredElements = discoveredElements.filter(element => {
      const matchesSearch = searchTerm === '' || 
        element.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = activeCategory === 'all' || 
        element.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
    
    // Debug output
    console.log('Rendering elements:', filteredElements);
    
    filteredElements.forEach(element => {
      const elementDiv = createElementDiv(element);
      elementsList.appendChild(elementDiv);
      
      // Attach event listener directly to each element as we create it
      elementDiv.addEventListener('click', handleElementClick);
    });
    
    // If no elements are shown, make sure we show a message
    if (filteredElements.length === 0) {
      const noElementsMsg = document.createElement('p');
      noElementsMsg.textContent = 'No elements match your filter.';
      noElementsMsg.className = 'no-elements-message';
      elementsList.appendChild(noElementsMsg);
    }
  }
  
  // Create an element div
  function createElementDiv(element) {
    const div = document.createElement('div');
    div.className = 'element';
    div.dataset.id = element.id;
    div.innerHTML = `<span class="element-icon">${element.icon}</span> ${element.name}`;
    return div;
  }
  
  // Setup event listeners
  function setupEventListeners() {
    // Reset button
    resetButton.addEventListener('click', function() {
      if (confirm('Are you sure you want to reset all your discoveries? This will keep previously generated combinations but clear your inventory.')) {
        discoveredElements = [...initialElements];
        selectedElements = [];
        resetCombinationZone();
        saveToLocalStorage();
        renderElements();
        renderCategories();
      }
    });
    
    // Search functionality
    searchBar.addEventListener('input', function(e) {
      renderElements(e.target.value);
    });
    
    // Category filtering
    categoriesContainer.addEventListener('click', function(e) {
      const categoryButton = e.target.closest('.category');
      if (!categoryButton) return;
      
      activeCategory = categoryButton.dataset.category;
      
      // Update active class
      document.querySelectorAll('.category').forEach(btn => {
        btn.classList.remove('active');
      });
      categoryButton.classList.add('active');
      
      renderElements(searchBar.value);
    });
  }
  
  // Handle element click
  function handleElementClick(e) {
    const elementDiv = e.target.closest('.element');
    if (!elementDiv) return;
    
    const elementId = elementDiv.dataset.id;
    const element = discoveredElements.find(e => e.id === elementId);
    
    if (!element) return;
    
    if (selectedElements.length < 2) {
      selectedElements.push(element);
      
      if (selectedElements.length === 1) {
        // First element selected
        firstElement.innerHTML = `<div class="element">${element.icon} ${element.name}</div>`;
        firstElement.classList.remove('placeholder');
      } else {
        // Second element selected
        secondElement.innerHTML = `<div class="element">${element.icon} ${element.name}</div>`;
        secondElement.classList.remove('placeholder');
        
        // Process the combination after a short delay
        setTimeout(processCombination, 500);
      }
    }
  }
  
  // Process the combination of selected elements
  async function processCombination() {
    // Sort elements to ensure consistent key regardless of order selected
    const sortedElements = [...selectedElements].sort((a, b) => a.id.localeCompare(b.id));
    const element1 = sortedElements[0];
    const element2 = sortedElements[1];
    
    // Create a unique key for this combination
    const combinationKey = `${element1.id}+${element2.id}`;
    
    // Check if we already have this combination in cache
    if (combinationCache[combinationKey]) {
      handleCombinationResult(combinationCache[combinationKey]);
    } else {
      // API is required - check status first
      if (appSettings.apiStatus === 'unavailable') {
        resultZone.innerHTML = `
          <div class="element">
            <span class="element-icon">❌</span> API Unavailable
          </div>
          <p class="description">OpenAI API is not available. Please check your API key and connection.</p>
          <p class="description">This game requires an active OpenAI API to function.</p>
        `;
        
        setTimeout(resetCombinationZone, 4000);
        return;
      }
      
      // Need to generate a new combination via AI
      resultZone.innerHTML = `<div class="loading"></div> Generating combination...`;
      
      try {
        // Generate combination with AI
        const result = await generateCombination([element1, element2]);
        
        // Store in cache
        combinationCache[combinationKey] = result;
        saveToLocalStorage();
        
        // Process the result
        handleCombinationResult(result);
      } catch (error) {
        resultZone.innerHTML = `
          <p>Error generating combination: ${error.message}</p>
          <p>The OpenAI API is required for this game to function.</p>
        `;
        console.error('Error generating combination:', error);
        
        // Update API status to unavailable
        updateApiStatus('unavailable');
        
        setTimeout(resetCombinationZone, 4000);
      }
    }
  }
  
  // Handle the result of a combination
  function handleCombinationResult(result) {
    // Check if this is a new discovery
    const isNewDiscovery = !discoveredElements.some(e => e.id === result.id);
    
    if (isNewDiscovery) {
      // Add to discovered elements
      discoveredElements.push(result);
      saveToLocalStorage();
      
      // Update the elements panel
      renderElements();
      renderCategories();
    }
    
    // Show result
    resultZone.innerHTML = `
      <div class="element">
        <span class="element-icon">${result.icon}</span> ${result.name}
        ${isNewDiscovery ? ' <span style="color: #4ecdc4;">(New Discovery!)</span>' : ''}
      </div>
      ${result.description ? `<p class="description">${result.description}</p>` : ''}
    `;
    
    // Reset the combination zone after a delay
    setTimeout(resetCombinationZone, 3000);
  }
  
  // Generate a combination using AI
  async function generateCombination(elements) {
    // Check if we have a cached result
    const elementIds = elements.map(el => el.id).sort();
    const key = elementIds.join('+');
    if (combinationCache[key]) {
      console.log('Using cached combination for:', key);
      return combinationCache[key];
    }

    console.log('Generating combination for elements:', elements);
    
    const apiUrl = determineApiEndpoint();
    
    try {
      console.log('Sending API request to:', apiUrl);
      
      // Extract just the necessary information for each element
      const elementData = elements.map(el => ({
        id: el.id,
        name: el.name,
        category: el.category
      }));
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          elements: elementData,
          isTest: false
        }),
      });
      
      console.log('API response status:', response.status);
      
      // Check if the response is OK
      if (!response.ok) {
        let errorMessage = `API error: ${response.status}`;
        try {
          // Try to parse as JSON first
          const errorData = await response.json();
          console.error('API error:', errorData);
          errorMessage = errorData.message || errorMessage;
        } catch (parseError) {
          // If it's not JSON, get the text snippet
          const textResponse = await response.text();
          console.error('API returned non-JSON error:', textResponse.substring(0, 150));
          if (textResponse.includes('<')) {
            errorMessage = 'API returned HTML instead of JSON. The endpoint might not exist.';
          }
        }
        
        // Update API status
        appSettings.apiStatus = 'unavailable';
        saveToLocalStorage();
        
        throw new Error(errorMessage);
      }

      // Check content type to make sure it's JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('API returned non-JSON response type:', contentType);
        throw new Error('API returned incorrect content type. Expected JSON.');
      }

      const result = await response.json();
      console.log('API response data:', result);
      
      // Validate the result
      if (!result || !result.result || !result.name || !result.description || !result.category) {
        console.error('Invalid API response format:', result);
        throw new Error('Invalid response from API');
      }

      // Update API status to available since request succeeded
      appSettings.apiStatus = 'available';
      saveToLocalStorage();
      
      // Cache the result
      combinationCache[key] = result;
      saveToLocalStorage();
      
      return result;
    } catch (error) {
      console.error('Error generating combination:', error);
      throw error;
    }
  }
  
  // Reset the combination zone
  function resetCombinationZone() {
    firstElement.innerHTML = '';
    secondElement.innerHTML = '';
    firstElement.classList.add('placeholder');
    secondElement.classList.add('placeholder');
    selectedElements = [];
    resultZone.innerHTML = '<p>Combine elements to see the result</p>';
  }
  
  // Save current state to localStorage
  function saveToLocalStorage() {
    try {
      localStorage.setItem('drugCraftElements', JSON.stringify(discoveredElements));
      localStorage.setItem('drugCraftCombinations', JSON.stringify(combinationCache));
    } catch (e) {
      console.error('Error saving to localStorage:', e);
    }
  }
  
  // Update the combination area to its initial state
  function updateCombinationArea() {
    // Reset the combination zone
    resetCombinationZone();
    // Make sure the result zone shows the default message
    resultZone.innerHTML = '<p>Combine elements to see the result</p>';
  }
  
  // Initialize the game
  initGame();
}); 