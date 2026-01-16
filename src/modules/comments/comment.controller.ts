import { Request, Response, NextFunction } from 'express';
import { CommentService } from './comment.service';

export class CommentController {
  private commentService: CommentService;

  constructor() {
    this.commentService = new CommentService();
  }

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { taskId } = req.params;
      const userId = (req as any).user.userId;
      const userRole = (req as any).user.role;
      const comment = await this.commentService.createComment(taskId, req.body, userId, userRole);
      res.status(201).json({ comment });
    } catch (error) {
      next(error);
    }
  };

  getByTask = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { taskId } = req.params;
      const userId = (req as any).user.userId;
      const userRole = (req as any).user.role;
      const comments = await this.commentService.getCommentsByTask(taskId, userId, userRole);
      res.json({ comments });
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const userId = (req as any).user.userId;
      const userRole = (req as any).user.role;
      await this.commentService.deleteComment(id, userId, userRole);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}

