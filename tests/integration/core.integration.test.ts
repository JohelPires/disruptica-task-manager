import request from 'supertest';
import app from '../../src/app';
import { prisma } from '../../src/config/prisma';

describe('Core Integration', () => {
  beforeEach(async () => {
    await prisma.comment.deleteMany();
    await prisma.task.deleteMany();
    await prisma.projectMember.deleteMany();
    await prisma.project.deleteMany();
    await prisma.user.deleteMany();
  });

  it('should respond to health check', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status');
    expect(response.body.status).toBe('ok');
  });

  it('should create project and task in sequence', async () => {
    const registerResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'user@example.com',
        password: 'password123',
        name: 'Test User',
      });

    expect(registerResponse.status).toBe(201);
    const token = registerResponse.body.token;

    const projectResponse = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Test Project',
      });

    expect(projectResponse.status).toBe(201);
    expect(projectResponse.body.project).toHaveProperty('id');
    expect(projectResponse.body.project).toHaveProperty('name');
    const projectId = projectResponse.body.project.id;

    const taskResponse = await request(app)
      .post(`/api/v1/projects/${projectId}/tasks`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Test Task',
        description: 'Test Description',
        status: 'todo',
        priority: 'high',
      });

    expect(taskResponse.status).toBe(201);
    expect(taskResponse.body.task).toHaveProperty('id');
    expect(taskResponse.body.task).toHaveProperty('title');
    expect(taskResponse.body.task.projectId).toBe(projectId);
  });

  it('should reject unauthenticated request to protected endpoint', async () => {
    const response = await request(app)
      .post('/api/v1/projects')
      .send({
        name: 'Test Project',
      });

    expect(response.status).toBe(401);
  });
});

