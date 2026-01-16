import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { AuthRequest } from './auth.middleware';

export async function requireProjectOwner(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const user = (req as AuthRequest).user;

    if (!user) {
      return res.status(401).json({
        error: {
          message: 'Authentication required',
          code: 'AUTH_REQUIRED',
        },
      });
    }

    if (user.role === 'owner') {
      return next();
    }

    const project = await prisma.project.findUnique({
      where: { id },
      select: { ownerId: true },
    });

    if (!project) {
      return res.status(404).json({
        error: {
          message: 'Project not found',
          code: 'NOT_FOUND',
        },
      });
    }

    if (project.ownerId !== user.userId) {
      return res.status(403).json({
        error: {
          message: 'Access denied. Only project owner can perform this action',
          code: 'FORBIDDEN',
        },
      });
    }

    next();
  } catch (error) {
    next(error);
  }
}

