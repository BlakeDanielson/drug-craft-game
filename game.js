document.addEventListener('DOMContentLoaded', function() {
  // Supabase client instance (assuming it's initialized in supabaseClient.js and attached to window)
  const supabase = window._supabase;

  // Store fetched data
  let discoveredElements = []; // Populated from player_inventory join elements
  let combinationCache = {}; // Populated from combinations table
  let allElements = {}; // Cache for all elements by ID for quick lookup

  // App settings with default values
  let appSettings = {
    useApi: true,  // Always true as we're removing fallbacks
    apiStatus: 'unknown'
  };
  
  // DOM elements
  const elementsList = document.getElementById('elements-list');
  const combinationZone = document.getElementById('playground');
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
  
  // Keep track of elements in the playground
  let playgroundElements = [];
  let nextElementId = 1;
  
  // Keep track of the currently dragged element
  let currentDraggedElement = null;
  let currentDraggedElementData = null;

  // Initialize the game
  async function initGame() {
    console.log('Game initialization started');

    if (!supabase) {
      console.error("Supabase client not found. Make sure supabaseClient.js is loaded and initialized.");
      alert("Error: Supabase client not available. Cannot load game data.");
      return;
    }

    // Load data from Supabase
    await loadDataFromSupabase();
    console.log('After loading from Supabase, discovered elements:', discoveredElements);
    console.log('Known combinations:', combinationCache);

    // Render the UI
    renderCategories(); // Needs discoveredElements
    renderElements();
    
    // Set up event listeners
    setupEventListeners();
    
    // Set up settings panel
    initializeSettings();
    
    // Initialize the game area
    updateCombinationArea();
    
    console.log('Game initialization completed');
  }

  // Load initial game data from Supabase
  async function loadDataFromSupabase() {
    console.log('Loading data from Supabase...');
    try {
      // 1. Fetch all elements and store in allElements cache
      const { data: allElementsData, error: elementsError } = await supabase
        .from('elements')
        .select('*');

      if (elementsError) throw elementsError;
      allElements = allElementsData.reduce((acc, el) => {
        acc[el.id] = el; // Use database ID as key
        return acc;
      }, {});
      console.log('Fetched all elements:', allElements);

      // 2. Fetch discovered elements (player inventory)
      const { data: inventoryData, error: inventoryError } = await supabase
        .from('player_inventory')
        .select('element_id');

      if (inventoryError) throw inventoryError;

      // Map inventory IDs to full element objects
      discoveredElements = inventoryData.map(item => allElements[item.element_id]).filter(Boolean); // Filter out potential nulls if element deleted
      console.log('Fetched discovered elements:', discoveredElements);

      // 3. Fetch known combinations
      const { data: combinationsData, error: combinationsError } = await supabase
        .from('combinations')
        .select('*');

      if (combinationsError) throw combinationsError;

      // Populate combinationCache (key: 'element1_id+element2_id', value: result_element_id)
      combinationCache = combinationsData.reduce((acc, combo) => {
        // Ensure consistent key order (smaller ID first)
        const key = [combo.element1_id, combo.element2_id].sort((a, b) => a - b).join('+');
        acc[key] = combo.result_element_id; // Store only the result ID
        return acc;
      }, {});
      console.log('Fetched combinations cache:', combinationCache);

      // 4. Load settings from localStorage (keep this for non-persistent settings)
      try {
        const savedSettings = localStorage.getItem('drugCraftSettings');
        if (savedSettings) {
          const loadedSettings = JSON.parse(savedSettings);
          // Always force useApi to true (or handle based on actual logic)
          appSettings = { ...loadedSettings, useApi: true };
        }
      } catch (e) {
        console.error('Error loading settings from localStorage:', e);
      }

    } catch (error) {
      console.error('Error loading data from Supabase:', error);
      alert(`Failed to load game data: ${error.message}. Please check console and refresh.`);
      // Set empty defaults to prevent further errors
      discoveredElements = [];
      combinationCache = {};
      allElements = {};
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
  
  // Save settings to localStorage (only for non-persistent settings)
  function saveSettings() {
    try {
      // Filter out data that should be persisted in Supabase if necessary
      const settingsToSave = { ...appSettings };
      // delete settingsToSave.someDatabaseRelatedSetting; // Example
      localStorage.setItem('drugCraftSettings', JSON.stringify(settingsToSave));
    } catch (e) {
      console.error('Error saving settings to localStorage:', e);
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
    resetButton.addEventListener('click', async function() {
      if (confirm('Are you sure you want to reset your progress? This will remove all discovered elements except the initial four.')) {
        console.log('Resetting game progress...');
        try {
          // Get IDs of initial elements (assuming they are 1, 2, 3, 4 based on previous steps)
          const initialElementIds = [1, 2, 3, 4]; // Water, Fire, Earth, Air

          // Delete from player_inventory where element_id is NOT in the initial set
          const { error: deleteError } = await supabase
            .from('player_inventory')
            .delete()
            .not('element_id', 'in', `(${initialElementIds.join(',')})`);

          if (deleteError) throw deleteError;

          console.log('Player inventory reset in Supabase.');

          // Reload data from Supabase to reflect the reset state
          await loadDataFromSupabase();

          // Reset UI
          selectedElements = [];
          resetCombinationZone();
          renderElements();
          renderCategories();
          searchBar.value = ''; // Clear search bar

          alert('Game reset successfully!');

        } catch (error) {
          console.error('Error resetting game:', error);
          alert(`Failed to reset game: ${error.message}`);
        }
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

    // Add drag and drop functionality
    setupDragAndDrop();
  }

  // Setup drag and drop functionality
  function setupDragAndDrop() {
    // Make elements in the sidebar draggable
    const makeElementsDraggable = () => {
      document.querySelectorAll('#elements-list .element').forEach(element => {
        element.setAttribute('draggable', 'true');
        
        element.addEventListener('dragstart', function(e) {
          e.dataTransfer.setData('text/plain', this.dataset.id);
          e.dataTransfer.setData('source', 'sidebar');
          e.dataTransfer.effectAllowed = 'copy';
          this.classList.add('dragging');
          
          // Store reference to current dragged element
          currentDraggedElement = this;
          currentDraggedElementData = {
            id: this.dataset.id,
            source: 'sidebar'
          };
        });
        
        element.addEventListener('dragend', function() {
          this.classList.remove('dragging');
          // Remove drop-target class from all elements
          document.querySelectorAll('.drop-target').forEach(el => {
            el.classList.remove('drop-target');
          });
          
          // Reset current dragged element
          currentDraggedElement = null;
          currentDraggedElementData = null;
        });
      });
    };
    
    // Make playground a valid drop target
    combinationZone.addEventListener('dragover', function(e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    });
    
    // Handle element drops into the playground
    combinationZone.addEventListener('drop', function(e) {
      e.preventDefault();
      
      if (!currentDraggedElementData) return;
      
      const elementId = currentDraggedElementData.id;
      const source = currentDraggedElementData.source;
      
      // Get position relative to playground
      const rect = combinationZone.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Check if we dropped onto another element
      const targetElement = document.elementFromPoint(e.clientX, e.clientY);
      const playgroundElement = targetElement.closest('#playground .element');
      
      if (playgroundElement && source === 'playground') {
        // We dropped onto another playground element - combine them
        const sourcePlaygroundId = elementId;
        const sourceElement = document.getElementById(sourcePlaygroundId);
        
        if (sourceElement && sourceElement !== playgroundElement) {
          // Get element data for both elements
          const element1Id = sourceElement.dataset.elementId;
          const element2Id = playgroundElement.dataset.elementId;
          
          const element1 = discoveredElements.find(el => el.id === element1Id);
          const element2 = discoveredElements.find(el => el.id === element2Id);
          
          if (element1 && element2) {
            // Add combining animation class
            playgroundElement.classList.add('combining');
            
            // Calculate the midpoint between the two elements for the result
            const sourceRect = sourceElement.getBoundingClientRect();
            const targetRect = playgroundElement.getBoundingClientRect();
            
            const midX = (sourceRect.left + targetRect.left + sourceRect.width/2 + targetRect.width/2)/2 - rect.left;
            const midY = (sourceRect.top + targetRect.top + sourceRect.height/2 + targetRect.height/2)/2 - rect.top;
            
            // Store the midpoint position for later use
            playgroundElement.dataset.resultX = midX;
            playgroundElement.dataset.resultY = midY;
            
            // Clear selections and set the two elements as selected
            selectedElements = [element1, element2];
            
            // Process the combination with a slight delay
            setTimeout(() => {
              processCombination();
              
              // Remove the source element (will remove target in handleCombinationResult)
              sourceElement.remove();
            }, 300);
          }
        }
      } else if (source === 'sidebar') {
        // Create a new element in the playground
        const originalElement = discoveredElements.find(element => element.id === elementId);
        if (originalElement) {
          addElementToPlayground(originalElement, x, y);
        }
      } else if (source === 'playground') {
        // Move an existing playground element
        const sourceElement = document.getElementById(elementId);
        if (sourceElement) {
          sourceElement.style.left = (x - 40) + 'px'; // Center the element
          sourceElement.style.top = (y - 20) + 'px';
        }
      }
      
      // Reset current dragged element
      currentDraggedElement = null;
      currentDraggedElementData = null;
    });
    
    // Call this when elements are rendered
    makeElementsDraggable();
    
    // Override the renderElements function to make new elements draggable
    const originalRenderElements = renderElements;
    renderElements = function(searchTerm = '') {
      originalRenderElements(searchTerm);
      makeElementsDraggable();
    };
  }
  
  // Add an element to the playground
  function addElementToPlayground(element, x, y) {
    const uniqueId = 'playground-element-' + nextElementId++;
    
    // Create the element div
    const elementDiv = document.createElement('div');
    elementDiv.className = 'element';
    elementDiv.id = uniqueId;
    elementDiv.dataset.elementId = element.id;
    elementDiv.innerHTML = `<span class="element-icon">${element.icon}</span> ${element.name}`;
    elementDiv.style.position = 'absolute';
    elementDiv.style.left = (x - 40) + 'px'; // Center the element
    elementDiv.style.top = (y - 20) + 'px';
    
    // Make the playground element draggable
    elementDiv.setAttribute('draggable', 'true');
    
    elementDiv.addEventListener('dragstart', function(e) {
      e.dataTransfer.setData('text/plain', this.id);
      e.dataTransfer.setData('source', 'playground');
      e.dataTransfer.setData('elementId', this.dataset.elementId);
      this.classList.add('dragging');
      
      // Store reference to current dragged element
      currentDraggedElement = this;
      currentDraggedElementData = {
        id: this.id,
        source: 'playground',
        elementId: this.dataset.elementId
      };
    });
    
    elementDiv.addEventListener('dragend', function() {
      this.classList.remove('dragging');
      // Remove drop-target class from all elements
      document.querySelectorAll('.drop-target').forEach(el => {
        el.classList.remove('drop-target');
      });
      
      // Reset current dragged element
      currentDraggedElement = null;
      currentDraggedElementData = null;
    });
    
    // Handle combining elements when one is dropped on another
    elementDiv.addEventListener('dragover', function(e) {
      e.preventDefault();
      
      // Only highlight as drop target if it's a different element
      if (currentDraggedElement && currentDraggedElement !== this) {
        this.classList.add('drop-target');
        e.dataTransfer.dropEffect = 'move';
      }
    });
    
    elementDiv.addEventListener('dragleave', function() {
      this.classList.remove('drop-target');
    });
    
    // Add the element to the playground
    combinationZone.appendChild(elementDiv);
    playgroundElements.push({ id: uniqueId, elementId: element.id });
  }
  
  // Handle element click - modified to work alongside drag and drop
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
    // Use numeric IDs from the database
    const sortedElements = [...selectedElements].sort((a, b) => a.id - b.id);
    const element1 = sortedElements[0];
    const element2 = sortedElements[1];

    // Create a unique key using database IDs
    const combinationKey = `${element1.id}+${element2.id}`; // e.g., "1+3"

    console.log('Looking up combination in Supabase cache:', combinationKey);
    console.log('Available combinations cache:', combinationCache);

    // Check if we already have this combination result ID in the Supabase cache
    if (combinationCache[combinationKey]) {
      const resultElementId = combinationCache[combinationKey];
      console.log(`Found cached combination result ID: ${resultElementId}`);
      const resultElement = allElements[resultElementId];
      if (resultElement) {
        console.log('Handling cached result:', resultElement);
        await handleCombinationResult(resultElement, element1.id, element2.id); // Pass original element IDs
      } else {
        console.error(`Result element with ID ${resultElementId} not found in allElements cache.`);
        resultZone.innerHTML = `<p>Error: Cached result element not found.</p>`;
        setTimeout(resetCombinationZone, 3000);
      }
      return;
    }

    console.log('Combination not found in cache. Proceeding to generate.');

    // API generation is required - check status first (keep existing API logic for now)
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
      // Generate combination with AI (keep existing call structure)
      // IMPORTANT: The generateCombination function and the API endpoint
      // MUST be updated to work with and return database IDs.
      // For now, assume 'result' contains the new element data *including* its database ID.
      const result = await generateCombination([element1, element2]); // Assume result includes { id: new_db_id, name, icon, ... }

      // Store the new combination mapping in Supabase *and* local cache
      try {
        const { data: insertData, error: insertError } = await supabase
          .from('combinations')
          .insert({
            element1_id: element1.id,
            element2_id: element2.id,
            result_element_id: result.id // Assumes result has the DB ID
          })
          .select(); // Select to confirm insertion

        if (insertError) {
          // Handle potential unique constraint violation (combination already exists)
          if (insertError.code === '23505') { // Unique violation code for PostgreSQL
             console.warn(`Combination ${element1.id}+${element2.id} already exists in DB, but wasn't in cache. Reloading cache.`);
             // Fetch the existing combination instead of erroring
             const { data: existingCombo, error: fetchError } = await supabase
               .from('combinations')
               .select('result_element_id')
               .eq('element1_id', element1.id)
               .eq('element2_id', element2.id)
               .single();

             if (fetchError || !existingCombo) {
               console.error("Failed to fetch existing combination after unique constraint error:", fetchError);
               throw new Error("Combination exists but couldn't fetch it.");
             }
             result.id = existingCombo.result_element_id; // Use the correct existing ID
          } else {
            throw insertError; // Re-throw other errors
          }
        } else {
          console.log('New combination saved to Supabase:', insertData);
        }

        // Update local cache
        combinationCache[combinationKey] = result.id;
        console.log('Updated local combination cache:', combinationCache);

        // Add the newly created element to the allElements cache if it's truly new
        if (!allElements[result.id]) {
            allElements[result.id] = result; // Add the full element object
            console.log('Added new element to allElements cache:', result);
        }


        // Process the result (which now includes the DB ID)
        await handleCombinationResult(result, element1.id, element2.id);

      } catch (dbError) {
         console.error('Error saving combination to Supabase:', dbError);
         resultZone.innerHTML = `<p>Error saving combination: ${dbError.message}</p>`;
         setTimeout(resetCombinationZone, 4000);
         return; // Stop processing if DB save fails
      }

    } catch (error) { // Catch errors from generateCombination (API call)
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

  // Handle the result of a combination (now async)
  async function handleCombinationResult(resultElement, inputElement1Id, inputElement2Id) {
    console.log("Handling combination result:", resultElement);

    // Check if this element is already in the player's discovered list
    const isNewDiscovery = !discoveredElements.some(e => e.id === resultElement.id);

    if (isNewDiscovery) {
      console.log("New discovery:", resultElement.name);
      // Add to discovered elements locally first for immediate UI update
      discoveredElements.push(resultElement);

      // Save the new discovery to player_inventory in Supabase
      try {
        const { error } = await supabase
          .from('player_inventory')
          .insert({ element_id: resultElement.id });

        // Handle potential unique constraint violation gracefully (already discovered)
        if (error && error.code !== '23505') { // 23505 is unique_violation
          throw error;
        } else if (error && error.code === '23505') {
           console.warn(`Element ${resultElement.id} already exists in player_inventory.`);
        } else {
           console.log(`Element ${resultElement.id} (${resultElement.name}) saved to player inventory.`);
        }

      } catch (error) {
        console.error('Error saving new discovery to Supabase:', error);
        // Optionally revert local addition or notify user
        discoveredElements = discoveredElements.filter(el => el.id !== resultElement.id); // Revert local add
        alert(`Failed to save discovery ${resultElement.name}: ${error.message}`);
        // Don't proceed with UI updates if save failed
        resetCombinationZone(); // Reset UI
        return;
      }

      // Update the elements panel and categories only after successful save
      renderElements();
      renderCategories(); // Update categories if the new element has a new one
    }

    // Show result in the result zone
    resultZone.innerHTML = `
      <div class="element">
        <span class="element-icon">${resultElement.icon || '❓'}</span> ${resultElement.name}
        ${isNewDiscovery ? ' <span style="color: #4ecdc4;">(New Discovery!)</span>' : ''}
      </div>
      ${resultElement.description ? `<p class="description">${resultElement.description}</p>` : ''}
    `;

    // Add the result element to the playground visually
    setTimeout(() => {
      const targetElement = document.querySelector('#playground .combining'); // The element that was dropped onto
      if (targetElement) {
        let x, y;
        if (targetElement.dataset.resultX && targetElement.dataset.resultY) {
          x = parseFloat(targetElement.dataset.resultX);
          y = parseFloat(targetElement.dataset.resultY);
        } else {
          const rect = targetElement.getBoundingClientRect();
          const playgroundRect = combinationZone.getBoundingClientRect();
          x = (rect.left + rect.width / 2) - playgroundRect.left;
          y = (rect.top + rect.height / 2) - playgroundRect.top;
        }
        targetElement.remove(); // Remove the element that was dropped onto

        addElementToPlayground(resultElement, x, y); // Add the new element

        // Flash effect
        setTimeout(() => {
          // Find the newly added element using its database ID
          const newElementDiv = document.querySelector(`#playground [data-element-id="${resultElement.id}"]`);
          if (newElementDiv) {
            newElementDiv.classList.add('combining'); // Re-use combining class for flash
            setTimeout(() => {
              newElementDiv.classList.remove('combining');
            }, 700);
          }
        }, 100);

      } else {
        console.warn("Could not find '.combining' element to position result.");
        // Fallback: Add to center
        const playgroundRect = combinationZone.getBoundingClientRect();
        addElementToPlayground(resultElement, playgroundRect.width / 2, playgroundRect.height / 2);
      }

      // Reset selected elements array
      selectedElements = [];
    }, 700); // Delay to allow combination animation/display
  }


  // Generate a combination using AI (Placeholder - needs API update)
  // IMPORTANT: This function and the API it calls (/api/generate-combination)
  // need to be updated to handle database IDs.
  // It should check Supabase 'combinations' table first.
  // If not found, call AI. AI response must include the new element's
  // database ID if it creates one, or the existing ID if it finds one.
  async function generateCombination(elements) {
      // Assume elements are full objects with DB IDs [{id: 1, name: 'Water', ...}, {id: 3, name: 'Earth', ...}]
      console.log('Attempting AI generation for elements (IDs):', elements.map(el => el.id));

      // --- Database Check (Should ideally be here or in the API) ---
      // const sortedIds = elements.map(el => el.id).sort((a, b) => a - b);
      // const comboKey = sortedIds.join('+');
      // if (combinationCache[comboKey]) { /* Already handled in processCombination */ }
      // else { /* Query Supabase combinations table */ }
      // --- End Database Check ---


      const apiUrl = determineApiEndpoint();
      try {
          console.log('Sending API request to:', apiUrl);
          const elementData = elements.map(el => ({ id: el.id, name: el.name, category: el.category })); // Send IDs

          const response = await fetch(apiUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ elements: elementData, isTest: false }),
          });

          console.log('API response status:', response.status);
          if (!response.ok) { /* ... existing error handling ... */
              let errorMessage = `API error: ${response.status}`;
              try {
                  const errorData = await response.json();
                  errorMessage = errorData.message || errorMessage;
              } catch {
                  const textResponse = await response.text();
                  if (textResponse.includes('<')) errorMessage = 'API returned HTML. Endpoint might be wrong.';
              }
              updateApiStatus('unavailable'); // Use the helper function
              saveSettings(); // Save updated settings
              throw new Error(errorMessage);
          }

          const contentType = response.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
              throw new Error('API returned incorrect content type.');
          }

          const result = await response.json(); // **ASSUME result includes DB ID, e.g., { id: 15, name: 'Steam', ... }**
          console.log('API response data:', result);

          // Basic validation (ensure ID is present)
          if (!result || !result.id || !result.name) {
              console.error('Invalid API response format (missing id or name):', result);
              throw new Error('Invalid response from API (missing id or name)');
          }

          updateApiStatus('available'); // Use the helper function
          saveSettings(); // Save updated settings

          // **No need to update combinationCache here - it's done in processCombination after DB insert**
          // **No need to saveToLocalStorage here**

          return result; // Return the full result object (including DB ID)
      } catch (error) {
          console.error('Error in generateCombination:', error);
          updateApiStatus('unavailable'); // Ensure status is updated on error
          saveSettings();
          throw error; // Re-throw error to be caught by processCombination
      }
  }


  // Reset the combination zone visually
  function resetCombinationZone() {
    playgroundElements = []; // Clear tracking array
    combinationZone.innerHTML = ''; // Clear visual elements
    selectedElements = []; // Clear selection
    resultZone.innerHTML = '<p>Drag elements to the playground and combine them</p>'; // Reset result message
  }

  // REMOVED saveToLocalStorage function - data is saved directly to Supabase

  // Update the combination area visually
  function updateCombinationArea() {
    // Reset the combination zone
    resetCombinationZone();
    // Make sure the result zone shows the default message
    resultZone.innerHTML = '<p>Drag elements to the playground and combine them</p>';
  }
  
  // Initialize the game
  initGame();
});
