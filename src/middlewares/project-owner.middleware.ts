import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';

/**
 * Middleware that enforces project ownership authorization.
 * 
 * Allows access if the user has the global 'owner' role or is the owner of the specific project.
 * Used for operations that should be restricted to project owners (e.g., delete, update, add members).
 */
export async function requireProjectOwner(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        error: {
          message: 'Authentication required',
          code: 'AUTH_REQUIRED',
        },
      });
    }

    // Global 'owner' role bypasses project-specific ownership checks
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

