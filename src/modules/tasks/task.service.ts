import { prisma } from '../../config/prisma'
import { isProjectMember, isProjectOwner } from '../projects/project.service'
import { z } from 'zod'

const createTaskSchema = z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    status: z.string().optional(),
    priority: z.string().optional(),
    assignedToId: z.string().uuid().optional(),
})

const updateTaskSchema = z.object({
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    status: z.string().optional(),
    priority: z.string().optional(),
    assignedToId: z.string().uuid().optional(),
})

export type CreateTaskInput = z.infer<typeof createTaskSchema>
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>

/**
 * Creates a new task in a project.
 *
 * Verifies user has access to the project before creating the task.
 * Sets default status ('todo') and priority ('medium') if not provided.
 * The authenticated user is automatically set as the task creator.
 */
export async function createTask(
    projectId: string,
    data: CreateTaskInput,
    userId: string,
    userRole: string
) {
    const isMember = await isProjectMember(projectId, userId, userRole)
    if (!isMember) {
        throw new Error('Access denied')
    }

    const validated = createTaskSchema.parse(data)

    const task = await prisma.task.create({
        data: {
            title: validated.title,
            description: validated.description,
            status: validated.status || 'todo',
            priority: validated.priority || 'medium',
            projectId,
            assignedToId: validated.assignedToId,
            createdById: userId,
        },
        include: {
            project: {
                select: {
                    id: true,
                    name: true,
                },
            },
            assignedTo: {
                select: {
                    id: true,
                    email: true,
                    name: true,
                    role: true,
                },
            },
            createdBy: {
                select: {
                    id: true,
                    email: true,
                    name: true,
                    role: true,
                },
            },
        },
    })

    return task
}

export interface GetTasksByProjectOptions {
    page?: number
    limit?: number
    search?: string
    filters?: {
        title?: string
        status?: string
        priority?: string
        assignedToId?: string
        createdById?: string
        unassigned?: boolean
        createdAfter?: string
        createdBefore?: string
        updatedAfter?: string
        updatedBefore?: string
    }
    sort?: {
        sortBy?: string
        sortOrder?: 'asc' | 'desc'
    }
    include?: string[]
}

export async function getTasksByProject(
    projectId: string,
    userId: string,
    userRole: string,
    options: GetTasksByProjectOptions = {}
) {
    const isMember = await isProjectMember(projectId, userId, userRole)
    if (!isMember) {
        throw new Error('Access denied')
    }

    const {
        page = 1,
        limit = 10,
        search,
        filters = {},
        sort = {},
        include: includeParams,
    } = options

    const skip = (page - 1) * limit

    // Validate and set sortBy - default to createdAt
    const validSortFields = [
        'title',
        'status',
        'priority',
        'createdAt',
        'updatedAt',
    ]
    const sortBy: string =
        sort.sortBy && validSortFields.includes(sort.sortBy)
            ? sort.sortBy
            : 'createdAt'
    const sortOrder = sort.sortOrder === 'asc' ? 'asc' : 'desc'

    // Build where clause
    const where: any = { projectId }

    // Build search where clause (case-insensitive partial match on title and description)
    // If title filter is provided, only search in description to avoid conflicting filters
    if (search) {
        if (filters.title) {
            // If title filter exists, only search in description
            where.description = {
                contains: search,
                mode: 'insensitive' as const,
            }
        } else {
            // Search in both title and description
            where.OR = [
                {
                    title: {
                        contains: search,
                        mode: 'insensitive' as const,
                    },
                },
                {
                    description: {
                        contains: search,
                        mode: 'insensitive' as const,
                    },
                },
            ]
        }
    }

    // Build filter where clause
    if (filters.title) {
        where.title = filters.title
    }

    if (filters.status) {
        where.status = filters.status
    }

    if (filters.priority) {
        where.priority = filters.priority
    }

    // Assignment filters - mutually exclusive (assignedToId takes precedence)
    if (filters.assignedToId) {
        where.assignedToId = filters.assignedToId
    } else if (filters.unassigned === true) {
        where.assignedToId = null
    } else if (filters.unassigned === false) {
        where.assignedToId = { not: null }
    }

    if (filters.createdById) {
        where.createdById = filters.createdById
    }

    if (filters.createdAfter) {
        const createdAfterDate = new Date(filters.createdAfter)
        if (!isNaN(createdAfterDate.getTime())) {
            where.createdAt = {
                ...where.createdAt,
                gte: createdAfterDate,
            }
        }
    }

    if (filters.createdBefore) {
        const createdBeforeDate = new Date(filters.createdBefore)
        if (!isNaN(createdBeforeDate.getTime())) {
            where.createdAt = {
                ...where.createdAt,
                lte: createdBeforeDate,
            }
        }
    }

    if (filters.updatedAfter) {
        const updatedAfterDate = new Date(filters.updatedAfter)
        if (!isNaN(updatedAfterDate.getTime())) {
            where.updatedAt = {
                ...where.updatedAt,
                gte: updatedAfterDate,
            }
        }
    }

    if (filters.updatedBefore) {
        const updatedBeforeDate = new Date(filters.updatedBefore)
        if (!isNaN(updatedBeforeDate.getTime())) {
            where.updatedAt = {
                ...where.updatedAt,
                lte: updatedBeforeDate,
            }
        }
    }

    // Build include clause with default includes (project, assignedTo, createdBy)
    // The include parameter allows selective inclusion/exclusion for performance optimization
    const validIncludes = ['comments', 'project', 'assignedTo', 'createdBy']
    const includeSet = includeParams
        ? includeParams.filter((inc) => validIncludes.includes(inc))
        : ['project', 'assignedTo', 'createdBy'] // Default includes commonly needed fields

    const include: any = {}

    if (includeSet.includes('project')) {
        include.project = {
            select: {
                id: true,
                name: true,
            },
        }
    }

    if (includeSet.includes('assignedTo')) {
        include.assignedTo = {
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
            },
        }
    }

    if (includeSet.includes('createdBy')) {
        include.createdBy = {
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
            },
        }
    }

    if (includeSet.includes('comments')) {
        include.comments = true
    }

    // Build orderBy clause
    const orderBy: any = {}
    orderBy[sortBy] = sortOrder

    const [tasks, total] = await Promise.all([
        prisma.task.findMany({
            where,
            include: Object.keys(include).length > 0 ? include : undefined,
            orderBy,
            skip,
            take: limit,
        }),
        prisma.task.count({
            where,
        }),
    ])

    return {
        data: tasks,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    }
}

/**
 * Retrieves a task by ID with access control.
 *
 * Verifies the user has access to the project containing the task before returning it.
 * Includes related entities (project, assignedTo, createdBy) by default.
 */
export async function getTaskById(
    taskId: string,
    userId: string,
    userRole: string
) {
    const task = await prisma.task.findUnique({
        where: { id: taskId },
        include: {
            project: {
                select: {
                    id: true,
                    name: true,
                },
            },
            assignedTo: {
                select: {
                    id: true,
                    email: true,
                    name: true,
                    role: true,
                },
            },
            createdBy: {
                select: {
                    id: true,
                    email: true,
                    name: true,
                    role: true,
                },
            },
        },
    })

    if (!task) {
        throw new Error('Task not found')
    }

    // Verify user has access to the project containing this task
    const isMember = await isProjectMember(task.projectId, userId, userRole)
    if (!isMember) {
        throw new Error('Access denied')
    }

    return task
}

/**
 * Updates a task.
 *
 * Verifies user has access to the project before allowing updates.
 * All project members can update tasks (not restricted to owners).
 */
export async function updateTask(
    taskId: string,
    data: UpdateTaskInput,
    userId: string,
    userRole: string
) {
    const task = await prisma.task.findUnique({
        where: { id: taskId },
    })

    if (!task) {
        throw new Error('Task not found')
    }

    const isMember = await isProjectMember(task.projectId, userId, userRole)
    if (!isMember) {
        throw new Error('Access denied')
    }

    const validated = updateTaskSchema.parse(data)

    const updatedTask = await prisma.task.update({
        where: { id: taskId },
        data: validated,
        include: {
            project: {
                select: {
                    id: true,
                    name: true,
                },
            },
            assignedTo: {
                select: {
                    id: true,
                    email: true,
                    name: true,
                    role: true,
                },
            },
            createdBy: {
                select: {
                    id: true,
                    email: true,
                    name: true,
                    role: true,
                },
            },
        },
    })

    return updatedTask
}

/**
 * Deletes a task.
 *
 * Restricted to project owners only (not all members can delete).
 * This prevents accidental task deletion by regular members.
 */
export async function deleteTask(
    taskId: string,
    userId: string,
    userRole: string
) {
    const task = await prisma.task.findUnique({
        where: { id: taskId },
    })

    if (!task) {
        throw new Error('Task not found')
    }

    const isOwner = await isProjectOwner(task.projectId, userId, userRole)
    if (!isOwner) {
        throw new Error('Access denied')
    }

    await prisma.task.delete({
        where: { id: taskId },
    })
}
