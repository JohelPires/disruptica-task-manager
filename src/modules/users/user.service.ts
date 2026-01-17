import { prisma } from '../../config/prisma'

type GetAllUsersOptions = {
    page?: number
    limit?: number
    search?: string
    filters?: {
        name?: string
        email?: string
        role?: 'owner' | 'member'
        createdAfter?: string
        createdBefore?: string
        updatedAfter?: string
        updatedBefore?: string
    }
    sort?: {
        sortBy?: string
        sortOrder?: 'asc' | 'desc'
    }
    fields?: string
}

export async function getAllUsers(options: GetAllUsersOptions = {}) {
    const {
        page = 1,
        limit = 10,
        search,
        filters = {},
        sort = {},
        fields,
    } = options

    const skip = (page - 1) * limit

    // Build search where clause (case-insensitive partial match on name and email)
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
                      email: {
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

    if (filters.email) {
        filterWhere.email = filters.email
    }

    if (filters.role) {
        if (filters.role === 'owner' || filters.role === 'member') {
            filterWhere.role = filters.role
        }
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

    // Combine all where clauses
    const whereArray: any[] = []

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
            : undefined

    // Build sort clause
    const validSortFields = ['name', 'email', 'createdAt', 'updatedAt']
    const sortBy = validSortFields.includes(sort.sortBy || '')
        ? (sort.sortBy as 'name' | 'email' | 'createdAt' | 'updatedAt')
        : 'createdAt'
    const sortOrder = sort.sortOrder === 'asc' ? 'asc' : 'desc'

    const orderBy = {
        [sortBy]: sortOrder,
    }

    // Build field selection
    const validFields = [
        'id',
        'name',
        'email',
        'role',
        'createdAt',
        'updatedAt',
    ]
    let selectFields: any = {
        id: true,
        name: true,
        email: true,
    }

    if (fields) {
        const requestedFields = fields
            .split(',')
            .map((f) => f.trim())
            .filter((f) => validFields.includes(f))

        // Always include 'id'
        if (!requestedFields.includes('id')) {
            requestedFields.push('id')
        }

        selectFields = requestedFields.reduce((acc, field) => {
            acc[field] = true
            return acc
        }, {} as Record<string, boolean>)
    }

    const [users, total] = await Promise.all([
        prisma.user.findMany({
            where,
            select: selectFields,
            orderBy,
            skip,
            take: limit,
        }),
        prisma.user.count({
            where,
        }),
    ])

    const totalPages = Math.ceil(total / limit)

    return {
        users,
        pagination: {
            page,
            limit,
            total,
            totalPages,
        },
    }
}

export async function getUserById(userId: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            createdAt: true,
            updatedAt: true,
        },
    })

    if (!user) {
        throw new Error('User not found')
    }

    return user
}
