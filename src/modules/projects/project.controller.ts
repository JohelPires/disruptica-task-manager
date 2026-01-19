import { Request, Response, NextFunction } from 'express'
import * as projectService from './project.service'

export const create = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const userId = req.user!.userId
        const project = await projectService.createProject(req.body, userId)
        res.status(201).json({ project })
    } catch (error) {
        next(error)
    }
}

export const getAll = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const userId = req.user!.userId
        const userRole = req.user!.role

        const includeParam = req.query.include as string | undefined
        const includeOptions: {
            owner?: boolean
            members?: boolean
            tasks?: boolean
        } = {}

        if (includeParam) {
            const includes = includeParam
                .split(',')
                .map((item) => item.trim().toLowerCase())
            if (includes.includes('owner')) {
                includeOptions.owner = true
            }
            if (includes.includes('members')) {
                includeOptions.members = true
            }
            if (includes.includes('tasks')) {
                includeOptions.tasks = true
            }
        }

        const page = parseInt(req.query.page as string) || 1
        const limit = parseInt(req.query.limit as string) || 10

        // Search parameter
        const search = req.query.search as string | undefined

        // Filter parameters
        const name = req.query.name as string | undefined
        const ownerId = req.query.ownerId as string | undefined
        const createdAfter = req.query.createdAfter as string | undefined
        const createdBefore = req.query.createdBefore as string | undefined
        const updatedAfter = req.query.updatedAfter as string | undefined
        const updatedBefore = req.query.updatedBefore as string | undefined
        const myRole = req.query.myRole as 'owner' | 'member' | undefined

        // Sort parameters
        const sortBy = req.query.sortBy as string | undefined
        const sortOrder = req.query.sortOrder as 'asc' | 'desc' | undefined

        const result = await projectService.getProjects(userId, userRole, {
            includeOptions,
            page,
            limit,
            search,
            filters: {
                name,
                ownerId,
                createdAfter,
                createdBefore,
                updatedAfter,
                updatedBefore,
                myRole,
            },
            sort: {
                sortBy,
                sortOrder,
            },
        })
        res.json({
            projects: result.data,
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
        const project = await projectService.getProjectById(
            id,
            userId,
            userRole
        )
        res.json({ project })
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
        const project = await projectService.updateProject(id, req.body)
        res.json({ project })
    } catch (error) {
        next(error)
    }
}

export const deleteProject = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { id } = req.params
        await projectService.deleteProject(id)
        res.status(204).send()
    } catch (error) {
        next(error)
    }
}

export const addMember = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { id } = req.params
        const member = await projectService.addMember(id, req.body)
        res.status(201).json({ member })
    } catch (error) {
        next(error)
    }
}

export const removeMember = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { id, userId } = req.params
        await projectService.removeMember(id, userId)
        res.status(204).send()
    } catch (error) {
        next(error)
    }
}
