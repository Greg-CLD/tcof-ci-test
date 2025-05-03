/**
 * Browser Data Fix Script
 * 
 * This script ensures the browser version of factorStore has the correct 12 unique factors.
 * It should be loaded as a module directly from the browser.
 */

// Official TCOF success factors - these are the ones we want to keep and merge duplicates into
const officialFactorTitles = [
  "Ask Why",
  "Get Stakeholder Support",
  "Choose Optimal Approach",
  "Ensure Technical Feasibility",
  "Grow and Develop the Team",
  "Manage Scope",
  "Track Progress",
  "Exercise Control",
  "Assign Clear Responsibilities",
  "Deliver Quality",
  "Create Buy-in",
  "Transfer Product Ownership"
];

async function fixBrowserFactors() {
  console.log('Starting browser factor fix...');
  
  try {
    // First, get all factors from localStorage
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('factor-')) {
        keys.push(key);
      }
    }
    
    console.log(`Found ${keys.length} factor keys in localStorage`);
    
    // Load all factors from localStorage
    const rawFactors = [];
    for (const key of keys) {
      try {
        const factorJson = localStorage.getItem(key);
        if (factorJson) {
          const factor = JSON.parse(factorJson);
          rawFactors.push(factor);
        }
      } catch (err) {
        console.error(`Error parsing factor from ${key}:`, err);
      }
    }
    
    console.log(`Loaded ${rawFactors.length} factors from localStorage`);
    
    // Deduplicate by factor title
    const dedupMap = {};
    const stages = ['Identification', 'Definition', 'Delivery', 'Closure'];
    
    // Map of official titles to IDs for consistency
    const officialIdMap = {};
    
    // First pass - identify official factors by exact title match
    rawFactors.forEach(factor => {
      const normalizedTitle = factor.title.trim();
      
      // If this is an official factor title, remember its ID
      if (officialFactorTitles.includes(normalizedTitle)) {
        officialIdMap[normalizedTitle] = factor.id;
      }
    });
    
    // Process each raw factor
    rawFactors.forEach(item => {
      const normalizedTitle = item.title.trim();
      
      // If this title already exists in our map, merge tasks
      if (dedupMap[normalizedTitle]) {
        // Merge tasks from all stages
        stages.forEach(stage => {
          const sourceTasks = item.tasks?.[stage] || [];
          
          for (const task of sourceTasks) {
            // Only add unique tasks (avoid duplicates)
            if (!dedupMap[normalizedTitle].tasks[stage].includes(task)) {
              dedupMap[normalizedTitle].tasks[stage].push(task);
            }
          }
        });
      } 
      // If this is a new title, add it to the map
      else {
        // Create a base entry
        dedupMap[normalizedTitle] = { 
          title: normalizedTitle, 
          id: officialIdMap[normalizedTitle] || item.id, // Use official ID if available
          tasks: {
            Identification: [...(item.tasks?.Identification || [])],
            Definition: [...(item.tasks?.Definition || [])],
            Delivery: [...(item.tasks?.Delivery || [])],
            Closure: [...(item.tasks?.Closure || [])]
          }
        };
      }
    });
    
    // Make sure all official factors exist
    officialFactorTitles.forEach((title, index) => {
      if (!dedupMap[title]) {
        dedupMap[title] = {
          title: title,
          id: officialIdMap[title] || `sf-${index + 1}`,
          tasks: {
            Identification: [],
            Definition: [],
            Delivery: [],
            Closure: []
          }
        };
      }
    });
    
    // Filter to keep only the official factors
    const dedupFactors = officialFactorTitles.map(title => dedupMap[title]);
    
    // Verify we have exactly 12 factors
    if (dedupFactors.length !== 12) {
      console.error(`Error: Expected 12 deduplicated factors but found ${dedupFactors.length}`);
      return false;
    }
    
    // Assign consistent IDs
    dedupFactors.forEach((factor, index) => {
      if (!factor.id || factor.id.includes("duplicate")) {
        factor.id = `sf-${index + 1}`;
      }
    });
    
    // Clear existing factors from localStorage
    for (const key of keys) {
      localStorage.removeItem(key);
    }
    
    // Save deduplicated factors to localStorage
    dedupFactors.forEach(factor => {
      const key = `factor-${factor.id}`;
      localStorage.setItem(key, JSON.stringify(factor));
    });
    
    console.log(`Successfully saved ${dedupFactors.length} deduplicated factors to localStorage`);
    return true;
  } catch (error) {
    console.error('Error fixing browser factors:', error);
    return false;
  }
}

// Run the fix function
fixBrowserFactors().then(success => {
  if (success) {
    console.log('Browser factor fix complete!');
  } else {
    console.error('Browser factor fix failed.');
  }
});