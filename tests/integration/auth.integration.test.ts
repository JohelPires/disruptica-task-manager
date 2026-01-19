import request from 'supertest';
import app from '../../src/app';
import { prisma } from '../../src/config/prisma';

describe('Auth Integration', () => {
  beforeEach(async () => {
    await prisma.comment.deleteMany();
    await prisma.task.deleteMany();
    await prisma.projectMember.deleteMany();
    await prisma.project.deleteMany();
    await prisma.user.deleteMany();
  });

  it('should register and login successfully', async () => {
    const registerResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      });

    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body).toHaveProperty('user');
    expect(registerResponse.body).toHaveProperty('token');
    expect(registerResponse.body.user.email).toBe('test@example.com');

    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123',
      });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body).toHaveProperty('user');
    expect(loginResponse.body).toHaveProperty('token');
    expect(loginResponse.body.user.email).toBe('test@example.com');
  });
});

