document.addEventListener('DOMContentLoaded', function() {
  // Initial elements - the "building blocks" of our drug craft system with more specific raw materials
  const initialElements = [
    { id: 'coca_leaf', name: 'Coca Leaf', icon: '🍃', category: 'natural' },
    { id: 'cannabis_seed', name: 'Cannabis Seed', icon: '🌱', category: 'natural' },
    { id: 'ethanol', name: 'Ethanol', icon: '🧪', category: 'chemical' },
    { id: 'sulfuric_acid', name: 'Sulfuric Acid', icon: '⚗️', category: 'chemical' },
    { id: 'heat', name: 'Heat', icon: '🔥', category: 'method' },
    { id: 'filtration', name: 'Filtration', icon: '🧫', category: 'method' },
    { id: 'container', name: 'Container', icon: '📦', category: 'equipment' },
    { id: 'pipe', name: 'Pipe', icon: '🚬', category: 'equipment' }
  ];
  
  // Cache for storing previously generated combinations
  let combinationsCache = {};
  
  // Try to load cache from localStorage
  try {
    const savedCache = localStorage.getItem('drugCraftCombinations');
    if (savedCache) {
      combinationsCache = JSON.parse(savedCache);
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
  const useApiToggle = document.getElementById('use-api');
  const testApiButton = document.getElementById('test-api-button');
  const apiStatus = document.getElementById('api-status');
  
  // Selected elements for combination
  let selectedElements = [];
  
  // Active category filter
  let activeCategory = 'all';
  
  // Initialize the game
  function initGame() {
    renderElements();
    renderCategories();
    setupEventListeners();
    initializeSettings();
    updateApiStatusDisplay();
    
    // Test API on startup
    testApiConnection();
  }
  
  // Initialize settings panel and controls
  function initializeSettings() {
    // Toggle settings panel visibility
    settingsToggle.addEventListener('click', function() {
      settingsPanel.style.display = settingsPanel.style.display === 'none' ? 'block' : 'none';
    });
    
    // Initialize with settings panel hidden on mobile
    if (window.innerWidth <= 768) {
      settingsPanel.style.display = 'none';
    }
    
    // Set up API toggle - always checked and disabled since we're always using the API
    useApiToggle.checked = true;
    useApiToggle.disabled = true;
    
    // Set up test API button
    testApiButton.addEventListener('click', testApiConnection);
  }
  
  // Test the API connection
  async function testApiConnection() {
    updateApiStatus('testing');
    testApiButton.disabled = true;
    
    try {
      // Determine API endpoint
      let apiUrl = determineApiEndpoint();
      
      // Create test elements
      const testElement1 = { id: 'test', name: 'Test', icon: '🧪', category: 'test' };
      const testElement2 = { id: 'api', name: 'Api', icon: '🔌', category: 'test' };
      
      // Make a test request to the server API
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          element1: testElement1,
          element2: testElement2,
          context: 'drug_craft',
          isTest: true
        }),
      });
      
      if (!response.ok) {
        throw new Error(`API test failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // API is available
      updateApiStatus('available');
      
      // Show a brief notification of success
      const originalContent = resultZone.innerHTML;
      resultZone.innerHTML = `
        <div class="element">
          <span class="element-icon">✅</span> API Test Successful
        </div>
        <p class="description">OpenAI API is working! You can create AI-powered combinations.</p>
      `;
      
      // Restore original content after a delay
      setTimeout(() => {
        resultZone.innerHTML = originalContent;
      }, 3000);
    } catch (error) {
      console.error('API test error:', error);
      updateApiStatus('unavailable');
      
      // Show API unavailable message
      const originalContent = resultZone.innerHTML;
      resultZone.innerHTML = `
        <div class="element">
          <span class="element-icon">❌</span> API Unavailable
        </div>
        <p class="description">OpenAI API is not available. Please check your API key and connection.</p>
        <p class="description">This game requires an active OpenAI API to function.</p>
      `;
      
      // Restore original content after a delay
      setTimeout(() => {
        resultZone.innerHTML = originalContent;
      }, 5000);
    } finally {
      testApiButton.disabled = false;
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
  
  // Determine the appropriate API endpoint based on environment
  function determineApiEndpoint() {
    if (window.location.hostname.includes('vercel.app') || 
        window.location.hostname.includes('netlify.app')) {
      return '/api/generate-combination';
    } else if (window.location.hostname.includes('localhost') || 
              window.location.hostname === '127.0.0.1') {
      return '/api/generate-combination';
    } else {
      // Always return API endpoint, never local
      return '/api/generate-combination';
    }
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
    // Element selection
    elementsList.addEventListener('click', function(e) {
      const elementDiv = e.target.closest('.element');
      if (!elementDiv) return;
      
      selectElement(elementDiv);
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
  
  // Select an element for combination
  function selectElement(elementDiv) {
    const elementId = elementDiv.dataset.id;
    const element = discoveredElements.find(e => e.id === elementId);
    
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
    if (combinationsCache[combinationKey]) {
      handleCombinationResult(combinationsCache[combinationKey]);
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
        const result = await generateCombination(element1, element2);
        
        // Store in cache
        combinationsCache[combinationKey] = result;
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
  async function generateCombination(element1, element2) {
    try {
      // Check if API is available
      if (appSettings.apiStatus === 'unavailable') {
        throw new Error('OpenAI API is not available. Please check your API key and connection.');
      }
      
      // Determine API endpoint
      let apiUrl = determineApiEndpoint();
      
      console.log(`Calling API at: ${apiUrl}`);
      
      // Call the server API
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          element1,
          element2,
          context: 'drug_craft'
        }),
      });
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Validate the response has required fields
      if (!data.name || !data.icon || !data.category) {
        throw new Error('Invalid API response, missing required fields');
      }
      
      // If we get here with a successful response, update API status
      if (appSettings.apiStatus !== 'available') {
        updateApiStatus('available');
      }
      
      // Ensure we have a unique ID
      const result = {
        id: data.id || `${element1.id}_${element2.id}_${Date.now().toString(36)}`,
        name: data.name,
        icon: data.icon,
        category: data.category,
        description: data.description || `A combination of ${element1.name} and ${element2.name}`
      };
      
      return result;
    } catch (error) {
      console.error('Error in combination generation:', error);
      // Update API status on error
      updateApiStatus('unavailable');
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
      localStorage.setItem('drugCraftCombinations', JSON.stringify(combinationsCache));
    } catch (e) {
      console.error('Error saving to localStorage:', e);
    }
  }
  
  // Initialize the game
  initGame();
}); 