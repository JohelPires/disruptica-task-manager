import { Request, Response, NextFunction } from 'express'
import { UserService } from './user.service'

const userService = new UserService()

export const getAll = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const page = parseInt(req.query.page as string) || 1
        const limit = parseInt(req.query.limit as string) || 10

        const result = await userService.getAllUsers(page, limit)
        res.json(result)
    } catch (error) {
        next(error)
    }
}

export const getById = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { id } = req.params
        const user = await userService.getUserById(id)
        res.json({ user })
    } catch (error) {
        next(error)
    }
}
