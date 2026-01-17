import { prisma } from '../../config/prisma';
import { z } from 'zod';

const createProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

const updateProjectSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
});

const addMemberSchema = z.object({
  userId: z.string().uuid(),
  role: z.string().min(1),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;

export class ProjectService {
  async createProject(data: CreateProjectInput, ownerId: string) {
    const validated = createProjectSchema.parse(data);

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
    });

    return project;
  }

  async getProjects(
    userId: string,
    userRole: string,
    includeOptions?: { owner?: boolean; members?: boolean },
    page: number = 1,
    limit: number = 10
  ) {
    const includeOwner = includeOptions?.owner ?? false;
    const includeMembers = includeOptions?.members ?? false;

    const include: any = {};
    if (includeOwner) {
      include.owner = {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      };
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
      };
    }

    const skip = (page - 1) * limit;
    const where = userRole === 'owner'
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
        };

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        ...(Object.keys(include).length > 0 ? { include } : {}),
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.project.count({
        where,
      }),
    ]);

    return {
      data: projects,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getProjectById(projectId: string, userId: string, userRole: string) {
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
    });

    if (!project) {
      throw new Error('Project not found');
    }

    if (userRole !== 'owner' && project.ownerId !== userId) {
      const isMember = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId,
            userId,
          },
        },
      });

      if (!isMember) {
        throw new Error('Access denied');
      }
    }

    return project;
  }

  async updateProject(projectId: string, data: UpdateProjectInput) {
    const validated = updateProjectSchema.parse(data);

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
    });

    return project;
  }

  async deleteProject(projectId: string) {
    await prisma.project.delete({
      where: { id: projectId },
    });
  }

  async addMember(projectId: string, data: AddMemberInput) {
    const validated = addMemberSchema.parse(data);

    const existingMember = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: validated.userId,
        },
      },
    });

    if (existingMember) {
      throw new Error('User is already a member of this project');
    }

    const user = await prisma.user.findUnique({
      where: { id: validated.userId },
    });

    if (!user) {
      throw new Error('User not found');
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
    });

    return member;
  }

  async removeMember(projectId: string, userId: string) {
    const member = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    });

    if (!member) {
      throw new Error('Member not found in this project');
    }

    await prisma.projectMember.delete({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    });
  }

  async isProjectOwner(projectId: string, userId: string, userRole: string): Promise<boolean> {
    if (userRole === 'owner') {
      return true;
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { ownerId: true },
    });

    return project?.ownerId === userId;
  }

  async isProjectMember(projectId: string, userId: string, userRole: string): Promise<boolean> {
    if (userRole === 'owner') {
      return true;
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { ownerId: true },
    });

    if (project?.ownerId === userId) {
      return true;
    }

    const member = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    });

    return !!member;
  }
}

