import express from 'express';
import fs from 'fs';
import path from 'path';
import { projectsDb } from '../projectsDb.ts';
import { isAuthenticated } from '../auth.js';

const router = express.Router();
const FRAMEWORKS_DIR = path.join(process.cwd(), 'data', 'frameworks');

// Ensure frameworks directory exists
if (!fs.existsSync(FRAMEWORKS_DIR)) {
  fs.mkdirSync(FRAMEWORKS_DIR, { recursive: true });
}

// Load project frameworks
export async function loadProject(projectId) {
  try {
    const filePath = path.join(FRAMEWORKS_DIR, `${projectId}.json`);
    
    if (!fs.existsSync(filePath)) {
      // Return default empty structure if no file exists
      return {
        projectSize: '',
        pathClarity: '',
        selectedFrameworks: [],
        customFrameworkName: '',
        customFrameworkDescription: '',
      };
    }
    
    const fileData = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(fileData);
  } catch (error) {
    console.error(`Error loading frameworks for project ${projectId}:`, error);
    throw error;
  }
}

// Save project frameworks
async function saveProject(projectId, frameworksData) {
  try {
    const filePath = path.join(FRAMEWORKS_DIR, `${projectId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(frameworksData, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error(`Error saving frameworks for project ${projectId}:`, error);
    throw error;
  }
}

// Get frameworks for a project
async function getProjectFrameworks(req, res) {
  try {
    const { projectId } = req.params;
    
    // Check if project exists and user has access
    const project = await projectsDb.getProject(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    if (project.userId !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized access to project' });
    }
    
    // Load frameworks data
    const frameworksData = await loadProject(projectId);
    
    return res.status(200).json(frameworksData);
  } catch (error) {
    console.error('Error getting project frameworks:', error);
    return res.status(500).json({ message: 'Failed to get project frameworks' });
  }
}

// Save frameworks for a project
async function saveProjectFrameworks(req, res) {
  try {
    const { projectId } = req.params;
    const frameworksData = req.body;
    
    // Check if project exists and user has access
    const project = await projectsDb.getProject(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    if (project.userId !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized access to project' });
    }
    
    // Save frameworks data
    await saveProject(projectId, frameworksData);
    
    return res.status(200).json({ message: 'Frameworks saved successfully' });
  } catch (error) {
    console.error('Error saving project frameworks:', error);
    return res.status(500).json({ message: 'Failed to save project frameworks' });
  }
}

// Define routes
router.get('/:projectId/frameworks', isAuthenticated, getProjectFrameworks);
router.post('/:projectId/frameworks', isAuthenticated, saveProjectFrameworks);

export default router;