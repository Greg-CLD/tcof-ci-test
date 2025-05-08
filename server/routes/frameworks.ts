import express from 'express';
import { isAuthenticated } from '../auth';
const router = express.Router();

// Import these directly from ../routes/frameworks.js to avoid circular references
import { getProjectFrameworks, saveProjectFrameworks } from '../routes/frameworks.js';

// Get frameworks for a project
router.get('/:projectId/frameworks', isAuthenticated, getProjectFrameworks);

// Save frameworks for a project
router.post('/:projectId/frameworks', isAuthenticated, saveProjectFrameworks);

export default router;