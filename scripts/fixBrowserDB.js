/**
 * Fix Browser localStorage Success Factors
 * 
 * This script generates code that can be pasted in the browser console
 * to fix the localStorage data and ensure it uses the canonical factors.
 */

// The 12 official TCOF success factors
const officialFactorTitles = [
  "1.1 Ask Why",
  "1.2 Get a Masterbuilder",
  "1.3 Get Your People on the Bus",
  "1.4 Make Friends and Keep them Friendly",
  "2.1 Recognise that your project is not unique",
  "2.2 Look for Tried & Tested Options",
  "3.1 Think Big, Start Small",
  "3.2 Learn by Experimenting",
  "3.3 Keep on top of risks",
  "4.1 Adjust for optimism",
  "4.2 Measure What Matters, Be Ready to Step Away",
  "4.3 Be Ready to Adapt"
];

function fixBrowserFactors() {
  const browserFixCode = `
// This code fixes the localStorage success factors in the browser

// The 12 official TCOF success factors
const officialFactorTitles = [
  "1.1 Ask Why",
  "1.2 Get a Masterbuilder",
  "1.3 Get Your People on the Bus",
  "1.4 Make Friends and Keep them Friendly",
  "2.1 Recognise that your project is not unique",
  "2.2 Look for Tried & Tested Options",
  "3.1 Think Big, Start Small",
  "3.2 Learn by Experimenting",
  "3.3 Keep on top of risks",
  "4.1 Adjust for optimism",
  "4.2 Measure What Matters, Be Ready to Step Away",
  "4.3 Be Ready to Adapt"
];

// Fix success factors in localStorage
function fixSuccessFactors() {
  console.log('Starting success factor fix in localStorage...');
  
  // Get current factors from localStorage
  let successFactors = JSON.parse(localStorage.getItem('successFactors') || '[]');
  
  if (!successFactors || successFactors.length === 0) {
    console.log('No success factors found in localStorage');
    return;
  }
  
  console.log(\`Found \${successFactors.length} factors in localStorage\`);
  
  // Create mapping for tasks from existing factors
  const taskMap = {};
  const stages = ['Identification', 'Definition', 'Delivery', 'Closure'];
  
  // First, collect all tasks from existing factors
  successFactors.forEach(factor => {
    const title = factor.title.trim();
    
    if (!taskMap[title]) {
      taskMap[title] = {
        Identification: [...(factor.tasks?.Identification || [])],
        Definition: [...(factor.tasks?.Definition || [])],
        Delivery: [...(factor.tasks?.Delivery || [])],
        Closure: [...(factor.tasks?.Closure || [])]
      };
    } else {
      // Merge tasks if duplicate title found
      stages.forEach(stage => {
        const sourceTasks = factor.tasks?.[stage] || [];
        for (const task of sourceTasks) {
          if (!taskMap[title][stage].includes(task)) {
            taskMap[title][stage].push(task);
          }
        }
      });
    }
  });
  
  // Now create the 12 canonical factors
  const fixedFactors = officialFactorTitles.map((title, index) => {
    // Find matching tasks or partial match
    let matchedTasks = taskMap[title];
    
    if (!matchedTasks) {
      // Try to find by prefix or partial match
      const prefix = title.split(' ')[0];
      const keyword = title.split(' ').slice(1).join(' ').toLowerCase();
      
      // Find best matching title
      const bestMatch = Object.keys(taskMap).find(t => 
        t.startsWith(prefix) || 
        t.toLowerCase().includes(keyword) ||
        keyword.includes(t.toLowerCase())
      );
      
      matchedTasks = bestMatch ? taskMap[bestMatch] : null;
    }
    
    return {
      id: \`sf-\${index + 1}\`,
      title: title,
      tasks: matchedTasks || {
        Identification: [],
        Definition: [],
        Delivery: [],
        Closure: []
      }
    };
  });
  
  // Save back to localStorage
  localStorage.setItem('successFactors', JSON.stringify(fixedFactors));
  console.log('Success factors fixed in localStorage. New factors:', fixedFactors.map(f => f.title));
}

// Run the fix
fixSuccessFactors();
`;

  console.log('Browser Fix Code Generator');
  console.log('=========================');
  console.log('Paste the following code in your browser console to fix localStorage factors:');
  console.log(browserFixCode);
}

fixBrowserFactors();