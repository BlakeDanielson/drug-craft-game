/**
 * Drug Craft - Data Reset Script
 * 
 * This script clears all saved discoveries and combinations from localStorage
 * Run this script by adding it to your page temporarily and opening the browser console
 */

(function() {
  console.log('DrugCraft Data Reset Script');
  console.log('---------------------------');
  
  // List of localStorage keys used by the game
  const keysToRemove = [
    'drugCraftElements',
    'drugCraftCombinations',
    'drugCraftSettings'
  ];
  
  // Check if we have data to remove
  let dataFound = false;
  keysToRemove.forEach(key => {
    if (localStorage.getItem(key)) {
      dataFound = true;
      const data = localStorage.getItem(key);
      try {
        const parsedData = JSON.parse(data);
        const itemCount = parsedData && typeof parsedData === 'object' ? 
          (Array.isArray(parsedData) ? parsedData.length : Object.keys(parsedData).length) : 
          'unknown size';
        console.log(`Found data for ${key}: ${itemCount} items`);
      } catch (e) {
        console.log(`Found data for ${key} (unable to parse)`);
      }
    } else {
      console.log(`No data found for ${key}`);
    }
  });
  
  if (!dataFound) {
    console.log('No Drug Craft data found in localStorage.');
    console.log('Either you haven\'t played the game yet or data has already been cleared.');
    return;
  }
  
  // Confirm before deletion
  if (confirm('Are you sure you want to reset all Drug Craft discoveries and combinations? This cannot be undone.')) {
    // Remove each key
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.log(`Removed ${key} from localStorage`);
    });
    
    console.log('Reset complete! All Drug Craft data has been cleared.');
    console.log('Refresh the page to start with fresh discoveries.');
    
    // Offer to reload the page
    if (confirm('Would you like to reload the page now to see the changes?')) {
      window.location.reload();
    }
  } else {
    console.log('Reset cancelled. Your data is still intact.');
  }
})(); 