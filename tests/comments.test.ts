import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/prisma';
import { hashPassword } from '../src/utils/password';
import { generateToken } from '../src/utils/jwt';

describe('Comments API', () => {
  let ownerToken: string;
  let memberToken: string;
  let member2Token: string;
  let ownerId: string;
  let memberId: string;
  let member2Id: string;
  let projectId: string;
  let taskId: string;

  beforeEach(async () => {
    await prisma.comment.deleteMany();
    await prisma.task.deleteMany();
    await prisma.projectMember.deleteMany();
    await prisma.project.deleteMany();
    await prisma.user.deleteMany();

    const owner = await prisma.user.create({
      data: {
        email: 'owner@example.com',
        password: await hashPassword('password123'),
        name: 'Global Owner',
        role: 'owner',
      },
    });

    const member = await prisma.user.create({
      data: {
        email: 'member@example.com',
        password: await hashPassword('password123'),
        name: 'Member User',
        role: 'member',
      },
    });

    const member2 = await prisma.user.create({
      data: {
        email: 'member2@example.com',
        password: await hashPassword('password123'),
        name: 'Member User 2',
        role: 'member',
      },
    });

    ownerId = owner.id;
    memberId = member.id;
    member2Id = member2.id;

    ownerToken = generateToken({
      userId: owner.id,
      email: owner.email,
      role: owner.role,
    });

    memberToken = generateToken({
      userId: member.id,
      email: member.email,
      role: member.role,
    });

    member2Token = generateToken({
      userId: member2.id,
      email: member2.email,
      role: member2.role,
    });

    const project = await prisma.project.create({
      data: {
        name: 'Test Project',
        ownerId: memberId,
      },
    });
    projectId = project.id;

    const task = await prisma.task.create({
      data: {
        title: 'Test Task',
        projectId,
        createdById: memberId,
      },
    });
    taskId = task.id;
  });

  describe('POST /tasks/:taskId/comments', () => {
    it('should create comment by project owner', async () => {
      const response = await request(app)
        .post(`/tasks/${taskId}/comments`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          content: 'Test Comment',
        });

      expect(response.status).toBe(201);
      expect(response.body.comment.content).toBe('Test Comment');
      expect(response.body.comment.authorId).toBe(memberId);
    });

    it('should create comment by project member', async () => {
      await prisma.projectMember.create({
        data: {
          projectId,
          userId: member2Id,
          role: 'developer',
        },
      });

      const response = await request(app)
        .post(`/tasks/${taskId}/comments`)
        .set('Authorization', `Bearer ${member2Token}`)
        .send({
          content: 'Member Comment',
        });

      expect(response.status).toBe(201);
    });

    it('should create comment by global owner', async () => {
      const response = await request(app)
        .post(`/tasks/${taskId}/comments`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          content: 'Owner Comment',
        });

      expect(response.status).toBe(201);
    });

    it('should not create comment by non-member', async () => {
      const response = await request(app)
        .post(`/tasks/${taskId}/comments`)
        .set('Authorization', `Bearer ${member2Token}`)
        .send({
          content: 'Unauthorized Comment',
        });

      expect(response.status).toBe(403);
    });
  });

  describe('GET /tasks/:taskId/comments', () => {
    beforeEach(async () => {
      await prisma.comment.create({
        data: {
          content: 'Comment 1',
          taskId,
          authorId: memberId,
        },
      });

      await prisma.comment.create({
        data: {
          content: 'Comment 2',
          taskId,
          authorId: memberId,
        },
      });
    });

    it('should get comments by project owner', async () => {
      const response = await request(app)
        .get(`/tasks/${taskId}/comments`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(response.status).toBe(200);
      expect(response.body.comments.length).toBe(2);
    });

    it('should get comments by project member', async () => {
      await prisma.projectMember.create({
        data: {
          projectId,
          userId: member2Id,
          role: 'developer',
        },
      });

      const response = await request(app)
        .get(`/tasks/${taskId}/comments`)
        .set('Authorization', `Bearer ${member2Token}`);

      expect(response.status).toBe(200);
      expect(response.body.comments.length).toBe(2);
    });

    it('should not get comments by non-member', async () => {
      const response = await request(app)
        .get(`/tasks/${taskId}/comments`)
        .set('Authorization', `Bearer ${member2Token}`);

      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /comments/:id', () => {
    let commentId: string;
    let comment2Id: string;

    beforeEach(async () => {
      const comment = await prisma.comment.create({
        data: {
          content: 'Comment by Owner',
          taskId,
          authorId: memberId,
        },
      });
      commentId = comment.id;

      await prisma.projectMember.create({
        data: {
          projectId,
          userId: member2Id,
          role: 'developer',
        },
      });

      const comment2 = await prisma.comment.create({
        data: {
          content: 'Comment by Member',
          taskId,
          authorId: member2Id,
        },
      });
      comment2Id = comment2.id;
    });

    it('should delete own comment', async () => {
      const response = await request(app)
        .delete(`/comments/${commentId}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(response.status).toBe(204);

      const comment = await prisma.comment.findUnique({
        where: { id: commentId },
      });
      expect(comment).toBeNull();
    });

    it('should delete comment by project owner', async () => {
      const response = await request(app)
        .delete(`/comments/${comment2Id}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(response.status).toBe(204);
    });

    it('should delete comment by global owner', async () => {
      const response = await request(app)
        .delete(`/comments/${commentId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(204);
    });

    it('should not delete comment by other member', async () => {
      const response = await request(app)
        .delete(`/comments/${commentId}`)
        .set('Authorization', `Bearer ${member2Token}`);

      expect(response.status).toBe(403);
    });
  });
});

