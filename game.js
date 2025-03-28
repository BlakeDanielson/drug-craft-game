// Initial elements - basic drug components as building blocks
const initialElements = [
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
let elementsList, combinationZone, firstElement, secondElement, resultZone, resetButton, searchBar, categoriesContainer;

// Settings panel elements
let settingsPanel, settingsToggle, closeButton, testApiButton, apiStatus, apiMessage;

// Selected elements for combination
let selectedElements = [];

// Active category filter
let activeCategory = 'all';

document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM loaded - initializing game');
  console.log('Initial elements:', initialElements);
  
  // Initialize DOM element references
  elementsList = document.getElementById('elements-list');
  combinationZone = document.getElementById('combination-zone');
  firstElement = document.getElementById('first-element');
  secondElement = document.getElementById('second-element');
  resultZone = document.getElementById('result-zone');
  resetButton = document.getElementById('reset-button');
  searchBar = document.getElementById('search-bar');
  categoriesContainer = document.getElementById('categories');
  
  // Settings panel elements
  settingsPanel = document.getElementById('settings-panel');
  settingsToggle = document.getElementById('toggle-settings');
  closeButton = document.getElementById('close-settings');
  testApiButton = document.getElementById('test-api-button');
  apiStatus = document.getElementById('api-status');
  apiMessage = document.getElementById('api-message');
  
  // Reset selected elements
  selectedElements = [];
  
  // Reset categories
  activeCategory = 'all';
  
  // Make sure elements are loaded
  loadFromLocalStorage();
  console.log('After loadFromLocalStorage, discovered elements:', discoveredElements.length);
  
  // Ensure basic elements exist
  ensureBasicElements();
  console.log('After ensureBasicElements, discovered elements:', discoveredElements.length);
  
  // Initialize the game elements
  renderCategories();
  renderElements();
  
  // Setup event listeners
  setupEventListeners();
  
  // Initialize the combination area
  updateCombinationArea();
  
  console.log('Game initialized with', discoveredElements.length, 'elements');
});

// Ensure the basic elements are always available
function ensureBasicElements() {
  console.log('Ensuring basic elements exist');
  
  // Make sure each initial element exists in discoveredElements
  initialElements.forEach(initialElement => {
    console.log('Checking element:', initialElement.name);
    const elementExists = discoveredElements.some(element => element.id === initialElement.id);
    if (!elementExists) {
      console.log('Adding missing basic element:', initialElement.name);
      discoveredElements.push(initialElement);
    }
  });
  
  // Save to ensure persistence
  saveToLocalStorage();
  
  console.log('Basic elements check complete');
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
  saveToLocalStorage();
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

// Render the elements list
function renderElements(searchTerm = '') {
  console.log('Rendering elements with search term:', searchTerm);
  console.log('Total discovered elements:', discoveredElements.length);
  console.log('Discovered elements:', JSON.stringify(discoveredElements));
  
  if (!elementsList) {
    console.error('Elements list DOM element not found');
    return;
  }
  
  // Clear the current list
  elementsList.innerHTML = '';
  
  // Filter elements based on search term and active category
  let filteredElements = discoveredElements.filter(element => {
    const matchesSearch = !searchTerm || element.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === 'all' || element.category === activeCategory;
    return matchesSearch && matchesCategory;
  });
  
  console.log(`Filtered elements: ${filteredElements.length} items`);
  
  // Sort elements by name
  filteredElements.sort((a, b) => a.name.localeCompare(b.name));
  
  // Create and append elements to the list
  filteredElements.forEach(element => {
    const elementDiv = createElementDiv(element);
    elementsList.appendChild(elementDiv);
  });
  
  // Add a message if no elements were found
  if (filteredElements.length === 0) {
    elementsList.innerHTML = '<div class="no-elements">No elements found</div>';
  }
  
  // Ensure scrolling works by forcing a reflow
  elementsList.style.display = 'none';
  elementsList.offsetHeight; // Force reflow
  elementsList.style.display = '';
  
  // Scroll to top for better usability
  elementsList.scrollTop = 0;
}

// Create an element div
function createElementDiv(element) {
  const elementDiv = document.createElement('div');
  elementDiv.className = `element ${element.complexity ? 'complexity-' + element.complexity.toLowerCase() : ''}`;
  elementDiv.setAttribute('data-id', element.id);
  elementDiv.setAttribute('draggable', 'true');
  
  let complexityBadge = '';
  if (element.complexity) {
    complexityBadge = `<span class="complexity-badge complexity-${element.complexity.toLowerCase()}">${element.complexity}</span>`;
  }
  
  elementDiv.innerHTML = `
    <span class="element-icon">${element.icon}</span>
    <span class="element-name">${element.name}</span>
    ${complexityBadge}
  `;
  
  // Add drag event listeners
  elementDiv.addEventListener('dragstart', handleDragStart);
  
  // Add click event listener
  elementDiv.addEventListener('click', handleElementClick);
  
  return elementDiv;
}

// Set up event listeners
function setupEventListeners() {
  // Search functionality
  searchBar.addEventListener('input', function(e) {
    const searchTerm = e.target.value.trim();
    renderElements(searchTerm);
  });
  
  // Reset button
  resetButton.addEventListener('click', function() {
    if (confirm('Are you sure you want to reset all discoveries? This cannot be undone.')) {
      discoveredElements = [...initialElements];
      combinationCache = {};
      saveToLocalStorage();
      renderCategories();
      renderElements();
      resetCombinationZone();
    }
  });
  
  // Handle combination zone drops
  combinationZone.addEventListener('dragover', function(event) {
    event.preventDefault();
  });
  
  // Handle combination zone drops
  firstElement.addEventListener('drop', handleDrop);
  secondElement.addEventListener('drop', handleDrop);
  
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
    
    // Re-render elements with the new filter
    renderElements(searchBar.value.trim());
  });
  
  // Setting panel events
  settingsToggle.addEventListener('click', function() {
    settingsPanel.style.display = 'block';
  });
  
  closeButton.addEventListener('click', function() {
    settingsPanel.style.display = 'none';
  });
  
  testApiButton.addEventListener('click', testApiConnection);
}

// Handle drag start
function handleDragStart(event) {
  const elementId = event.target.dataset.id;
  event.dataTransfer.setData('text/plain', elementId);
  event.target.classList.add('dragging');
}

// Handle drop
function handleDrop(event) {
  event.preventDefault();
  
  const elementId = event.dataTransfer.getData('text/plain');
  const element = discoveredElements.find(e => e.id === elementId);
  
  if (!element) return;
  
  const targetZone = event.target.closest('.drop-zone');
  if (!targetZone) return;
  
  // Clear placeholder styling
  targetZone.innerHTML = '';
  targetZone.classList.remove('placeholder');
  
  // Create a copy of the element div for the drop zone
  const elementCopy = createElementDiv(element);
  elementCopy.classList.add('in-combination');
  targetZone.appendChild(elementCopy);
  
  // Store the element in our selected elements
  if (targetZone.id === 'first-element') {
    selectedElements[0] = element;
  } else if (targetZone.id === 'second-element') {
    selectedElements[1] = element;
  }
  
  // Process combination if we have two elements
  if (selectedElements.length === 2 && selectedElements[0] && selectedElements[1]) {
    processCombination();
  }
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

// Handle a successful combination result
function handleCombinationResult(result) {
  console.log('Handling combination result:', result);
  
  resultZone.innerHTML = '';
  
  if (!result || typeof result !== 'object') {
    resultZone.innerHTML = '<div class="error">Invalid result received from API</div>';
    return;
  }
  
  // Required properties
  if (!result.name || !result.description || !result.category || !result.icon) {
    resultZone.innerHTML = '<div class="error">Invalid result data: missing required properties</div>';
    return;
  }
  
  // Extract properties
  const { name, description, category, icon } = result;
  const id = result.id || generateId(name);
  const complexity = result.complexity || 'Medium'; // Default to Medium if not provided
  
  const resultElement = document.createElement('div');
  resultElement.className = `result-element element complexity-${complexity.toLowerCase()}`;
  
  const isNewDiscovery = !discoveredElements.some(elem => elem.id === id || elem.name === name);
  
  // Create the full element object
  const newElement = {
    id: id,
    name: name,
    description: description,
    category: category,
    icon: icon,
    complexity: complexity
  };
  
  // Add to discovered elements if it's new
  if (isNewDiscovery) {
    console.log('New element discovered:', newElement);
    discoveredElements.push(newElement);
    saveToLocalStorage();
    renderCategories();
    renderElements(); // Refresh the elements display
  }
  
  // Prepare the status message
  const statusMessage = isNewDiscovery 
    ? `<div class="new-element">New discovery! Added to your collection.</div>`
    : `<div class="already-discovered">You already discovered this element.</div>`;
  
  // Build the result HTML
  let complexityBadge = '';
  if (complexity) {
    complexityBadge = `<span class="complexity-badge complexity-${complexity.toLowerCase()}">${complexity}</span>`;
  }
  
  resultElement.innerHTML = `
    <div class="element-icon">${icon}</div>
    <div>
      <div class="element-name">${name} ${complexityBadge}</div>
      <div class="category">${category}</div>
      <p>${description}</p>
      ${statusMessage}
    </div>
  `;
  
  resultZone.appendChild(resultElement);
  
  // Reset combination zone
  resetCombinationZone();
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

// Generate a unique ID for an element based on its name
function generateId(name) {
  // Remove spaces and special characters, convert to lowercase
  const base = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  // Add a timestamp to ensure uniqueness
  return `${base}_${Date.now()}`;
}

// Update the combination area to its initial state
function updateCombinationArea() {
  // Reset the combination zone
  resetCombinationZone();
  // Make sure the result zone shows the default message
  resultZone.innerHTML = '<p>Combine elements to see the result</p>';
}

// ... rest of the existing code ... 