/**
 * Routes for managing project frameworks
 */

// Get frameworks for a project
const getProjectFrameworks = async (req, res) => {
  try {
    const { projectId } = req.params;
    
    // Check if project exists
    const project = await loadProject(projectId);
    if (!project) {
      return res.status(404).send({ message: 'Project not found' });
    }
    
    // Verify user has access to this project
    if (project.userId !== req.user.id) {
      return res.status(403).send({ message: 'You do not have access to this project' });
    }
    
    // Try to load existing frameworks data
    const frameworks = project.frameworks || {};
    
    res.status(200).send(frameworks);
  } catch (error) {
    console.error('Error getting project frameworks:', error);
    res.status(500).send({ message: 'Failed to get project frameworks' });
  }
};

// Save frameworks for a project
const saveProjectFrameworks = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { selectedFrameworkCodes, projectSize, pathClarity } = req.body;
    
    // Validate input
    if (!Array.isArray(selectedFrameworkCodes)) {
      return res.status(400).send({ message: 'selectedFrameworkCodes must be an array' });
    }
    
    // Check if project exists
    const project = await loadProject(projectId);
    if (!project) {
      return res.status(404).send({ message: 'Project not found' });
    }
    
    // Verify user has access to this project
    if (project.userId !== req.user.id) {
      return res.status(403).send({ message: 'You do not have access to this project' });
    }
    
    // Update frameworks data
    const frameworks = {
      selectedFrameworkCodes,
      projectSize: projectSize || project.frameworks?.projectSize,
      pathClarity: pathClarity || project.frameworks?.pathClarity,
      updatedAt: new Date()
    };
    
    // Save to project
    project.frameworks = frameworks;
    
    // Save the updated project
    await saveProject(projectId, project);
    
    res.status(200).send(frameworks);
  } catch (error) {
    console.error('Error saving project frameworks:', error);
    res.status(500).send({ message: 'Failed to save project frameworks' });
  }
};

module.exports = {
  getProjectFrameworks,
  saveProjectFrameworks
};

// Helper function to load a project (imported from projectsDb)
async function loadProject(projectId) {
  // Import at runtime to avoid circular dependencies
  const { loadProject: getProject } = require('../projectsDb');
  return getProject(projectId);
}

// Helper function to save a project (imported from projectsDb)
async function saveProject(projectId, project) {
  // Import at runtime to avoid circular dependencies
  const { saveProject: updateProject } = require('../projectsDb');
  return updateProject(projectId, project);
}