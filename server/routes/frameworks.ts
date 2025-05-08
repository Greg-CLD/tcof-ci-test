import express from 'express';
import { isAuthenticated } from '../auth';
import { getProjectFrameworks, saveProjectFrameworks } from './frameworks.js';

const router = express.Router();

// Get frameworks for a project
router.get('/:projectId/frameworks', isAuthenticated, getProjectFrameworks);

// Save frameworks for a project
router.post('/:projectId/frameworks', isAuthenticated, saveProjectFrameworks);

export default router;