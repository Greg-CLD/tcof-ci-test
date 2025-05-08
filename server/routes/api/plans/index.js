import { Router } from 'express';
import projectBlockRouter from './project-block.js';

const router = Router();

// Use our new project-block router that handles saving blocks
router.use(projectBlockRouter);

export default router;