import { prisma } from '../../config/prisma'

export async function getAllUsers(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit

    const [users, total] = await Promise.all([
        prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
            },
            skip,
            take: limit,
            orderBy: {
                createdAt: 'desc',
            },
        }),
        prisma.user.count(),
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
