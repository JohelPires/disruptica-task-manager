import { prisma } from '../../config/prisma'
import { z } from 'zod'

const createProjectSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
})

const updateProjectSchema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
})

const addMemberSchema = z.object({
    userId: z.string().uuid(),
    role: z.string().min(1),
})

export type CreateProjectInput = z.infer<typeof createProjectSchema>
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>
export type AddMemberInput = z.infer<typeof addMemberSchema>

export async function createProject(data: CreateProjectInput, ownerId: string) {
    const validated = createProjectSchema.parse(data)

    const project = await prisma.project.create({
        data: {
            name: validated.name,
            description: validated.description,
            ownerId,
        },
        include: {
            owner: {
                select: {
                    id: true,
                    email: true,
                    name: true,
                    role: true,
                },
            },
            members: {
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            name: true,
                            role: true,
                        },
                    },
                },
            },
        },
    })

    return project
}

type GetProjectsOptions = {
    includeOptions?: { owner?: boolean; members?: boolean; tasks?: boolean }
    page?: number
    limit?: number
    search?: string
    filters?: {
        name?: string
        ownerId?: string
        createdAfter?: string
        createdBefore?: string
        updatedAfter?: string
        updatedBefore?: string
        myRole?: 'owner' | 'member'
    }
    sort?: {
        sortBy?: string
        sortOrder?: 'asc' | 'desc'
    }
}

export async function getProjects(
    userId: string,
    userRole: string,
    options: GetProjectsOptions = {}
) {
    const {
        includeOptions = {},
        page = 1,
        limit = 10,
        search,
        filters = {},
        sort = {},
    } = options

    const includeOwner = includeOptions.owner ?? false
    const includeMembers = includeOptions.members ?? false
    const includeTasks = includeOptions.tasks ?? false

    const include: any = {}
    if (includeOwner) {
        include.owner = {
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
            },
        }
    }
    if (includeMembers) {
        include.members = {
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        role: true,
                    },
                },
            },
        }
    }
    if (includeTasks) {
        include.tasks = {
            select: {
                id: true,
                title: true,
                description: true,
                status: true,
                priority: true,
                projectId: true,
                assignedToId: true,
                createdById: true,
                createdAt: true,
                updatedAt: true,
            },
        }
    }

    const skip = (page - 1) * limit

    // Build access control where clause
    const accessControlWhere =
        userRole === 'owner'
            ? undefined
            : {
                  OR: [
                      { ownerId: userId },
                      {
                          members: {
                              some: {
                                  userId,
                              },
                          },
                      },
                  ],
              }

    // Build search where clause (case-insensitive partial match on name and description)
    const searchWhere = search
        ? {
              OR: [
                  {
                      name: {
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
              ],
          }
        : undefined

    // Build filter where clause
    const filterWhere: any = {}

    if (filters.name) {
        filterWhere.name = filters.name
    }

    if (filters.ownerId) {
        filterWhere.ownerId = filters.ownerId
    }

    if (filters.createdAfter) {
        const createdAfterDate = new Date(filters.createdAfter)
        if (!isNaN(createdAfterDate.getTime())) {
            filterWhere.createdAt = {
                ...filterWhere.createdAt,
                gte: createdAfterDate,
            }
        }
    }

    if (filters.createdBefore) {
        const createdBeforeDate = new Date(filters.createdBefore)
        if (!isNaN(createdBeforeDate.getTime())) {
            filterWhere.createdAt = {
                ...filterWhere.createdAt,
                lte: createdBeforeDate,
            }
        }
    }

    if (filters.updatedAfter) {
        const updatedAfterDate = new Date(filters.updatedAfter)
        if (!isNaN(updatedAfterDate.getTime())) {
            filterWhere.updatedAt = {
                ...filterWhere.updatedAt,
                gte: updatedAfterDate,
            }
        }
    }

    if (filters.updatedBefore) {
        const updatedBeforeDate = new Date(filters.updatedBefore)
        if (!isNaN(updatedBeforeDate.getTime())) {
            filterWhere.updatedAt = {
                ...filterWhere.updatedAt,
                lte: updatedBeforeDate,
            }
        }
    }

    // Build myRole filter
    if (filters.myRole) {
        if (filters.myRole === 'owner') {
            // Override ownerId filter if myRole is 'owner'
            filterWhere.ownerId = userId
        } else if (filters.myRole === 'member') {
            filterWhere.members = {
                some: {
                    userId,
                },
            }
            // Exclude projects where user is owner when filtering by member role
            // Only set this if ownerId filter wasn't already set
            if (!filters.ownerId) {
                filterWhere.ownerId = {
                    not: userId,
                }
            } else {
                // If ownerId filter is set, ensure it's not the user's ID (required for member role)
                // This will be validated by the AND condition - both ownerId and the members condition must be true
            }
        }
    }

    // Combine all where clauses
    const whereArray: any[] = []

    if (accessControlWhere) {
        whereArray.push(accessControlWhere)
    }

    if (searchWhere) {
        whereArray.push(searchWhere)
    }

    if (Object.keys(filterWhere).length > 0) {
        whereArray.push(filterWhere)
    }

    const where =
        whereArray.length > 0
            ? {
                  AND: whereArray,
              }
            : accessControlWhere

    // Build sort clause
    const validSortFields = ['name', 'createdAt', 'updatedAt']
    const sortBy = validSortFields.includes(sort.sortBy || '')
        ? (sort.sortBy as 'name' | 'createdAt' | 'updatedAt')
        : 'createdAt'
    const sortOrder = sort.sortOrder === 'asc' ? 'asc' : 'desc'

    const orderBy = {
        [sortBy]: sortOrder,
    }

    const [projects, total] = await Promise.all([
        prisma.project.findMany({
            where,
            ...(Object.keys(include).length > 0 ? { include } : {}),
            orderBy,
            skip,
            take: limit,
        }),
        prisma.project.count({
            where,
        }),
    ])

    return {
        data: projects,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    }
}

export async function getProjectById(
    projectId: string,
    userId: string,
    userRole: string
) {
    const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
            owner: {
                select: {
                    id: true,
                    email: true,
                    name: true,
                    role: true,
                },
            },
            members: {
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            name: true,
                            role: true,
                        },
                    },
                },
            },
        },
    })

    if (!project) {
        throw new Error('Project not found')
    }

    if (userRole !== 'owner' && project.ownerId !== userId) {
        const isMember = await prisma.projectMember.findUnique({
            where: {
                projectId_userId: {
                    projectId,
                    userId,
                },
            },
        })

        if (!isMember) {
            throw new Error('Access denied')
        }
    }

    return project
}

export async function updateProject(
    projectId: string,
    data: UpdateProjectInput
) {
    const validated = updateProjectSchema.parse(data)

    const project = await prisma.project.update({
        where: { id: projectId },
        data: validated,
        include: {
            owner: {
                select: {
                    id: true,
                    email: true,
                    name: true,
                    role: true,
                },
            },
            members: {
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            name: true,
                            role: true,
                        },
                    },
                },
            },
        },
    })

    return project
}

export async function deleteProject(projectId: string) {
    await prisma.project.delete({
        where: { id: projectId },
    })
}

export async function addMember(projectId: string, data: AddMemberInput) {
    const validated = addMemberSchema.parse(data)

    const existingMember = await prisma.projectMember.findUnique({
        where: {
            projectId_userId: {
                projectId,
                userId: validated.userId,
            },
        },
    })

    if (existingMember) {
        throw new Error('User is already a member of this project')
    }

    const user = await prisma.user.findUnique({
        where: { id: validated.userId },
    })

    if (!user) {
        throw new Error('User not found')
    }

    const member = await prisma.projectMember.create({
        data: {
            projectId,
            userId: validated.userId,
            role: validated.role,
        },
        include: {
            user: {
                select: {
                    id: true,
                    email: true,
                    name: true,
                    role: true,
                },
            },
        },
    })

    return member
}

export async function removeMember(projectId: string, userId: string) {
    const member = await prisma.projectMember.findUnique({
        where: {
            projectId_userId: {
                projectId,
                userId,
            },
        },
    })

    if (!member) {
        throw new Error('Member not found in this project')
    }

    await prisma.projectMember.delete({
        where: {
            projectId_userId: {
                projectId,
                userId,
            },
        },
    })
}

export async function isProjectOwner(
    projectId: string,
    userId: string,
    userRole: string
): Promise<boolean> {
    if (userRole === 'owner') {
        return true
    }

    const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { ownerId: true },
    })

    return project?.ownerId === userId
}

export async function isProjectMember(
    projectId: string,
    userId: string,
    userRole: string
): Promise<boolean> {
    if (userRole === 'owner') {
        return true
    }

    const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { ownerId: true },
    })

    if (project?.ownerId === userId) {
        return true
    }

    const member = await prisma.projectMember.findUnique({
        where: {
            projectId_userId: {
                projectId,
                userId,
            },
        },
    })

    return !!member
}
