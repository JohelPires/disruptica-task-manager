import { Request, Response, NextFunction } from 'express'
import { CommentService } from './comment.service'

const commentService = new CommentService()

export const create = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { taskId } = req.params
        const userId = (req as any).user.userId
        const userRole = (req as any).user.role
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
        const userId = (req as any).user.userId
        const userRole = (req as any).user.role
        const comments = await commentService.getCommentsByTask(
            taskId,
            userId,
            userRole
        )
        res.json({ comments })
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
        const userId = (req as any).user.userId
        const userRole = (req as any).user.role
        await commentService.deleteComment(id, userId, userRole)
        res.status(204).send()
    } catch (error) {
        next(error)
    }
}
