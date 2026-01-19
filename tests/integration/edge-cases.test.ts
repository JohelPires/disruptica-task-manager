import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../src/app';
import { prisma } from '../../src/config/prisma';
import { hashPassword } from '../../src/utils/password';
import { generateToken } from '../../src/utils/jwt';
import { env } from '../../src/config/env';

describe('Edge Cases and Failure Modes', () => {
  let ownerToken: string;
  let memberToken: string;
  let ownerId: string;
  let memberId: string;
  let projectId: string;
  let taskId: string;

  beforeEach(async () => {
    await prisma.comment.deleteMany();
    await prisma.task.deleteMany();
    await prisma.projectMember.deleteMany();
    await prisma.project.deleteMany();
    await prisma.idempotencyKey.deleteMany();
    await prisma.user.deleteMany();

    const owner = await prisma.user.create({
      data: {
        email: 'owner@example.com',
        password: await hashPassword('password123'),
        name: 'Owner',
        role: 'owner',
      },
    });

    const member = await prisma.user.create({
      data: {
        email: 'member@example.com',
        password: await hashPassword('password123'),
        name: 'Member',
        role: 'member',
      },
    });

    ownerId = owner.id;
    memberId = member.id;

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

    const project = await prisma.project.create({
      data: {
        name: 'Test Project',
        ownerId: ownerId,
      },
    });
    projectId = project.id;

    const task = await prisma.task.create({
      data: {
        title: 'Test Task',
        projectId: projectId,
        createdById: ownerId,
      },
    });
    taskId = task.id;
  });

  describe('Invalid UUIDs in Path Parameters', () => {
    it('should return 400 for invalid project UUID', async () => {
      const response = await request(app)
        .get('/api/v1/projects/invalid-uuid')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    it('should return 400 for invalid task UUID', async () => {
      const response = await request(app)
        .get('/api/v1/tasks/invalid-uuid')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid user UUID in path', async () => {
      const response = await request(app)
        .get('/api/v1/users/invalid-uuid')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid comment UUID', async () => {
      const response = await request(app)
        .get('/api/v1/comments/invalid-uuid')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid project UUID when adding member', async () => {
      const response = await request(app)
        .post('/api/v1/projects/invalid-uuid/members')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          userId: memberId,
          role: 'developer',
        });

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid task UUID when creating comment', async () => {
      const response = await request(app)
        .post('/api/v1/tasks/invalid-uuid/comments')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          content: 'Test comment',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Missing or Malformed Request Bodies', () => {
    it('should return 400 for missing required fields in project creation', async () => {
      const response = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for missing required fields in task creation', async () => {
      const response = await request(app)
        .post(`/api/v1/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for missing required fields in comment creation', async () => {
      const response = await request(app)
        .post(`/api/v1/tasks/${taskId}/comments`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for malformed JSON body', async () => {
      const response = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${ownerToken}`)
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid email format in registration', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'not-an-email',
          password: 'password123',
          name: 'Test User',
        });

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid password length in registration', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: '123',
          name: 'Test User',
        });

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid task status', async () => {
      const response = await request(app)
        .post(`/api/v1/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          title: 'Test Task',
          status: 'invalid-status',
        });

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid task priority', async () => {
      const response = await request(app)
        .post(`/api/v1/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          title: 'Test Task',
          priority: 'invalid-priority',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Unauthorized and Forbidden Access Patterns', () => {
    it('should return 401 for missing authorization header', async () => {
      const response = await request(app).get('/api/v1/projects');
      expect(response.status).toBe(401);
    });

    it('should return 401 for invalid token format', async () => {
      const response = await request(app)
        .get('/api/v1/projects')
        .set('Authorization', 'InvalidFormat token');

      expect(response.status).toBe(401);
    });

    it('should return 401 for expired token', async () => {
      // Create a token with past expiration
      const expiredToken = jwt.sign(
        {
          userId: ownerId,
          email: 'owner@example.com',
          role: 'owner',
        },
        env.JWT_SECRET,
        { expiresIn: '1ms' } // Very short expiration
      );

      // Wait for token to expire
      await new Promise((resolve) => setTimeout(resolve, 10));

      const response = await request(app)
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
    });

    it('should return 403 for member accessing non-member project', async () => {
      const otherProject = await prisma.project.create({
        data: {
          name: 'Other Project',
          ownerId: ownerId,
        },
      });

      const response = await request(app)
        .get(`/api/v1/projects/${otherProject.id}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(response.status).toBe(403);
    });

    it('should return 403 for member trying to update project', async () => {
      await prisma.projectMember.create({
        data: {
          projectId: projectId,
          userId: memberId,
          role: 'developer',
        },
      });

      const response = await request(app)
        .put(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          name: 'Hacked Name',
        });

      expect(response.status).toBe(403);
    });

    it('should return 403 for member trying to delete project', async () => {
      await prisma.projectMember.create({
        data: {
          projectId: projectId,
          userId: memberId,
          role: 'developer',
        },
      });

      const response = await request(app)
        .delete(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(response.status).toBe(403);
    });

    it('should return 403 for member trying to add project members', async () => {
      await prisma.projectMember.create({
        data: {
          projectId: projectId,
          userId: memberId,
          role: 'developer',
        },
      });

      const newMember = await prisma.user.create({
        data: {
          email: 'newmember@example.com',
          password: await hashPassword('password123'),
          name: 'New Member',
        },
      });

      const response = await request(app)
        .post(`/api/v1/projects/${projectId}/members`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          userId: newMember.id,
          role: 'developer',
        });

      expect(response.status).toBe(403);
    });

    it('should return 403 for non-member trying to create task', async () => {
      const response = await request(app)
        .post(`/api/v1/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          title: 'Unauthorized Task',
        });

      expect(response.status).toBe(403);
    });

    it('should return 403 for non-member trying to view tasks', async () => {
      const response = await request(app)
        .get(`/api/v1/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(response.status).toBe(403);
    });

    it('should return 403 for non-member trying to create comment', async () => {
      const response = await request(app)
        .post(`/api/v1/tasks/${taskId}/comments`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          content: 'Unauthorized Comment',
        });

      expect(response.status).toBe(403);
    });

    it('should return 403 for member trying to delete another member comment', async () => {
      await prisma.projectMember.create({
        data: {
          projectId: projectId,
          userId: memberId,
          role: 'developer',
        },
      });

      const comment = await prisma.comment.create({
        data: {
          content: 'Owner Comment',
          taskId: taskId,
          authorId: ownerId,
        },
      });

      const response = await request(app)
        .delete(`/api/v1/comments/${comment.id}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('Non-existent Resources', () => {
    it('should return 404 for non-existent project', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/v1/projects/${fakeId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(404);
    });

    it('should return 404 for non-existent task', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/v1/tasks/${fakeId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(404);
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/v1/users/${fakeId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(404);
    });

    it('should return 404 for non-existent comment', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/v1/comments/${fakeId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(404);
    });

    it('should return 404 when updating non-existent project', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .put(`/api/v1/projects/${fakeId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Updated Name',
        });

      expect(response.status).toBe(404);
    });

    it('should return 404 when deleting non-existent task', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .delete(`/api/v1/tasks/${fakeId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('Race Conditions and Concurrent Operations', () => {
    it('should handle concurrent project creation attempts', async () => {
      const promises = Array.from({ length: 5 }, () =>
        request(app)
          .post('/api/v1/projects')
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({
            name: `Concurrent Project ${Date.now()}`,
          })
      );

      const responses = await Promise.all(promises);
      const successful = responses.filter((r) => r.status === 201);
      expect(successful.length).toBe(5);
    });

    it('should handle concurrent task creation attempts', async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        request(app)
          .post(`/api/v1/projects/${projectId}/tasks`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({
            title: `Concurrent Task ${i}`,
          })
      );

      const responses = await Promise.all(promises);
      const successful = responses.filter((r) => r.status === 201);
      expect(successful.length).toBe(10);

      // Verify all tasks were created
      const tasksResponse = await request(app)
        .get(`/api/v1/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(tasksResponse.body.tasks.length).toBeGreaterThanOrEqual(10);
    });

    it('should handle concurrent comment creation attempts', async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        request(app)
          .post(`/api/v1/tasks/${taskId}/comments`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({
            content: `Concurrent Comment ${i}`,
          })
      );

      const responses = await Promise.all(promises);
      const successful = responses.filter((r) => r.status === 201);
      expect(successful.length).toBe(10);
    });
  });

  describe('Invalid Idempotency Key Format', () => {
    it('should return 400 for empty idempotency key', async () => {
      const response = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${ownerToken}`)
        .set('idempotency-key', '')
        .send({
          name: 'Test Project',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_IDEMPOTENCY_KEY');
    });

    it('should return 400 for whitespace-only idempotency key', async () => {
      const response = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${ownerToken}`)
        .set('idempotency-key', '   ')
        .send({
          name: 'Test Project',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_IDEMPOTENCY_KEY');
    });

    it('should return 401 for idempotency key without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/projects')
        .set('idempotency-key', 'valid-key-123')
        .send({
          name: 'Test Project',
        });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });
});

