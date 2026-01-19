import request from 'supertest';
import app from '../../src/app';
import { prisma } from '../../src/config/prisma';
import { hashPassword } from '../../src/utils/password';
import { generateToken } from '../../src/utils/jwt';

describe('Idempotency and Concurrency Tests', () => {
  let ownerToken: string;
  let memberToken: string;
  let ownerId: string;
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
        email: 'idempotency@example.com',
        password: await hashPassword('password123'),
        name: 'Idempotency Owner',
        role: 'owner',
      },
    });

    const member = await prisma.user.create({
      data: {
        email: 'member@idempotency.com',
        password: await hashPassword('password123'),
        name: 'Idempotency Member',
        role: 'member',
      },
    });

    ownerId = owner.id;

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
        name: 'Idempotency Project',
        ownerId: ownerId,
      },
    });
    projectId = project.id;

    const task = await prisma.task.create({
      data: {
        title: 'Idempotency Task',
        projectId: projectId,
        createdById: ownerId,
      },
    });
    taskId = task.id;
  });

  describe('Idempotency Key - Project Creation', () => {
    it('should return cached response for duplicate idempotency key', async () => {
      const idempotencyKey = `project-key-${Date.now()}`;

      // First request
      const firstResponse = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${ownerToken}`)
        .set('idempotency-key', idempotencyKey)
        .send({
          name: 'Idempotent Project',
          description: 'First request',
        });

      expect(firstResponse.status).toBe(201);
      expect(firstResponse.body.project).toHaveProperty('id');
      const projectId = firstResponse.body.project.id;

      // Second request with same key
      const secondResponse = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${ownerToken}`)
        .set('idempotency-key', idempotencyKey)
        .send({
          name: 'Idempotent Project',
          description: 'Second request (should be ignored)',
        });

      expect(secondResponse.status).toBe(200); // Cached response
      expect(secondResponse.body.project.id).toBe(projectId);
      expect(secondResponse.body.project.name).toBe('Idempotent Project');

      // Verify only one project was created
      const projects = await prisma.project.findMany({
        where: { name: 'Idempotent Project' },
      });
      expect(projects.length).toBe(1);
    });

    it('should allow different idempotency keys to create different resources', async () => {
      const key1 = `project-key-1-${Date.now()}`;
      const key2 = `project-key-2-${Date.now()}`;

      const response1 = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${ownerToken}`)
        .set('idempotency-key', key1)
        .send({
          name: 'Project 1',
        });

      const response2 = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${ownerToken}`)
        .set('idempotency-key', key2)
        .send({
          name: 'Project 2',
        });

      expect(response1.status).toBe(201);
      expect(response2.status).toBe(201);
      expect(response1.body.project.id).not.toBe(response2.body.project.id);

      const projects = await prisma.project.findMany({
        where: {
          name: {
            in: ['Project 1', 'Project 2'],
          },
        },
      });
      expect(projects.length).toBe(2);
    });
  });

  describe('Idempotency Key - Task Creation', () => {
    it('should return cached response for duplicate idempotency key', async () => {
      const idempotencyKey = `task-key-${Date.now()}`;

      // First request
      const firstResponse = await request(app)
        .post(`/api/v1/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .set('idempotency-key', idempotencyKey)
        .send({
          title: 'Idempotent Task',
          description: 'First request',
        });

      expect(firstResponse.status).toBe(201);
      expect(firstResponse.body.task).toHaveProperty('id');
      const taskId = firstResponse.body.task.id;

      // Second request with same key
      const secondResponse = await request(app)
        .post(`/api/v1/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .set('idempotency-key', idempotencyKey)
        .send({
          title: 'Idempotent Task',
          description: 'Second request (should be ignored)',
        });

      expect(secondResponse.status).toBe(200); // Cached response
      expect(secondResponse.body.task.id).toBe(taskId);

      // Verify only one task was created
      const tasks = await prisma.task.findMany({
        where: { title: 'Idempotent Task' },
      });
      expect(tasks.length).toBe(1);
    });

    it('should scope idempotency keys by project', async () => {
      const otherProject = await prisma.project.create({
        data: {
          name: 'Other Project',
          ownerId: ownerId,
        },
      });

      const idempotencyKey = `task-key-scoped-${Date.now()}`;

      // Create task in first project
      const response1 = await request(app)
        .post(`/api/v1/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .set('idempotency-key', idempotencyKey)
        .send({
          title: 'Scoped Task',
        });

      expect(response1.status).toBe(201);
      const taskId1 = response1.body.task.id;

      // Same key, different project - should create new task
      const response2 = await request(app)
        .post(`/api/v1/projects/${otherProject.id}/tasks`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .set('idempotency-key', idempotencyKey)
        .send({
          title: 'Scoped Task',
        });

      expect(response2.status).toBe(201);
      expect(response2.body.task.id).not.toBe(taskId1);
    });
  });

  describe('Idempotency Key - Comment Creation', () => {
    it('should return cached response for duplicate idempotency key', async () => {
      const idempotencyKey = `comment-key-${Date.now()}`;

      // First request
      const firstResponse = await request(app)
        .post(`/api/v1/tasks/${taskId}/comments`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .set('idempotency-key', idempotencyKey)
        .send({
          content: 'Idempotent Comment',
        });

      expect(firstResponse.status).toBe(201);
      expect(firstResponse.body.comment).toHaveProperty('id');
      const commentId = firstResponse.body.comment.id;

      // Second request with same key
      const secondResponse = await request(app)
        .post(`/api/v1/tasks/${taskId}/comments`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .set('idempotency-key', idempotencyKey)
        .send({
          content: 'Idempotent Comment (duplicate)',
        });

      expect(secondResponse.status).toBe(200); // Cached response
      expect(secondResponse.body.comment.id).toBe(commentId);

      // Verify only one comment was created
      const comments = await prisma.comment.findMany({
        where: { content: 'Idempotent Comment' },
      });
      expect(comments.length).toBe(1);
    });
  });

  describe('Concurrent Requests with Same Idempotency Key', () => {
    it('should handle concurrent requests with same idempotency key for project creation', async () => {
      const idempotencyKey = `concurrent-project-${Date.now()}`;

      // Send 10 concurrent requests with the same idempotency key
      const promises = Array.from({ length: 10 }, () =>
        request(app)
          .post('/api/v1/projects')
          .set('Authorization', `Bearer ${ownerToken}`)
          .set('idempotency-key', idempotencyKey)
          .send({
            name: 'Concurrent Project',
            description: 'Concurrent request',
          })
      );

      const responses = await Promise.all(promises);

      // All should succeed (either 201 or 200 for cached)
      const statusCodes = responses.map((r) => r.status);
      expect(statusCodes.every((code) => code === 201 || code === 200)).toBe(true);

      // Only one should be 201 (the first one)
      const createdCount = statusCodes.filter((code) => code === 201).length;
      expect(createdCount).toBe(1);

      // All responses should have the same project ID
      const projectIds = responses
        .map((r) => r.body.project?.id)
        .filter((id) => id !== undefined);
      const uniqueIds = new Set(projectIds);
      expect(uniqueIds.size).toBe(1);

      // Verify only one project was created
      const projects = await prisma.project.findMany({
        where: { name: 'Concurrent Project' },
      });
      expect(projects.length).toBe(1);
    });

    it('should handle concurrent requests with same idempotency key for task creation', async () => {
      const idempotencyKey = `concurrent-task-${Date.now()}`;

      // Send 10 concurrent requests with the same idempotency key
      const promises = Array.from({ length: 10 }, () =>
        request(app)
          .post(`/api/v1/projects/${projectId}/tasks`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .set('idempotency-key', idempotencyKey)
          .send({
            title: 'Concurrent Task',
            description: 'Concurrent request',
          })
      );

      const responses = await Promise.all(promises);

      // All should succeed (either 201 or 200 for cached)
      const statusCodes = responses.map((r) => r.status);
      expect(statusCodes.every((code) => code === 201 || code === 200)).toBe(true);

      // Only one should be 201 (the first one)
      const createdCount = statusCodes.filter((code) => code === 201).length;
      expect(createdCount).toBe(1);

      // All responses should have the same task ID
      const taskIds = responses
        .map((r) => r.body.task?.id)
        .filter((id) => id !== undefined);
      const uniqueIds = new Set(taskIds);
      expect(uniqueIds.size).toBe(1);

      // Verify only one task was created
      const tasks = await prisma.task.findMany({
        where: { title: 'Concurrent Task' },
      });
      expect(tasks.length).toBe(1);
    });

    it('should handle concurrent requests with same idempotency key for comment creation', async () => {
      const idempotencyKey = `concurrent-comment-${Date.now()}`;

      // Send 10 concurrent requests with the same idempotency key
      const promises = Array.from({ length: 10 }, () =>
        request(app)
          .post(`/api/v1/tasks/${taskId}/comments`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .set('idempotency-key', idempotencyKey)
          .send({
            content: 'Concurrent Comment',
          })
      );

      const responses = await Promise.all(promises);

      // All should succeed (either 201 or 200 for cached)
      const statusCodes = responses.map((r) => r.status);
      expect(statusCodes.every((code) => code === 201 || code === 200)).toBe(true);

      // Only one should be 201 (the first one)
      const createdCount = statusCodes.filter((code) => code === 201).length;
      expect(createdCount).toBe(1);

      // All responses should have the same comment ID
      const commentIds = responses
        .map((r) => r.body.comment?.id)
        .filter((id) => id !== undefined);
      const uniqueIds = new Set(commentIds);
      expect(uniqueIds.size).toBe(1);

      // Verify only one comment was created
      const comments = await prisma.comment.findMany({
        where: { content: 'Concurrent Comment' },
      });
      expect(comments.length).toBe(1);
    });
  });

  describe('Idempotency Key Scoping by User', () => {
    it('should allow same idempotency key for different users', async () => {
      const idempotencyKey = `user-scoped-${Date.now()}`;

      // Owner creates project
      const ownerResponse = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${ownerToken}`)
        .set('idempotency-key', idempotencyKey)
        .send({
          name: 'Owner Project',
        });

      expect(ownerResponse.status).toBe(201);
      const ownerProjectId = ownerResponse.body.project.id;

      // Member creates project with same key (should work, different user)
      const memberResponse = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${memberToken}`)
        .set('idempotency-key', idempotencyKey)
        .send({
          name: 'Member Project',
        });

      expect(memberResponse.status).toBe(201);
      expect(memberResponse.body.project.id).not.toBe(ownerProjectId);

      // Verify both projects exist
      const projects = await prisma.project.findMany({
        where: {
          name: {
            in: ['Owner Project', 'Member Project'],
          },
        },
      });
      expect(projects.length).toBe(2);
    });
  });

  describe('Idempotency Key - Error Responses', () => {
    it('should not cache error responses (400)', async () => {
      const idempotencyKey = `error-key-${Date.now()}`;

      // First request with invalid data
      const firstResponse = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${ownerToken}`)
        .set('idempotency-key', idempotencyKey)
        .send({}); // Missing required field

      expect(firstResponse.status).toBe(400);

      // Second request with valid data - should proceed normally
      const secondResponse = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${ownerToken}`)
        .set('idempotency-key', idempotencyKey)
        .send({
          name: 'Valid Project',
        });

      expect(secondResponse.status).toBe(201);
    });

    it('should not cache error responses (403)', async () => {
      const idempotencyKey = `error-403-key-${Date.now()}`;

      // Member tries to create task in project they don't have access to
      const firstResponse = await request(app)
        .post(`/api/v1/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${memberToken}`)
        .set('idempotency-key', idempotencyKey)
        .send({
          title: 'Unauthorized Task',
        });

      expect(firstResponse.status).toBe(403);

      // Add member to project
      await prisma.projectMember.create({
        data: {
          projectId: projectId,
          userId: (await prisma.user.findUnique({ where: { email: 'member@idempotency.com' } }))!.id,
          role: 'developer',
        },
      });

      // Second request with same key - should proceed normally (not cached)
      const secondResponse = await request(app)
        .post(`/api/v1/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${memberToken}`)
        .set('idempotency-key', idempotencyKey)
        .send({
          title: 'Authorized Task',
        });

      expect(secondResponse.status).toBe(201);
    });
  });

  describe('Idempotency Key - Response Consistency', () => {
    it('should return consistent response data for cached responses', async () => {
      const idempotencyKey = `consistent-key-${Date.now()}`;

      // First request
      const firstResponse = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${ownerToken}`)
        .set('idempotency-key', idempotencyKey)
        .send({
          name: 'Consistent Project',
          description: 'Test description',
        });

      expect(firstResponse.status).toBe(201);
      const firstProject = firstResponse.body.project;

      // Second request - should return same data
      const secondResponse = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${ownerToken}`)
        .set('idempotency-key', idempotencyKey)
        .send({
          name: 'Different Name', // Should be ignored
          description: 'Different description', // Should be ignored
        });

      expect(secondResponse.status).toBe(200);
      expect(secondResponse.body.project.id).toBe(firstProject.id);
      expect(secondResponse.body.project.name).toBe(firstProject.name);
      expect(secondResponse.body.project.description).toBe(firstProject.description);
    });
  });
});

