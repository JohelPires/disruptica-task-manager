import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/prisma';
import { hashPassword } from '../src/utils/password';
import { generateToken } from '../src/utils/jwt';

describe('Projects API', () => {
  let ownerToken: string;
  let memberToken: string;
  let member2Token: string;
  let ownerId: string;
  let memberId: string;
  let member2Id: string;

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
  });

  describe('POST /projects', () => {
    it('should create a project', async () => {
      const response = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          name: 'Test Project',
          description: 'Test Description',
        });

      expect(response.status).toBe(201);
      expect(response.body.project.name).toBe('Test Project');
      expect(response.body.project.ownerId).toBe(memberId);
    });

    it('should require authentication', async () => {
      const response = await request(app).post('/api/v1/projects').send({
        name: 'Test Project',
      });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /projects', () => {
    beforeEach(async () => {
      await prisma.project.create({
        data: {
          name: 'Member Project',
          ownerId: memberId,
        },
      });

      await prisma.project.create({
        data: {
          name: 'Other Project',
          ownerId: member2Id,
        },
      });
    });

    it('should return all projects for global owner', async () => {
      const response = await request(app)
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.projects.length).toBe(2);
    });

    it('should return only accessible projects for member', async () => {
      const response = await request(app)
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${memberToken}`);

      expect(response.status).toBe(200);
      expect(response.body.projects.length).toBe(1);
      expect(response.body.projects[0].name).toBe('Member Project');
    });

    it('should include projects where user is a member', async () => {
      const project = await prisma.project.create({
        data: {
          name: 'Shared Project',
          ownerId: member2Id,
        },
      });

      await prisma.projectMember.create({
        data: {
          projectId: project.id,
          userId: memberId,
          role: 'developer',
        },
      });

      const response = await request(app)
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${memberToken}`);

      expect(response.status).toBe(200);
      expect(response.body.projects.length).toBe(2);
    });
  });

  describe('GET /projects/:id', () => {
    let projectId: string;

    beforeEach(async () => {
      const project = await prisma.project.create({
        data: {
          name: 'Test Project',
          ownerId: memberId,
        },
      });
      projectId = project.id;
    });

    it('should get project by id for owner', async () => {
      const response = await request(app)
        .get(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(response.status).toBe(200);
      expect(response.body.project.id).toBe(projectId);
    });

    it('should get project by id for global owner', async () => {
      const response = await request(app)
        .get(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
    });

    it('should get project by id for project member', async () => {
      await prisma.projectMember.create({
        data: {
          projectId,
          userId: member2Id,
          role: 'developer',
        },
      });

      const response = await request(app)
        .get(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${member2Token}`);

      expect(response.status).toBe(200);
    });

    it('should not get project for non-member', async () => {
      const response = await request(app)
        .get(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${member2Token}`);

      expect(response.status).toBe(403);
    });
  });

  describe('PUT /projects/:id', () => {
    let projectId: string;

    beforeEach(async () => {
      const project = await prisma.project.create({
        data: {
          name: 'Test Project',
          ownerId: memberId,
        },
      });
      projectId = project.id;
    });

    it('should update project by owner', async () => {
      const response = await request(app)
        .put(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          name: 'Updated Project',
        });

      expect(response.status).toBe(200);
      expect(response.body.project.name).toBe('Updated Project');
    });

    it('should update project by global owner', async () => {
      const response = await request(app)
        .put(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Updated by Owner',
        });

      expect(response.status).toBe(200);
    });

    it('should not update project by non-owner member', async () => {
      await prisma.projectMember.create({
        data: {
          projectId,
          userId: member2Id,
          role: 'developer',
        },
      });

      const response = await request(app)
        .put(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${member2Token}`)
        .send({
          name: 'Unauthorized Update',
        });

      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /projects/:id', () => {
    let projectId: string;

    beforeEach(async () => {
      const project = await prisma.project.create({
        data: {
          name: 'Test Project',
          ownerId: memberId,
        },
      });
      projectId = project.id;
    });

    it('should delete project by owner', async () => {
      const response = await request(app)
        .delete(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(response.status).toBe(204);

      const project = await prisma.project.findUnique({
        where: { id: projectId },
      });
      expect(project).toBeNull();
    });

    it('should delete project by global owner', async () => {
      const response = await request(app)
        .delete(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(204);
    });

    it('should not delete project by non-owner', async () => {
      const response = await request(app)
        .delete(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${member2Token}`);

      expect(response.status).toBe(403);
    });
  });

  describe('POST /projects/:id/members', () => {
    let projectId: string;

    beforeEach(async () => {
      const project = await prisma.project.create({
        data: {
          name: 'Test Project',
          ownerId: memberId,
        },
      });
      projectId = project.id;
    });

    it('should add member by project owner', async () => {
      const response = await request(app)
        .post(`/api/v1/projects/${projectId}/members`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          userId: member2Id,
          role: 'developer',
        });

      expect(response.status).toBe(201);
      expect(response.body.member.userId).toBe(member2Id);
    });

    it('should add member by global owner', async () => {
      const response = await request(app)
        .post(`/api/v1/projects/${projectId}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          userId: member2Id,
          role: 'developer',
        });

      expect(response.status).toBe(201);
    });

    it('should not add member by non-owner', async () => {
      const response = await request(app)
        .post(`/api/v1/projects/${projectId}/members`)
        .set('Authorization', `Bearer ${member2Token}`)
        .send({
          userId: ownerId,
          role: 'developer',
        });

      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /projects/:id/members/:userId', () => {
    let projectId: string;

    beforeEach(async () => {
      const project = await prisma.project.create({
        data: {
          name: 'Test Project',
          ownerId: memberId,
        },
      });
      projectId = project.id;

      await prisma.projectMember.create({
        data: {
          projectId,
          userId: member2Id,
          role: 'developer',
        },
      });
    });

    it('should remove member by project owner', async () => {
      const response = await request(app)
        .delete(`/api/v1/projects/${projectId}/members/${member2Id}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(response.status).toBe(204);

      const member = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId,
            userId: member2Id,
          },
        },
      });

      expect(member).toBeNull();
    });

    it('should remove member by global owner', async () => {
      const response = await request(app)
        .delete(`/api/v1/projects/${projectId}/members/${member2Id}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(204);
    });

    it('should not remove member by non-owner', async () => {
      const response = await request(app)
        .delete(`/api/v1/projects/${projectId}/members/${member2Id}`)
        .set('Authorization', `Bearer ${member2Token}`);

      expect(response.status).toBe(403);
    });
  });
});

