import { prisma } from '../../config/prisma';
import { ProjectService } from '../projects/project.service';
import { z } from 'zod';

const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  assignedToId: z.string().uuid().optional(),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  assignedToId: z.string().uuid().optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

export class TaskService {
  private projectService: ProjectService;

  constructor() {
    this.projectService = new ProjectService();
  }

  async createTask(projectId: string, data: CreateTaskInput, userId: string, userRole: string) {
    const isMember = await this.projectService.isProjectMember(projectId, userId, userRole);
    if (!isMember) {
      throw new Error('Access denied');
    }

    const validated = createTaskSchema.parse(data);

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
    });

    return task;
  }

  async getTasksByProject(
    projectId: string,
    userId: string,
    userRole: string,
    page: number = 1,
    limit: number = 10
  ) {
    const isMember = await this.projectService.isProjectMember(projectId, userId, userRole);
    if (!isMember) {
      throw new Error('Access denied');
    }

    const skip = (page - 1) * limit;

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where: { projectId },
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
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.task.count({
        where: { projectId },
      }),
    ]);

    return {
      data: tasks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getTaskById(taskId: string, userId: string, userRole: string) {
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
    });

    if (!task) {
      throw new Error('Task not found');
    }

    const isMember = await this.projectService.isProjectMember(task.projectId, userId, userRole);
    if (!isMember) {
      throw new Error('Access denied');
    }

    return task;
  }

  async updateTask(taskId: string, data: UpdateTaskInput, userId: string, userRole: string) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new Error('Task not found');
    }

    const isMember = await this.projectService.isProjectMember(task.projectId, userId, userRole);
    if (!isMember) {
      throw new Error('Access denied');
    }

    const validated = updateTaskSchema.parse(data);

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
    });

    return updatedTask;
  }

  async deleteTask(taskId: string, userId: string, userRole: string) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new Error('Task not found');
    }

    const isOwner = await this.projectService.isProjectOwner(task.projectId, userId, userRole);
    if (!isOwner) {
      throw new Error('Access denied');
    }

    await prisma.task.delete({
      where: { id: taskId },
    });
  }
}

