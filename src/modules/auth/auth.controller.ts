import { Request, Response, NextFunction } from 'express'
import * as authService from './auth.service'
import { createChildLogger } from '../../utils/logger'

export const register = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            res.status(400).json({
                error: {
                    message: 'Request body is required',
                    code: 'VALIDATION_ERROR',
                },
            })
            return
        }
        const result = await authService.register(req.body)
        res.status(201).json(result)
    } catch (error) {
        const logger = createChildLogger({ requestId: req.requestId })
        logger.error({ err: error }, 'Registration error')
        next(error)
    }
}

export const login = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const result = await authService.login(req.body)
        res.json(result)
    } catch (error) {
        next(error)
    }
}

export const getMe = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const userId = req.user!.userId
        const user = await authService.getMe(userId)
        res.json({ user })
    } catch (error) {
        next(error)
    }
}
