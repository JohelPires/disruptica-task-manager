import { prisma } from '../../config/prisma';
import { isProjectMember, isProjectOwner } from '../projects/project.service';
import { z } from 'zod';

const createCommentSchema = z.object({
  content: z.string().min(1),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;

export async function createComment(taskId: string, data: CreateCommentInput, userId: string, userRole: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
  });

  if (!task) {
    throw new Error('Task not found');
  }

  const isMember = await isProjectMember(task.projectId, userId, userRole);
  if (!isMember) {
    throw new Error('Access denied');
  }

  const validated = createCommentSchema.parse(data);

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
  });

  return comment;
}

export async function getCommentsByTask(
  taskId: string,
  userId: string,
  userRole: string,
  page: number = 1,
  limit: number = 10
) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
  });

  if (!task) {
    throw new Error('Task not found');
  }

  const isMember = await isProjectMember(task.projectId, userId, userRole);
  if (!isMember) {
    throw new Error('Access denied');
  }

  const skip = (page - 1) * limit;

  const [comments, total] = await Promise.all([
    prisma.comment.findMany({
      where: { taskId },
      include: {
        author: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
      skip,
      take: limit,
    }),
    prisma.comment.count({
      where: { taskId },
    }),
  ]);

  return {
    data: comments,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function deleteComment(commentId: string, userId: string, userRole: string) {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    include: {
      task: {
        select: {
          projectId: true,
        },
      },
    },
  });

  if (!comment) {
    throw new Error('Comment not found');
  }

  const isProjectOwnerCheck = await isProjectOwner(
    comment.task.projectId,
    userId,
    userRole
  );

  if (comment.authorId !== userId && !isProjectOwnerCheck) {
    throw new Error('Access denied');
  }

  await prisma.comment.delete({
    where: { id: commentId },
  });
}
