import express from 'express';
import { projectsDb } from '../projectsDb';

const router = express.Router();

router.post('/:projectId/tasks', async (req, res) => {
  const { projectId } = req.params;
  const data = req.body;
  if (Array.isArray(data)) {
    const tasks = await Promise.all(data.map(task => projectsDb.createTask({ projectId, ...task })));
    return res.status(201).json(tasks.filter(Boolean));
  }
  const task = await projectsDb.createTask({ projectId, ...data });
  return res.status(201).json(task);
});

router.get('/:projectId/tasks', async (req, res) => {
  const { projectId } = req.params;
  const tasks = await projectsDb.getTasksForProject(projectId);
  return res.json(tasks);
});

router.put('/:projectId/tasks/:taskId', async (req, res) => {
  const { taskId } = req.params;
  const task = await projectsDb.updateTask(taskId, req.body);
  return res.json(task);
});

router.delete('/:projectId/tasks/:taskId', async (req, res) => {
  const { taskId } = req.params;
  const result = await projectsDb.deleteTask(taskId);
  return res.json({ success: result });
});

export default router;
