import { Request, Response, NextFunction } from 'express';
import { TaskService } from './task.service';

const taskService = new TaskService();

export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;
    const task = await taskService.createTask(projectId, req.body, userId, userRole);
    res.status(201).json({ task });
  } catch (error) {
    next(error);
  }
};

export const getByProject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;
    const tasks = await taskService.getTasksByProject(projectId, userId, userRole);
    res.json({ tasks });
  } catch (error) {
    next(error);
  }
};

export const getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;
    const task = await taskService.getTaskById(id, userId, userRole);
    res.json({ task });
  } catch (error) {
    next(error);
  }
};

export const update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;
    const task = await taskService.updateTask(id, req.body, userId, userRole);
    res.json({ task });
  } catch (error) {
    next(error);
  }
};

export const deleteTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;
    await taskService.deleteTask(id, userId, userRole);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

