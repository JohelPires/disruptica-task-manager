import { Request, Response, NextFunction } from 'express';
import { ProjectService } from './project.service';

export class ProjectController {
  private projectService: ProjectService;

  constructor() {
    this.projectService = new ProjectService();
  }

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.userId;
      const project = await this.projectService.createProject(req.body, userId);
      res.status(201).json({ project });
    } catch (error) {
      next(error);
    }
  };

  getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.userId;
      const userRole = (req as any).user.role;
      const projects = await this.projectService.getProjects(userId, userRole);
      res.json({ projects });
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const userId = (req as any).user.userId;
      const userRole = (req as any).user.role;
      const project = await this.projectService.getProjectById(id, userId, userRole);
      res.json({ project });
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const project = await this.projectService.updateProject(id, req.body);
      res.json({ project });
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      await this.projectService.deleteProject(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  addMember = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const member = await this.projectService.addMember(id, req.body);
      res.status(201).json({ member });
    } catch (error) {
      next(error);
    }
  };

  removeMember = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id, userId } = req.params;
      await this.projectService.removeMember(id, userId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}

