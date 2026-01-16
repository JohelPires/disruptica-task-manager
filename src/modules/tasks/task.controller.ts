import { Request, Response, NextFunction } from 'express';
import { TaskService } from './task.service';

export class TaskController {
  private taskService: TaskService;

  constructor() {
    this.taskService = new TaskService();
  }

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { projectId } = req.params;
      const userId = (req as any).user.userId;
      const userRole = (req as any).user.role;
      const task = await this.taskService.createTask(projectId, req.body, userId, userRole);
      res.status(201).json({ task });
    } catch (error) {
      next(error);
    }
  };

  getByProject = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { projectId } = req.params;
      const userId = (req as any).user.userId;
      const userRole = (req as any).user.role;
      const tasks = await this.taskService.getTasksByProject(projectId, userId, userRole);
      res.json({ tasks });
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const userId = (req as any).user.userId;
      const userRole = (req as any).user.role;
      const task = await this.taskService.getTaskById(id, userId, userRole);
      res.json({ task });
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const userId = (req as any).user.userId;
      const userRole = (req as any).user.role;
      const task = await this.taskService.updateTask(id, req.body, userId, userRole);
      res.json({ task });
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const userId = (req as any).user.userId;
      const userRole = (req as any).user.role;
      await this.taskService.deleteTask(id, userId, userRole);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}

