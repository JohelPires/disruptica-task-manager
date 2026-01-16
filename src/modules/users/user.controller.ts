import { Request, Response, NextFunction } from 'express';
import { UserService } from './user.service';

const userService = new UserService();

export const getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const user = await userService.getUserById(id);
    res.json({ user });
  } catch (error) {
    next(error);
  }
};

