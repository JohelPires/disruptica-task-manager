import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/prisma';
import { hashPassword } from '../src/utils/password';
import { generateToken } from '../src/utils/jwt';

describe('Tasks API', () => {
  let ownerToken: string;
  let memberToken: string;
  let member2Token: string;
  // let ownerId: string;
  let memberId: string;
  let member2Id: string;
  let projectId: string;
  // let project2Id: string;

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

    // ownerId = owner.id;
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

    const project2 = await prisma.project.create({
      data: {
        name: 'Other Project',
        ownerId: member2Id,
      },
    });
    // project2Id = project2.id;
  });

  describe('POST /projects/:projectId/tasks', () => {
    it('should create task by project owner', async () => {
      const response = await request(app)
        .post(`/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          title: 'Test Task',
          description: 'Test Description',
          status: 'todo',
          priority: 'high',
        });

      expect(response.status).toBe(201);
      expect(response.body.task.title).toBe('Test Task');
      expect(response.body.task.projectId).toBe(projectId);
    });

    it('should create task by project member', async () => {
      await prisma.projectMember.create({
        data: {
          projectId,
          userId: member2Id,
          role: 'developer',
        },
      });

      const response = await request(app)
        .post(`/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${member2Token}`)
        .send({
          title: 'Member Task',
        });

      expect(response.status).toBe(201);
    });

    it('should create task by global owner', async () => {
      const response = await request(app)
        .post(`/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          title: 'Owner Task',
        });

      expect(response.status).toBe(201);
    });

    it('should not create task by non-member', async () => {
      const response = await request(app)
        .post(`/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${member2Token}`)
        .send({
          title: 'Unauthorized Task',
        });

      expect(response.status).toBe(403);
    });
  });

  describe('GET /projects/:projectId/tasks', () => {
    beforeEach(async () => {
      await prisma.task.create({
        data: {
          title: 'Task 1',
          projectId,
          createdById: memberId,
        },
      });

      await prisma.task.create({
        data: {
          title: 'Task 2',
          projectId,
          createdById: memberId,
        },
      });
    });

    it('should get tasks by project owner', async () => {
      const response = await request(app)
        .get(`/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(response.status).toBe(200);
      expect(response.body.tasks.length).toBe(2);
    });

    it('should get tasks by project member', async () => {
      await prisma.projectMember.create({
        data: {
          projectId,
          userId: member2Id,
          role: 'developer',
        },
      });

      const response = await request(app)
        .get(`/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${member2Token}`);

      expect(response.status).toBe(200);
      expect(response.body.tasks.length).toBe(2);
    });

    it('should not get tasks by non-member', async () => {
      const response = await request(app)
        .get(`/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${member2Token}`);

      expect(response.status).toBe(403);
    });
  });

  describe('GET /tasks/:id', () => {
    let taskId: string;

    beforeEach(async () => {
      const task = await prisma.task.create({
        data: {
          title: 'Test Task',
          projectId,
          createdById: memberId,
        },
      });
      taskId = task.id;
    });

    it('should get task by project owner', async () => {
      const response = await request(app)
        .get(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(response.status).toBe(200);
      expect(response.body.task.id).toBe(taskId);
    });

    it('should get task by project member', async () => {
      await prisma.projectMember.create({
        data: {
          projectId,
          userId: member2Id,
          role: 'developer',
        },
      });

      const response = await request(app)
        .get(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${member2Token}`);

      expect(response.status).toBe(200);
    });

    it('should not get task by non-member', async () => {
      const response = await request(app)
        .get(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${member2Token}`);

      expect(response.status).toBe(403);
    });
  });

  describe('PUT /tasks/:id', () => {
    let taskId: string;

    beforeEach(async () => {
      const task = await prisma.task.create({
        data: {
          title: 'Test Task',
          projectId,
          createdById: memberId,
        },
      });
      taskId = task.id;
    });

    it('should update task by project owner', async () => {
      const response = await request(app)
        .put(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          title: 'Updated Task',
          status: 'in_progress',
        });

      expect(response.status).toBe(200);
      expect(response.body.task.title).toBe('Updated Task');
      expect(response.body.task.status).toBe('in_progress');
    });

    it('should update task by project member', async () => {
      await prisma.projectMember.create({
        data: {
          projectId,
          userId: member2Id,
          role: 'developer',
        },
      });

      const response = await request(app)
        .put(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${member2Token}`)
        .send({
          status: 'done',
        });

      expect(response.status).toBe(200);
    });

    it('should not update task by non-member', async () => {
      const response = await request(app)
        .put(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${member2Token}`)
        .send({
          title: 'Unauthorized Update',
        });

      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /tasks/:id', () => {
    let taskId: string;

    beforeEach(async () => {
      const task = await prisma.task.create({
        data: {
          title: 'Test Task',
          projectId,
          createdById: memberId,
        },
      });
      taskId = task.id;
    });

    it('should delete task by project owner', async () => {
      const response = await request(app)
        .delete(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(response.status).toBe(204);

      const task = await prisma.task.findUnique({
        where: { id: taskId },
      });
      expect(task).toBeNull();
    });

    it('should delete task by global owner', async () => {
      const response = await request(app)
        .delete(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(204);
    });

    it('should not delete task by project member', async () => {
      await prisma.projectMember.create({
        data: {
          projectId,
          userId: member2Id,
          role: 'developer',
        },
      });

      const response = await request(app)
        .delete(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${member2Token}`);

      expect(response.status).toBe(403);
    });
  });
});

