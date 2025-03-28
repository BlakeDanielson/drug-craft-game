document.addEventListener('DOMContentLoaded', function() {
  // Initial elements - basic elements that users can build upon
  const initialElements = [
    { id: 'air', name: 'Air', icon: '💨', category: 'element' },
    { id: 'water', name: 'Water', icon: '💧', category: 'element' },
    { id: 'fire', name: 'Fire', icon: '🔥', category: 'element' },
    { id: 'earth', name: 'Earth', icon: '🌍', category: 'element' }
  ];
  
  // Cache for storing previously generated combinations
  let combinationCache = {};
  
  // Try to load cache from localStorage
  try {
    const savedCache = localStorage.getItem('drugCraftCombinations');
    if (savedCache) {
      combinationCache = JSON.parse(savedCache);
    }
  } catch (e) {
    console.error('Error loading cache:', e);
  }
  
  // Track discovered elements
  let discoveredElements = [...initialElements];
  
  // Try to load discovered elements from localStorage
  try {
    const savedElements = localStorage.getItem('drugCraftElements');
    if (savedElements) {
      discoveredElements = JSON.parse(savedElements);
    }
  } catch (e) {
    console.error('Error loading elements:', e);
  }
  
  // App settings with default values
  let appSettings = {
    useApi: true,  // Always true as we're removing fallbacks
    apiStatus: 'unknown'
  };
  
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
  
  // Selected elements for combination
  let selectedElements = [];
  
  // Active category filter
  let activeCategory = 'all';
  
  // Initialize the game
  function initGame() {
    loadFromLocalStorage();
    renderCategories();
    renderElements();
    
    // Set up event listeners for elements
    setupEventListeners();
    
    // Set up settings panel functionality
    initializeSettings();
    
    // Initialize the game area
    updateCombinationArea();
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
    apiStatusElement.textContent = 'Testing...';
    apiStatusElement.className = 'status testing';
    
    const apiEndpoint = determineApiEndpoint();
    const url = `${apiEndpoint}/generate-combination`;
    
    console.log('Testing API connection to:', url);
    
    try {
      const response = await fetch(url, {
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
      
      if (response.ok) {
        const data = await response.json();
        console.log('API test response data:', data);
        
        apiStatusElement.textContent = 'Connected';
        apiStatusElement.className = 'status connected';
        
        document.getElementById('api-message').textContent = 
          'OpenAI API is available. New combinations will be generated using AI.';
      } else {
        const errorText = await response.text();
        console.error('API test failed with response:', errorText);
        
        apiStatusElement.textContent = 'Error';
        apiStatusElement.className = 'status error';
        
        document.getElementById('api-message').textContent = 
          'Could not connect to OpenAI API. Please check your API key and try again.';
      }
    } catch (error) {
      console.error('API test error:', error);
      
      apiStatusElement.textContent = 'Disconnected';
      apiStatusElement.className = 'status disconnected';
      
      document.getElementById('api-message').textContent = 
        'Could not reach the API server. Please check your internet connection.';
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
    
    // For Vercel deployments
    if (hostname.includes('vercel.app') || hostname.includes('.app') || hostname.includes('.com')) {
      return '/api';
    }
    
    // For localhost development (assuming port 3000 for API server)
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      // Check if we're running on the default serve port (3000) or using a static file server
      const port = window.location.port;
      if (port === '3000') {
        return '/api'; // Next.js API routes
      } else {
        // When using a static file server like 'npx serve', we need to point to the API server
        return 'http://localhost:3000/api';
      }
    }
    
    // For GitHub Pages or other static hosting
    return '/api'; // Fallback to relative path
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
    
    // Render category buttons
    categoriesContainer.innerHTML = '';
    categories.forEach(category => {
      const button = document.createElement('button');
      button.className = `category ${category === activeCategory ? 'active' : ''}`;
      button.textContent = category.charAt(0).toUpperCase() + category.slice(1);
      button.dataset.category = category;
      categoriesContainer.appendChild(button);
    });
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
    
    filteredElements.forEach(element => {
      const elementDiv = createElementDiv(element);
      elementsList.appendChild(elementDiv);
    });
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
    // Element selection - attach to all elements
    document.querySelectorAll('.element').forEach(element => {
      element.addEventListener('click', handleElementClick);
    });
    
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
    const key = elements.sort().join('+');
    if (combinationCache[key]) {
      console.log('Using cached combination for:', key);
      return combinationCache[key];
    }

    console.log('Generating combination for elements:', elements);
    
    const apiEndpoint = determineApiEndpoint();
    const url = `${apiEndpoint}/generate-combination`;
    
    try {
      console.log('Sending API request to:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ elements }),
      });
      
      console.log('API response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error:', errorText);
        throw new Error(`API error: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      console.log('API response data:', result);
      
      // Validate the result
      if (!result || !result.result || !result.name || !result.description || !result.category) {
        console.error('Invalid API response format:', result);
        throw new Error('Invalid response from API');
      }

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