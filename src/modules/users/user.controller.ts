import { Request, Response, NextFunction } from 'express'
import * as userService from './user.service'

export const getAll = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const page = parseInt(req.query.page as string) || 1
        const limit = parseInt(req.query.limit as string) || 10

        // Search parameter
        const search = req.query.search as string | undefined

        // Filter parameters
        const name = req.query.name as string | undefined
        const email = req.query.email as string | undefined
        const role = req.query.role as 'owner' | 'member' | undefined
        const createdAfter = req.query.createdAfter as string | undefined
        const createdBefore = req.query.createdBefore as string | undefined
        const updatedAfter = req.query.updatedAfter as string | undefined
        const updatedBefore = req.query.updatedBefore as string | undefined

        // Sort parameters
        const sortBy = req.query.sortBy as string | undefined
        const sortOrder = req.query.sortOrder as 'asc' | 'desc' | undefined

        // Field selection parameter
        const fields = req.query.fields as string | undefined

        const result = await userService.getAllUsers({
            page,
            limit,
            search,
            filters: {
                name,
                email,
                role,
                createdAfter,
                createdBefore,
                updatedAfter,
                updatedBefore,
            },
            sort: {
                sortBy,
                sortOrder,
            },
            fields,
        })

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
