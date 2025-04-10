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
  const headerSettingsToggle = document.getElementById('header-settings-toggle'); // New header button
  const closeButton = document.getElementById('close-settings');
  const testApiButton = document.getElementById('test-api-button');
  const apiStatus = document.getElementById('api-status');
  const apiMessage = document.getElementById('api-message');
  const historyItemsContainer = document.getElementById('history-items'); // History log container

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
    console.log('Event listeners set up.'); // LOG ADDED

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
    // Toggle settings panel visibility using the header button
    headerSettingsToggle.addEventListener('click', function() {
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
    apiMessage.innerHTML = '<p>Testing API connection...</p>'; // Simplified message

    const apiUrl = determineApiEndpoint();

    console.log('Testing API connection to:', apiUrl);

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // elements: ['Test Element 1', 'Test Element 2'], // Not needed for new test endpoint
          isTest: true
        }),
      });

      console.log('API test response status:', response.status);
      const data = await response.json(); // Assume JSON response even for errors now
      console.log('API test response data:', data);

      if (response.ok && data.result === true) {
        // Update API status
        updateApiStatus('available'); // Use helper function

        apiStatusElement.textContent = 'Connected';
        apiStatusElement.className = 'status connected';
        headerSettingsToggle.textContent = '⚙️ API Connected'; // Update header button

        // Show the test results
        apiMessage.innerHTML = `
          <p>API Connection Test Successful!</p>
          <div class="ai-test-response">
            <p><strong>Details:</strong></p>
            <p>OpenAI: ${data.details?.openai?.ok ? '✅ OK' : '❌ FAIL'} (${data.details?.openai?.message || ''})</p>
            <p>Supabase: ${data.details?.supabase?.ok ? '✅ OK' : '❌ FAIL'} (${data.details?.supabase?.message || ''})</p>
          </div>
        `;
      } else {
        // Handle errors reported by the test endpoint or fetch errors
        updateApiStatus('unavailable'); // Use helper function

        apiStatusElement.textContent = 'Error';
        apiStatusElement.className = 'status error';
        headerSettingsToggle.textContent = '⚠️ API Error'; // Update header button

        let errorDetails = 'Unknown error during test.';
        if (data.details) {
            errorDetails = `OpenAI: ${data.details.openai?.message || 'N/A'}, Supabase: ${data.details.supabase?.message || 'N/A'}`;
        } else if (data.message) {
            errorDetails = data.message;
        }

        apiMessage.innerHTML = `
          <p>API Connection Test Failed (${response.status}).</p>
          <p class="error-message">${data.description || 'Could not connect or verify services.'}</p>
          <p>Details: ${errorDetails}</p>
          <p>Check console and Vercel environment variables.</p>
        `;
      }
    } catch (error) {
      console.error('API test fetch error:', error);
      updateApiStatus('unavailable'); // Use helper function

      apiStatusElement.textContent = 'Disconnected';
      apiStatusElement.className = 'status disconnected';
      headerSettingsToggle.textContent = '🔌 API Disconnected'; // Update header button

      let errorMessage = error.message;
      if (errorMessage.includes("Unexpected token '<'")) {
        errorMessage = "Received HTML instead of JSON. API endpoint may not exist or is misconfigured.";
      }

      apiMessage.innerHTML = `
        <p>Could not reach the API server.</p>
        <p class="error-message">${errorMessage}</p>
        <p>Please check the API endpoint and server logs.</p>
      `;
    }
  }

  // Update the API status and save it
  function updateApiStatus(status) {
    appSettings.apiStatus = status;
    saveSettings(); // Save non-persistent settings
    // updateApiStatusDisplay(); // Visual update handled within testApiConnection now
  }

  // Update the visual display of the API status (kept for potential future use)
  function updateApiStatusDisplay() {
    const statusCircle = document.querySelector('#api-status .status-circle'); // More specific selector
    if (!statusCircle) return; // Guard clause

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

    // Update the text (ensure apiStatus element exists)
    if (apiStatus) {
        apiStatus.innerHTML = `<span class="status-circle ${statusClass}"></span>${statusText}`;
    }
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
    // For localhost development (assuming port 3000 for API server via `vercel dev`)
    else if (hostname === 'localhost' || hostname === '127.0.0.1') {
       basePath = '/api'; // `vercel dev` proxies /api requests
    }
    // Fallback for other static hosting (might not work for API)
    else {
      basePath = '/api'; // Fallback to relative path
    }

    console.log('API base path:', basePath);
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
      button.dataset.category = category;

      // Calculate count for this category
      let count;
      if (category === 'all') {
        count = discoveredElements.length;
      } else {
        count = discoveredElements.filter(el => el.category === category).length;
      }

      button.textContent = `${category.charAt(0).toUpperCase() + category.slice(1)} (${count})`;
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
    console.log(`Rendering elements (Search: "${searchTerm}", Category: "${activeCategory}")`); // LOG ADDED
    elementsList.innerHTML = '';

    // Filter elements by search term and category
    const filteredElements = discoveredElements.filter(element => {
      // Ensure element and element.name are defined before calling toLowerCase
      const nameMatch = element && element.name && element.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSearch = searchTerm === '' || nameMatch;
      const matchesCategory = activeCategory === 'all' ||
        (element && element.category === activeCategory);
      return matchesSearch && matchesCategory;
    });


    // Debug output
    console.log('Filtered elements count:', filteredElements.length); // LOG ADDED

    // Group elements by category if 'all' is selected or search is active without specific category
    const shouldGroup = activeCategory === 'all' || searchTerm !== '';
    let groupedElements = {};
    if (shouldGroup) {
      groupedElements = filteredElements.reduce((acc, el) => {
        const category = el.category || 'Uncategorized'; // Group elements without a category
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(el);
        return acc;
      }, {});
      // Sort categories alphabetically, maybe put 'Uncategorized' last
      const sortedCategories = Object.keys(groupedElements).sort((a, b) => {
        if (a === 'Uncategorized') return 1;
        if (b === 'Uncategorized') return -1;
        return a.localeCompare(b);
      });

      // Render grouped elements
      sortedCategories.forEach(category => {
        const header = document.createElement('div');
        header.className = 'category-header';
        header.textContent = category;
        elementsList.appendChild(header);

        groupedElements[category].forEach(element => {
          if (!element) {
            console.warn("Skipping undefined element during grouped render");
            return;
          }
          const elementDiv = createElementDiv(element);
          elementsList.appendChild(elementDiv);
        });
      });

    } else {
      // Render filtered elements directly if a specific category is selected
      filteredElements.forEach(element => {
        if (!element) {
            console.warn("Skipping undefined element during single category render");
            return;
          }
          const elementDiv = createElementDiv(element);
          elementsList.appendChild(elementDiv);
        });
    }


    // If no elements are shown, make sure we show a message
    if (filteredElements.length === 0) {
      const noElementsMsg = document.createElement('p');
      noElementsMsg.textContent = 'No elements match your filter.';
      noElementsMsg.className = 'no-elements-message';
      elementsList.appendChild(noElementsMsg);
    }
    console.log('Finished rendering elements.'); // LOG ADDED
  }

  // Create an element div
  function createElementDiv(element) {
    const div = document.createElement('div');
    div.className = 'element';
    div.dataset.id = element.id; // Use database ID

    // Check if the element is discovered (present in the discoveredElements array)
    const isDiscovered = discoveredElements.some(discovered => discovered.id === element.id);
    if (isDiscovered) {
      div.classList.add('discovered');
    }

    // Use icon from element data, provide fallback
    const iconSpan = `<span class="element-icon">${element.icon || '❓'}</span>`;

    // Highlight search term if active
    const currentSearchTerm = searchBar.value.trim();
    let elementNameHTML = element.name;
    if (currentSearchTerm !== '') {
      const regex = new RegExp(`(${currentSearchTerm.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi'); // Escape regex chars, case-insensitive
      elementNameHTML = element.name.replace(regex, `<span class="search-highlight">$1</span>`);
    }

    div.innerHTML = `${iconSpan} ${elementNameHTML}`;


    // Add tooltip (title attribute)
    let tooltipText = `Category: ${element.category || 'Unknown'}`;
    if (element.description) {
      // Add first ~100 chars of description
      tooltipText += `\nDescription: ${element.description.substring(0, 100)}${element.description.length > 100 ? '...' : ''}`;
    }
    div.setAttribute('title', tooltipText);

    div.setAttribute('draggable', 'true'); // Ensure this is set
    console.log(`Element div created for ${element.name}, draggable set:`, div.getAttribute('draggable')); // LOG ADDED
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

  // Named handler for sidebar drag start
  function handleSidebarDragStart(e) {
      console.log('--- Sidebar Drag Start Event Fired ---'); // AGGRESSIVE LOG
      const element = e.target.closest('.element');
      if (!element) {
          console.log('DragStart ignored: Not on an element.');
          return;
      }
      const elementId = element.dataset.id;
      if (!elementId) {
          console.log('DragStart ignored: Element missing ID.');
          return;
      }
      console.log(`DragStart: Element ID ${elementId}`);
      try {
        e.dataTransfer.setData('text/plain', elementId);
        e.dataTransfer.setData('source', 'sidebar');
        e.dataTransfer.effectAllowed = 'copy';
        // Add the new class to the original element in the list
        element.classList.add('element-source-dragging');
        currentDraggedElementData = { id: elementId, source: 'sidebar' };
        console.log('Drag Start Data Set:', currentDraggedElementData);
      } catch (err) {
        console.error("Error in dragstart:", err); // Log potential errors setting data
      }
  }
  // Named handler for sidebar drag end
  function handleSidebarDragEnd(e) {
      console.log('--- Sidebar Drag End Event Fired ---'); // AGGRESSIVE LOG
      const element = e.target.closest('.element');
      if (element) {
          // Remove the source dragging class from the original element
          element.classList.remove('element-source-dragging');
      }
      document.querySelectorAll('#playground .drop-target').forEach(el => {
          el.classList.remove('drop-target');
      });
      // Reset data only if it matches the element ending the drag
      if (currentDraggedElementData?.id === element?.dataset?.id && currentDraggedElementData?.source === 'sidebar') {
        currentDraggedElementData = null;
        console.log('Drag End Data Reset');
      }
  }

  // Setup drag and drop functionality
  function setupDragAndDrop() {
    // Make elements in the sidebar draggable using delegation
    const makeSidebarDraggable = () => {
      console.log("Setting up sidebar drag listeners on #elements-list"); // LOG ADDED
      elementsList.removeEventListener('dragstart', handleSidebarDragStart); // Remove previous listener if any
      elementsList.addEventListener('dragstart', handleSidebarDragStart); // Add named handler
      elementsList.removeEventListener('dragend', handleSidebarDragEnd);
      elementsList.addEventListener('dragend', handleSidebarDragEnd);
    };

    // Make playground a valid drop target
    console.log("Setting up playground drop listeners on #playground"); // LOG ADDED
    combinationZone.addEventListener('dragover', function(e) {
      e.preventDefault(); // Necessary to allow dropping
      // console.log('Drag Over Playground'); // Can be noisy, enable if needed
      // Set drop effect based on source
      if (currentDraggedElementData?.source === 'sidebar') {
          e.dataTransfer.dropEffect = 'copy';
      } else if (currentDraggedElementData?.source === 'playground') {
          e.dataTransfer.dropEffect = 'move';
      } else {
          e.dataTransfer.dropEffect = 'none';
      }
    });

    // Handle element drops into the playground
    combinationZone.addEventListener('drop', function(e) {
      e.preventDefault();
      console.log('--- Playground Drop Event Fired ---'); // AGGRESSIVE LOG

      // Remove dimming after drop (ensure this happens regardless of outcome)
      document.querySelectorAll('#playground .element.dimmed-non-target').forEach(el => {
        el.classList.remove('dimmed-non-target');
      });

      if (!currentDraggedElementData) {
          console.log('Drop ignored: No dragged element data.');
          return;
      }

      // Retrieve data set in dragstart
      const droppedElementId = e.dataTransfer.getData('text/plain');
      const source = e.dataTransfer.getData('source');
      const droppedDomId = e.dataTransfer.getData('domId'); // Only present for playground source

      // Verify data consistency
      if (droppedElementId !== currentDraggedElementData.id || source !== currentDraggedElementData.source) {
          console.error('Drop data mismatch!', { droppedElementId, source, droppedDomId }, currentDraggedElementData);
          // Don't reset currentDraggedElementData here, let dragend handle it
          return;
      }

      console.log('Dropped:', { droppedElementId, source, droppedDomId });

      // Get position relative to playground
      const rect = combinationZone.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Check if we dropped onto another element *within the playground*
      const targetElement = document.elementFromPoint(e.clientX, e.clientY);
      const playgroundElement = targetElement?.closest('#playground .element'); // Target must be in playground

      if (playgroundElement && source === 'playground') {
        // --- Combine elements already in the playground ---
        const sourcePlaygroundDOMId = currentDraggedElementData.domId; // Use DOM ID from drag data
        const sourceElement = document.getElementById(sourcePlaygroundDOMId);

        // Ensure we are not dropping onto itself and source element exists
        if (sourceElement && sourceElement !== playgroundElement) {
          const element1Id = parseInt(sourceElement.dataset.elementId, 10); // Get DB ID
          const element2Id = parseInt(playgroundElement.dataset.elementId, 10); // Get DB ID

          console.log(`Attempting combination in playground: ${element1Id} + ${element2Id}`);

          const element1 = allElements[element1Id]; // Use allElements cache
          const element2 = allElements[element2Id];

          if (element1 && element2) {
            // playgroundElement.classList.add('combining'); // OLD - Replaced with merging animation

            // Calculate midpoint for animation target and result placement
            const sourceRect = sourceElement.getBoundingClientRect();
            const targetRect = playgroundElement.getBoundingClientRect();
            const midX = (sourceRect.left + targetRect.left + sourceRect.width / 2 + targetRect.width / 2) / 2 - rect.left;
            const midY = (sourceRect.top + targetRect.top + sourceRect.height / 2 + targetRect.height / 2) / 2 - rect.top;

            // Calculate translation vectors for animation
            const sourceCurrentX = sourceRect.left + sourceRect.width / 2 - rect.left;
            const sourceCurrentY = sourceRect.top + sourceRect.height / 2 - rect.top;
            const targetCurrentX = targetRect.left + targetRect.width / 2 - rect.left;
            const targetCurrentY = targetRect.top + targetRect.height / 2 - rect.top;

            const sourceTx = midX - sourceCurrentX;
            const sourceTy = midY - sourceCurrentY;
            const targetTx = midX - targetCurrentX;
            const targetTy = midY - targetCurrentY;

            // Apply animation class and CSS variables
            sourceElement.style.setProperty('--tx', `${sourceTx}px`);
            sourceElement.style.setProperty('--ty', `${sourceTy}px`);
            sourceElement.classList.add('merging');

            playgroundElement.style.setProperty('--tx', `${targetTx}px`);
            playgroundElement.style.setProperty('--ty', `${targetTy}px`);
            playgroundElement.classList.add('merging'); // Apply to target as well

            // Store position on the target element for handleCombinationResult (still useful)
            playgroundElement.dataset.resultX = midX;
            playgroundElement.dataset.resultY = midY;

            selectedElements = [element1, element2]; // Set for processing

            // Process combination after animation completes (500ms) + small buffer
            setTimeout(() => {
              processCombination(); // API call / result handling
              // Elements are hidden by animation 'forwards', remove them from DOM after processing
              sourceElement.remove();
              playgroundElement.remove(); // Remove target element here now
            }, 550); // Wait for animation to finish
          } else {
             console.error("Could not find element data for combination:", element1Id, element2Id);
          }
        } else {
            console.log("Drop onto self or source element not found, ignoring combination.");
        }
      } else if (source === 'sidebar') {
        // --- Add element from sidebar to playground ---
        console.log(`Adding element ${droppedElementId} from sidebar to playground at (${x}, ${y})`);
        const elementData = allElements[droppedElementId]; // Get full data from cache
        if (elementData) {
          addElementToPlayground(elementData, x, y);
        } else {
           console.error(`Element data not found for ID ${droppedElementId} from sidebar.`);
        }
      } else if (source === 'playground') {
        // --- Move element within the playground ---
        const sourcePlaygroundDOMId = currentDraggedElementData.domId; // Use DOM ID from drag data
        const sourceElement = document.getElementById(sourcePlaygroundDOMId);
        if (sourceElement) {
          console.log(`Moving playground element ${sourcePlaygroundDOMId} to (${x}, ${y})`);
          // Adjust position based on element size (assuming approx 80x40)
          sourceElement.style.left = (x - 40) + 'px';
          sourceElement.style.top = (y - 20) + 'px';
        } else {
           console.error(`Playground element ${sourcePlaygroundDOMId} not found for move.`);
        }
      }

      // Reset dragged data in dragend, not here, to avoid race conditions
      // currentDraggedElementData = null;
      console.log('Drop handled.');
    });

    // Initial call to set up sidebar listeners
    makeSidebarDraggable();

  }

  // Add an element to the playground
  function addElementToPlayground(element, x, y) {
    const uniqueDomId = 'playground-element-' + nextElementId++; // Unique ID for the DOM element in playground

    // Create the element div
    const elementDiv = document.createElement('div');
    elementDiv.className = 'element';
    elementDiv.id = uniqueDomId; // Use unique DOM ID
    elementDiv.dataset.elementId = element.id; // Store the actual DB element ID
    elementDiv.innerHTML = `<span class="element-icon">${element.icon || '❓'}</span> ${element.name}`;
    elementDiv.style.position = 'absolute';
    // Adjust position based on element size (assuming approx 80x40)
    elementDiv.style.left = (x - 40) + 'px';
    elementDiv.style.top = (y - 20) + 'px';

    // Make the playground element draggable
    elementDiv.setAttribute('draggable', 'true');

    // Add drag listeners directly to elements created in the playground
     elementDiv.addEventListener('dragstart', function(e) {
         console.log('--- Playground Drag Start Event Fired ---'); // AGGRESSIVE LOG
         // Prevent dragging if already combining
         if (this.classList.contains('combining')) {
             e.preventDefault();
             return;
         }
         const elementId = this.dataset.elementId;
         if (!elementId) {
             console.log('Playground DragStart ignored: Element missing ID.');
             return;
         }
         console.log(`Playground DragStart: Element ID ${elementId}, DOM ID ${this.id}`);
         try {
           e.dataTransfer.setData('text/plain', elementId); // DB ID
           e.dataTransfer.setData('source', 'playground');
           e.dataTransfer.setData('domId', this.id); // Include DOM ID for playground elements
           e.dataTransfer.effectAllowed = 'move';
           this.classList.add('dragging');

           // Dim other playground elements
           document.querySelectorAll('#playground .element').forEach(el => {
             if (el !== this) { // Don't dim the element being dragged
               el.classList.add('dimmed-non-target');
             }
           });

           currentDraggedElementData = {
             id: elementId, // DB ID
             source: 'playground',
             domId: this.id // DOM ID
           };
           console.log('Playground Drag Start Data Set:', currentDraggedElementData);
         } catch (err) {
            console.error("Error in playground dragstart:", err);
         }
     });

     elementDiv.addEventListener('dragend', function(e) {
         console.log('--- Playground Drag End Event Fired ---'); // AGGRESSIVE LOG
         this.classList.remove('dragging');
         // Remove drop-target class from other playground elements
         document.querySelectorAll('#playground .drop-target').forEach(el => {
             el.classList.remove('drop-target');
         });
         // Remove dimming from all playground elements on drag end
         document.querySelectorAll('#playground .element.dimmed-non-target').forEach(el => {
           el.classList.remove('dimmed-non-target');
         });
         // Reset data only if it matches the element ending the drag
         if (currentDraggedElementData?.domId === this.id) {
             currentDraggedElementData = null;
             console.log('Playground Drag End Data Reset');
         }
     });

     // Add listeners for being a drop target
     elementDiv.addEventListener('dragover', function(e) {
         e.preventDefault(); // Allow drop
         // Highlight only if a *different* playground element is dragged over
         if (currentDraggedElementData?.source === 'playground' && currentDraggedElementData?.domId !== this.id) {
             this.classList.add('drop-target');
             e.dataTransfer.dropEffect = 'move'; // Indicate combination is possible
         } else {
             e.dataTransfer.dropEffect = 'none'; // Don't allow dropping sidebar elements onto playground elements directly
         }
     });

     elementDiv.addEventListener('dragleave', function(e) {
         this.classList.remove('drop-target');
     });

    // Add the element to the playground visually
    combinationZone.appendChild(elementDiv);
    console.log(`Added element ${element.id} (${element.name}) to playground with DOM ID ${uniqueDomId}`);
  }

  // REMOVED handleElementClick function

  // Process the combination of selected elements
  async function processCombination() {
    // Ensure exactly two elements are selected
    if (selectedElements.length !== 2) {
        console.warn("ProcessCombination called with incorrect number of selected elements:", selectedElements.length);
        resetCombinationZone(); // Or just clear selection
        return;
    }

    // Use numeric IDs from the database
    const sortedElements = [...selectedElements].sort((a, b) => a.id - b.id);
    const element1 = sortedElements[0];
    const element2 = sortedElements[1];

    // Create a unique key using database IDs
    const combinationKey = `${element1.id}+${element2.id}`; // e.g., "1+3"

    console.log('Looking up combination in local cache:', combinationKey);
    console.log('Available combinations cache:', combinationCache);

    // Check if we already have this combination result ID in the local cache
    if (combinationCache[combinationKey]) {
      const resultElementId = combinationCache[combinationKey];
      console.log(`Found cached combination result ID: ${resultElementId}`);
      const resultElement = allElements[resultElementId]; // Get full data from allElements
      if (resultElement) {
        console.log('Handling cached result:', resultElement);
        await handleCombinationResult(resultElement, element1.id, element2.id); // Pass original element IDs
      } else {
        console.error(`Result element with ID ${resultElementId} not found in allElements cache.`);
        resultZone.innerHTML = `<p>Error: Cached result element data missing.</p>`;
        setTimeout(resetCombinationZone, 3000);
      }
      return; // Stop processing if cached
    }

    console.log('Combination not found in local cache. Calling API.');

    // API generation is required - check status first
    if (appSettings.apiStatus === 'unavailable') {
      resultZone.innerHTML = `
        <div class="element">
          <span class="element-icon">❌</span> API Unavailable
        </div>
        <p class="description">The combination API is not available. Please check connection in settings.</p>
      `;
      // Apply shake animation
      resultZone.classList.add('error-shake');
      setTimeout(() => {
        resultZone.classList.remove('error-shake');
        resetCombinationZone(); // Reset after shake + delay
      }, 4000); // Keep original delay, shake happens within it
      return;
    }

    // Show loading indicator
    resultZone.innerHTML = `<div class="loading"></div> Generating combination...`;

    try {
      // Call the backend API to generate/retrieve the combination
      const resultElement = await generateCombination([element1, element2]); // API now returns full element object

      // API handles DB checking/insertion. We just need to update local state if needed.

      // Update local combination cache ONLY if the API call was successful
      // The API checks/inserts into the DB combination table, so we trust its result ID
      combinationCache[combinationKey] = resultElement.id;
      console.log('Updated local combination cache with API result:', combinationCache);

      // Add the result element to the global 'allElements' cache if it's truly new
      // (though the API should handle element creation/retrieval)
      if (!allElements[resultElement.id]) {
          allElements[resultElement.id] = resultElement;
          console.log('Added new element to allElements cache from API result:', resultElement);
      }

      // Process the result (display, add to inventory if new)
      await handleCombinationResult(resultElement, element1.id, element2.id);

    } catch (error) { // Catch errors from generateCombination (API call)
      resultZone.innerHTML = `
        <p>Error generating combination: ${error.message}</p>
      `;
      console.error('Error during generateCombination call:', error);
      // Optionally update API status based on error type
      // updateApiStatus('unavailable');

      // Apply shake animation
      resultZone.classList.add('error-shake');
      setTimeout(() => {
        resultZone.classList.remove('error-shake');
        resetCombinationZone(); // Reset after shake + delay
      }, 4000); // Keep original delay
    }
  }

  // Handle the result of a combination (now async)
  // resultElement now includes isNewGlobalDiscovery from the API
  async function handleCombinationResult(resultElement, inputElement1Id, inputElement2Id) {
    console.log("Handling combination result:", resultElement);

    // Add to history log before checking local discovery
    addHistoryItem(allElements[inputElement1Id], allElements[inputElement2Id], resultElement);

    // Check if this element is already in the player's discovered list (local check)
    const isNewLocalDiscovery = !discoveredElements.some(e => e.id === resultElement.id);
    const isNewGlobalDiscovery = resultElement.isNewGlobalDiscovery; // Get flag from API response

    if (isNewLocalDiscovery) {
      console.log("New local discovery:", resultElement.name);
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
           console.warn(`Element ${resultElement.id} already exists in player_inventory (likely race condition or previous error).`);
        } else {
           console.log(`Element ${resultElement.id} (${resultElement.name}) saved to player inventory.`);
        }

      } catch (error) {
        console.error('Error saving new discovery to Supabase:', error);
        // Revert local addition and notify user
        discoveredElements = discoveredElements.filter(el => el.id !== resultElement.id);
        alert(`Failed to save discovery ${resultElement.name}: ${error.message}`);
        resetCombinationZone(); // Reset UI
        return; // Stop processing
      }

      // Update the elements panel and categories only after successful save/confirmation
      renderElements();
      renderCategories();
    }

    // Show result in the result zone, including the global discovery status and applying animation
    // Clear previous content first to ensure animation runs on new element
    resultZone.innerHTML = '';

    const resultDiv = document.createElement('div');
    resultDiv.className = 'element'; // This class now has the result-appear animation
    resultDiv.innerHTML = `
        <span class="element-icon">${resultElement.icon || '❓'}</span> ${resultElement.name}
        ${isNewGlobalDiscovery ? ' <span style="color: #ffd700; font-weight: bold;">(First Discovery!)</span>' : ''}
        ${!isNewGlobalDiscovery && isNewLocalDiscovery ? ' <span style="color: #4ecdc4;">(New Discovery!)</span>' : ''}
    `;
    resultZone.appendChild(resultDiv);

    // Add description below the element div
    if (resultElement.description) {
      const descriptionP = document.createElement('p');
      descriptionP.className = 'description';
      descriptionP.textContent = resultElement.description;
      resultZone.appendChild(descriptionP);
    }

    // Add the result element to the playground visually
    setTimeout(() => {
      // Find the element that was the drop target (it has the merging class and position data now)
      // Note: The target element is removed earlier in the drop handler after animation starts.
      // We need to use the stored position data.
      const storedResultX = playgroundElement?.dataset?.resultX; // Use optional chaining
      const storedResultY = playgroundElement?.dataset?.resultY;

      if (storedResultX && storedResultY) {
        let x = parseFloat(storedResultX);
        let y = parseFloat(storedResultY);

        addElementToPlayground(resultElement, x, y); // Add the new result element


        // Flash effect for the new element in the playground
        setTimeout(() => {
          // Find the newly added element in the playground
          const playgroundResultDiv = document.querySelector(`#playground [data-element-id="${resultElement.id}"]`);
          if (playgroundResultDiv) {
            playgroundResultDiv.classList.add('combining'); // Re-use pulse animation for flash
            setTimeout(() => {
              playgroundResultDiv.classList.remove('combining');
            }, 700);
          }
        }, 100); // Short delay after adding to playground

      } else {
        console.warn("Could not find '.combining' element to position result. Adding to center.");
        const playgroundRect = combinationZone.getBoundingClientRect();
        addElementToPlayground(resultElement, playgroundRect.width / 2, playgroundRect.height / 2);
      }

      // Reset selected elements array
      selectedElements = [];
    }, 700); // Delay matches combination animation/display time
  }


  // Generate a combination by calling the backend API
  async function generateCombination(elements) {
      // elements are full objects with DB IDs [{id: 1, ...}, {id: 3, ...}]
      console.log('Calling API to generate combination for elements (IDs):', elements.map(el => el.id));

      const apiUrl = determineApiEndpoint();
      try {
          // Send only necessary data (IDs are primary)
          const elementData = elements.map(el => ({ id: el.id, name: el.name, category: el.category }));

          const response = await fetch(apiUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ elements: elementData, isTest: false }),
          });

          console.log('API response status:', response.status);
          const result = await response.json(); // Attempt to parse JSON regardless of status

          if (!response.ok) {
              console.error('API Error Response:', result);
              let errorMessage = `API error ${response.status}: ${result.message || 'Unknown error'}`;
              updateApiStatus('unavailable');
              saveSettings();
              throw new Error(errorMessage);
          }

          console.log('API response data:', result);

          // Basic validation (API should return the full element object including ID)
          if (!result || !result.id || !result.name) {
              console.error('Invalid API response format:', result);
              throw new Error('Invalid response from API (missing id or name)');
          }

          updateApiStatus('available'); // Mark API as available on success
          saveSettings();

          return result; // Return the full result element object from API

      } catch (error) {
          console.error('Error in generateCombination fetch:', error);
          updateApiStatus('unavailable'); // Mark API as unavailable on fetch error
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

  // REMOVED saveToLocalStorage function

  // Update the combination area visually
  function updateCombinationArea() {
    // Reset the combination zone
    resetCombinationZone();
    // Make sure the result zone shows the default message
    resultZone.innerHTML = '<p>Drag elements to the playground and combine them</p>';
  }

  // Add an item to the history log
  function addHistoryItem(element1, element2, resultElement) {
    if (!element1 || !element2 || !resultElement) {
      console.warn("Skipping history item due to missing element data.");
      return;
    }

    const itemDiv = document.createElement('div');
    itemDiv.className = 'history-item';
    itemDiv.innerHTML = `
      <span class="icon">${element1.icon || '❓'}</span> ${element1.name} +
      <span class="icon">${element2.icon || '❓'}</span> ${element2.name}
      <span class="equals">=</span>
      <span class="icon">${resultElement.icon || '❓'}</span> ${resultElement.name}
    `;

    // Add to the top (since container is column-reverse)
    historyItemsContainer.appendChild(itemDiv);

    // Limit history items (e.g., keep last 10)
    const maxHistoryItems = 10;
    while (historyItemsContainer.children.length > maxHistoryItems) {
      historyItemsContainer.removeChild(historyItemsContainer.firstChild); // Remove the oldest (which is visually at the top)
    }
  }

  // Initialize the game
  initGame();
});
