import { Request, Response, NextFunction } from 'express'
import * as commentService from './comment.service'

export const create = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { taskId } = req.params
        const userId = req.user!.userId
        const userRole = req.user!.role
        const comment = await commentService.createComment(
            taskId,
            req.body,
            userId,
            userRole
        )
        res.status(201).json({ comment })
    } catch (error) {
        next(error)
    }
}

export const getByTask = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { taskId } = req.params
        const userId = req.user!.userId
        const userRole = req.user!.role
        const page = parseInt(req.query.page as string) || 1
        const limit = parseInt(req.query.limit as string) || 10

        // Extract query parameters
        const search = req.query.search as string | undefined
        const authorId = req.query.authorId as string | undefined
        const myComments = req.query.myComments as string | undefined
        const createdAfter = req.query.createdAfter as string | undefined
        const createdBefore = req.query.createdBefore as string | undefined
        const updatedAfter = req.query.updatedAfter as string | undefined
        const updatedBefore = req.query.updatedBefore as string | undefined
        const sortBy = req.query.sortBy as string | undefined
        const sortOrder = req.query.sortOrder as string | undefined
        const include = req.query.include as string | undefined

        const result = await commentService.getCommentsByTask(
            taskId,
            userId,
            userRole,
            {
                page,
                limit,
                search,
                authorId,
                myComments,
                createdAfter,
                createdBefore,
                updatedAfter,
                updatedBefore,
                sortBy,
                sortOrder,
                include,
            }
        )
        res.json({
            comments: result.data,
            pagination: result.pagination,
        })
    } catch (error) {
        next(error)
    }
}

export const deleteComment = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { id } = req.params
        const userId = req.user!.userId
        const userRole = req.user!.role
        await commentService.deleteComment(id, userId, userRole)
        res.status(204).send()
    } catch (error) {
        next(error)
    }
}
