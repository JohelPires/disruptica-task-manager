import { Request, Response, NextFunction } from 'express'
import * as taskService from './task.service'

export const create = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { projectId } = req.params
        const userId = (req as any).user.userId
        const userRole = (req as any).user.role
        const task = await taskService.createTask(
            projectId,
            req.body,
            userId,
            userRole
        )
        res.status(201).json({ task })
    } catch (error) {
        next(error)
    }
}

export const getByProject = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { projectId } = req.params
        const userId = (req as any).user.userId
        const userRole = (req as any).user.role
        const page = parseInt(req.query.page as string) || 1
        const limit = parseInt(req.query.limit as string) || 10
        const result = await taskService.getTasksByProject(
            projectId,
            userId,
            userRole,
            page,
            limit
        )
        res.json({
            tasks: result.data,
            pagination: result.pagination,
        })
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
        const userId = (req as any).user.userId
        const userRole = (req as any).user.role
        const task = await taskService.getTaskById(id, userId, userRole)
        res.json({ task })
    } catch (error) {
        next(error)
    }
}

export const update = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { id } = req.params
        const userId = (req as any).user.userId
        const userRole = (req as any).user.role
        const task = await taskService.updateTask(
            id,
            req.body,
            userId,
            userRole
        )
        res.json({ task })
    } catch (error) {
        next(error)
    }
}

export const deleteTask = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { id } = req.params
        const userId = (req as any).user.userId
        const userRole = (req as any).user.role
        await taskService.deleteTask(id, userId, userRole)
        res.status(204).send()
    } catch (error) {
        next(error)
    }
}
