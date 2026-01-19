import { Request, Response, NextFunction } from 'express'
import * as taskService from './task.service'

export const create = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { projectId } = req.params
        const userId = req.user!.userId
        const userRole = req.user!.role
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
        const userId = req.user!.userId
        const userRole = req.user!.role
        const page = parseInt(req.query.page as string) || 1
        const limit = parseInt(req.query.limit as string) || 10

        // Extract query parameters
        const search = req.query.search as string | undefined
        const title = req.query.title as string | undefined
        const status = req.query.status as string | undefined
        const priority = req.query.priority as string | undefined
        const assignedToId = req.query.assignedToId as string | undefined
        const createdById = req.query.createdById as string | undefined
        const unassigned = req.query.unassigned as string | undefined
        const createdAfter = req.query.createdAfter as string | undefined
        const createdBefore = req.query.createdBefore as string | undefined
        const updatedAfter = req.query.updatedAfter as string | undefined
        const updatedBefore = req.query.updatedBefore as string | undefined
        const sortBy = req.query.sortBy as string | undefined
        const sortOrder = req.query.sortOrder as 'asc' | 'desc' | undefined
        const include = req.query.include as string | undefined

        const result = await taskService.getTasksByProject(
            projectId,
            userId,
            userRole,
            {
                page,
                limit,
                search,
                filters: {
                    title,
                    status,
                    priority,
                    assignedToId,
                    createdById,
                    unassigned:
                        unassigned === 'true'
                            ? true
                            : unassigned === 'false'
                            ? false
                            : undefined,
                    createdAfter,
                    createdBefore,
                    updatedAfter,
                    updatedBefore,
                },
                sort: {
                    sortBy,
                    sortOrder,
                },
                include: include
                    ? include.split(',').map((s) => s.trim())
                    : undefined,
            }
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
        const userId = req.user!.userId
        const userRole = req.user!.role
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
        const userId = req.user!.userId
        const userRole = req.user!.role
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
        const userId = req.user!.userId
        const userRole = req.user!.role
        await taskService.deleteTask(id, userId, userRole)
        res.status(204).send()
    } catch (error) {
        next(error)
    }
}
