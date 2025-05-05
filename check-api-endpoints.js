// This script will allow us to fetch and test API endpoints

const testApiEndpoints = async () => {
  try {
    // Get all projects
    console.log('Fetching projects...');
    const projectsResponse = await fetch('/api/projects');
    
    if (!projectsResponse.ok) {
      console.error('Failed to fetch projects:', projectsResponse.status, projectsResponse.statusText);
      return;
    }
    
    const projects = await projectsResponse.json();
    console.log('Projects:', JSON.stringify(projects, null, 2));
    
    // If we have projects, fetch plans for the first project
    if (projects && projects.length > 0) {
      const projectId = projects[0].id;
      console.log(`Fetching plans for project ${projectId}...`);
      
      // Note: Checking if we have a /api/plans endpoint 
      // This endpoint might not exist yet - we're just testing
      const plansResponse = await fetch(`/api/plans?projectId=${projectId}`);
      
      if (!plansResponse.ok) {
        console.error('Failed to fetch plans:', plansResponse.status, plansResponse.statusText);
        
        // Try alternate endpoints if they exist
        console.log('Trying to fetch plan from localStorage...');
        const storedProjectId = localStorage.getItem('selectedProjectId');
        if (storedProjectId) {
          console.log('Current selectedProjectId in localStorage:', storedProjectId);
        } else {
          console.log('No selectedProjectId found in localStorage');
        }
        
        const tcofMostRecentPlan = localStorage.getItem('tcof_most_recent_plan');
        if (tcofMostRecentPlan) {
          console.log('tcof_most_recent_plan in localStorage:', tcofMostRecentPlan);
          try {
            const planObject = JSON.parse(tcofMostRecentPlan);
            console.log('Parsed plan from localStorage:', planObject);
          } catch (e) {
            console.error('Error parsing plan from localStorage:', e);
          }
        } else {
          console.log('No tcof_most_recent_plan found in localStorage');
        }
        
        return;
      }
      
      const plans = await plansResponse.json();
      console.log('Plans:', JSON.stringify(plans, null, 2));
    }
  } catch (error) {
    console.error('Error testing API endpoints:', error);
  }
};

// Run the test
testApiEndpoints();