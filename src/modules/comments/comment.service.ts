import { prisma } from '../../config/prisma'
import { isProjectMember, isProjectOwner } from '../projects/project.service'
import { z } from 'zod'

const createCommentSchema = z.object({
    content: z.string().min(1),
})

export type CreateCommentInput = z.infer<typeof createCommentSchema>

/**
 * Creates a comment on a task.
 *
 * Verifies task exists and user has access to the project before allowing comment creation.
 * Automatically associates the comment with the authenticated user as the author.
 */
export async function createComment(
    taskId: string,
    data: CreateCommentInput,
    userId: string,
    userRole: string
) {
    const task = await prisma.task.findUnique({
        where: { id: taskId },
    })

    if (!task) {
        throw new Error('Task not found')
    }

    // Ensure user has access to the project containing this task
    const isMember = await isProjectMember(task.projectId, userId, userRole)
    if (!isMember) {
        throw new Error('Access denied')
    }

    const validated = createCommentSchema.parse(data)

    const comment = await prisma.comment.create({
        data: {
            content: validated.content,
            taskId,
            authorId: userId,
        },
        include: {
            author: {
                select: {
                    id: true,
                    email: true,
                    name: true,
                    role: true,
                },
            },
            task: {
                select: {
                    id: true,
                    title: true,
                    projectId: true,
                },
            },
        },
    })

    return comment
}

export interface GetCommentsByTaskOptions {
    page?: number
    limit?: number
    search?: string
    authorId?: string
    myComments?: string
    createdAfter?: string
    createdBefore?: string
    updatedAfter?: string
    updatedBefore?: string
    sortBy?: string
    sortOrder?: string
    include?: string
}

/**
 * Retrieves comments for a task with filtering, sorting, and pagination.
 *
 * Verifies user has access to the project containing the task before returning comments.
 * Supports filtering by author, date ranges, and selective relation inclusion for performance.
 */
export async function getCommentsByTask(
    taskId: string,
    userId: string,
    userRole: string,
    options: GetCommentsByTaskOptions = {}
) {
    const {
        page = 1,
        limit = 10,
        search,
        authorId,
        myComments,
        createdAfter,
        createdBefore,
        updatedAfter,
        updatedBefore,
        sortBy = 'createdAt',
        sortOrder = 'asc',
        include,
    } = options

    const task = await prisma.task.findUnique({
        where: { id: taskId },
    })

    if (!task) {
        throw new Error('Task not found')
    }

    // Ensure user has access to the project containing this task
    const isMember = await isProjectMember(task.projectId, userId, userRole)
    if (!isMember) {
        throw new Error('Access denied')
    }

    // Build where clause
    const where: any = { taskId }

    // Search filter (case-insensitive partial match on content)
    if (search) {
        where.content = {
            contains: search,
            mode: 'insensitive',
        }
    }

    // My comments filter (takes precedence over authorId if both are provided)
    // This allows users to easily filter to their own comments or exclude them
    if (myComments === 'true') {
        where.authorId = userId
    } else if (myComments === 'false') {
        where.authorId = {
            not: userId,
        }
    } else if (authorId) {
        // Author filter (only applied if myComments is not set)
        where.authorId = authorId
    }

    // Date filters - build date range objects properly
    if (createdAfter || createdBefore) {
        const createdAtFilter: any = {}
        if (createdAfter) {
            const date = new Date(createdAfter)
            if (!isNaN(date.getTime())) {
                createdAtFilter.gte = date
            }
        }
        if (createdBefore) {
            const date = new Date(createdBefore)
            if (!isNaN(date.getTime())) {
                createdAtFilter.lte = date
            }
        }
        if (Object.keys(createdAtFilter).length > 0) {
            where.createdAt = createdAtFilter
        }
    }

    if (updatedAfter || updatedBefore) {
        const updatedAtFilter: any = {}
        if (updatedAfter) {
            const date = new Date(updatedAfter)
            if (!isNaN(date.getTime())) {
                updatedAtFilter.gte = date
            }
        }
        if (updatedBefore) {
            const date = new Date(updatedBefore)
            if (!isNaN(date.getTime())) {
                updatedAtFilter.lte = date
            }
        }
        if (Object.keys(updatedAtFilter).length > 0) {
            where.updatedAt = updatedAtFilter
        }
    }

    // Validate and set sortBy (only allow createdAt or updatedAt)
    const validSortFields = ['createdAt', 'updatedAt']
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt'

    // Validate and set sortOrder (only allow asc or desc)
    const validSortOrders = ['asc', 'desc']
    const order = validSortOrders.includes(sortOrder.toLowerCase())
        ? (sortOrder.toLowerCase() as 'asc' | 'desc')
        : 'asc'

    // Handle include relations - allows clients to control response size
    const includeRelations: any = {}

    if (include) {
        // Parse comma-separated include values
        const includeList = include.split(',').map((item) => item.trim())

        // Include author if specified
        if (includeList.includes('author')) {
            includeRelations.author = {
                select: {
                    id: true,
                    email: true,
                    name: true,
                    role: true,
                },
            }
        }

        // Include task if specified
        if (includeList.includes('task')) {
            includeRelations.task = {
                select: {
                    id: true,
                    title: true,
                    projectId: true,
                },
            }
        }
    } else {
        // Default: include author since it's commonly needed for comment display
        includeRelations.author = {
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
            },
        }
    }

    const skip = (page - 1) * limit

    const [comments, total] = await Promise.all([
        prisma.comment.findMany({
            where,
            include:
                Object.keys(includeRelations).length > 0
                    ? includeRelations
                    : undefined,
            orderBy: { [sortField]: order },
            skip,
            take: limit,
        }),
        prisma.comment.count({
            where,
        }),
    ])

    return {
        data: comments,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    }
}

/**
 * Deletes a comment.
 *
 * Authorization: Only the comment author or the project owner can delete a comment.
 * This allows project owners to moderate comments while respecting individual ownership.
 */
export async function deleteComment(
    commentId: string,
    userId: string,
    userRole: string
) {
    const comment = await prisma.comment.findUnique({
        where: { id: commentId },
        include: {
            task: {
                select: {
                    projectId: true,
                },
            },
        },
    })

    if (!comment) {
        throw new Error('Comment not found')
    }

    const isProjectOwnerCheck = await isProjectOwner(
        comment.task.projectId,
        userId,
        userRole
    )

    // Allow deletion by comment author or project owner
    if (comment.authorId !== userId && !isProjectOwnerCheck) {
        throw new Error('Access denied')
    }

    await prisma.comment.delete({
        where: { id: commentId },
    })
}
