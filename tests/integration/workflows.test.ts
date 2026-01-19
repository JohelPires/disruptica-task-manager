import request from 'supertest';
import app from '../../src/app';
import { prisma } from '../../src/config/prisma';
import { hashPassword } from '../../src/utils/password';

describe('Integration Tests - Core Workflows', () => {
  beforeEach(async () => {
    await prisma.comment.deleteMany();
    await prisma.task.deleteMany();
    await prisma.projectMember.deleteMany();
    await prisma.project.deleteMany();
    await prisma.user.deleteMany();
  });

  describe('Complete Project Workflow', () => {
    it('should complete full workflow: register → create project → add members → create tasks → add comments', async () => {
      // Step 1: Register user
      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'owner@example.com',
          password: 'password123',
          name: 'Project Owner',
        });

      expect(registerResponse.status).toBe(201);
      expect(registerResponse.body).toHaveProperty('token');
      expect(registerResponse.body).toHaveProperty('user');
      const ownerToken = registerResponse.body.token;
      const ownerId = registerResponse.body.user.id;

      // Step 2: Register another user (member)
      const memberRegisterResponse = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'member@example.com',
          password: 'password123',
          name: 'Project Member',
        });

      expect(memberRegisterResponse.status).toBe(201);
      const memberId = memberRegisterResponse.body.user.id;

      // Step 3: Create project
      const projectResponse = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Integration Test Project',
          description: 'A project for integration testing',
        });

      expect(projectResponse.status).toBe(201);
      expect(projectResponse.body.project).toHaveProperty('id');
      expect(projectResponse.body.project.name).toBe('Integration Test Project');
      expect(projectResponse.body.project.ownerId).toBe(ownerId);
      const projectId = projectResponse.body.project.id;

      // Step 4: Add member to project
      const addMemberResponse = await request(app)
        .post(`/api/v1/projects/${projectId}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          userId: memberId,
          role: 'developer',
        });

      expect(addMemberResponse.status).toBe(201);
      expect(addMemberResponse.body.member.userId).toBe(memberId);

      // Verify member can see project
      const memberProjectsResponse = await request(app)
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${memberRegisterResponse.body.token}`);

      expect(memberProjectsResponse.status).toBe(200);
      expect(memberProjectsResponse.body.projects.length).toBe(1);
      expect(memberProjectsResponse.body.projects[0].id).toBe(projectId);

      // Step 5: Create task as owner
      const taskResponse = await request(app)
        .post(`/api/v1/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          title: 'Integration Test Task',
          description: 'A task created during integration testing',
          status: 'todo',
          priority: 'high',
        });

      expect(taskResponse.status).toBe(201);
      expect(taskResponse.body.task).toHaveProperty('id');
      expect(taskResponse.body.task.title).toBe('Integration Test Task');
      expect(taskResponse.body.task.projectId).toBe(projectId);
      const taskId = taskResponse.body.task.id;

      // Step 6: Member creates a task
      const memberTaskResponse = await request(app)
        .post(`/api/v1/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${memberRegisterResponse.body.token}`)
        .send({
          title: 'Member Task',
          status: 'in_progress',
        });

      expect(memberTaskResponse.status).toBe(201);
      expect(memberTaskResponse.body.task.title).toBe('Member Task');

      // Step 7: Add comment to task
      const commentResponse = await request(app)
        .post(`/api/v1/tasks/${taskId}/comments`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          content: 'This is a test comment',
        });

      expect(commentResponse.status).toBe(201);
      expect(commentResponse.body.comment.content).toBe('This is a test comment');
      expect(commentResponse.body.comment.authorId).toBe(ownerId);

      // Step 8: Member adds comment
      const memberCommentResponse = await request(app)
        .post(`/api/v1/tasks/${taskId}/comments`)
        .set('Authorization', `Bearer ${memberRegisterResponse.body.token}`)
        .send({
          content: 'Member comment',
        });

      expect(memberCommentResponse.status).toBe(201);

      // Step 9: Verify all tasks are visible to both users
      const ownerTasksResponse = await request(app)
        .get(`/api/v1/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(ownerTasksResponse.status).toBe(200);
      expect(ownerTasksResponse.body.tasks.length).toBe(2);

      const memberTasksResponse = await request(app)
        .get(`/api/v1/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${memberRegisterResponse.body.token}`);

      expect(memberTasksResponse.status).toBe(200);
      expect(memberTasksResponse.body.tasks.length).toBe(2);

      // Step 10: Verify comments are visible
      const commentsResponse = await request(app)
        .get(`/api/v1/tasks/${taskId}/comments`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(commentsResponse.status).toBe(200);
      expect(commentsResponse.body.comments.length).toBe(2);
    });

    it('should enforce authorization boundaries between project owners and members', async () => {
      // Create owner and member
      const ownerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'owner2@example.com',
          password: 'password123',
          name: 'Owner 2',
        });

      const memberResponse = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'member2@example.com',
          password: 'password123',
          name: 'Member 2',
        });

      const ownerToken = ownerResponse.body.token;
      const memberToken = memberResponse.body.token;
      const memberId = memberResponse.body.user.id;

      // Owner creates project
      const projectResponse = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Owner Project',
        });

      const projectId = projectResponse.body.project.id;

      // Member cannot update project
      const updateResponse = await request(app)
        .put(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          name: 'Hacked Project',
        });

      expect(updateResponse.status).toBe(403);

      // Member cannot delete project
      const deleteResponse = await request(app)
        .delete(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(deleteResponse.status).toBe(403);

      // Owner adds member
      await request(app)
        .post(`/api/v1/projects/${projectId}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          userId: memberId,
          role: 'developer',
        });

      // Member can now see project but still cannot update/delete
      const getProjectResponse = await request(app)
        .get(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(getProjectResponse.status).toBe(200);

      const updateResponse2 = await request(app)
        .put(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          name: 'Hacked Project 2',
        });

      expect(updateResponse2.status).toBe(403);

      // Member cannot add other members
      const addMemberResponse = await request(app)
        .post(`/api/v1/projects/${projectId}/members`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          userId: memberId,
          role: 'developer',
        });

      expect(addMemberResponse.status).toBe(403);
    });

    it('should handle authentication and protected routes correctly', async () => {
      // Register user
      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'auth@example.com',
          password: 'password123',
          name: 'Auth User',
        });

      const token = registerResponse.body.token;

      // Access protected route without token
      const noAuthResponse = await request(app).get('/api/v1/projects');
      expect(noAuthResponse.status).toBe(401);

      // Access protected route with invalid token
      const invalidTokenResponse = await request(app)
        .get('/api/v1/projects')
        .set('Authorization', 'Bearer invalid-token-here');
      expect(invalidTokenResponse.status).toBe(401);

      // Access protected route with valid token
      const validTokenResponse = await request(app)
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${token}`);
      expect(validTokenResponse.status).toBe(200);

      // Access /auth/me with valid token
      const meResponse = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);
      expect(meResponse.status).toBe(200);
      expect(meResponse.body.user.email).toBe('auth@example.com');
    });

    it('should handle project deletion cascade correctly', async () => {
      // Create owner
      const ownerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'cascade@example.com',
          password: 'password123',
          name: 'Cascade Owner',
        });

      const ownerToken = ownerResponse.body.token;

      // Create project
      const projectResponse = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Cascade Project',
        });

      const projectId = projectResponse.body.project.id;

      // Create task
      const taskResponse = await request(app)
        .post(`/api/v1/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          title: 'Cascade Task',
        });

      const taskId = taskResponse.body.task.id;

      // Create comment
      const commentResponse = await request(app)
        .post(`/api/v1/tasks/${taskId}/comments`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          content: 'Cascade Comment',
        });

      const commentId = commentResponse.body.comment.id;

      // Delete project
      const deleteResponse = await request(app)
        .delete(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(deleteResponse.status).toBe(204);

      // Verify project is deleted
      const getProjectResponse = await request(app)
        .get(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(getProjectResponse.status).toBe(404);

      // Verify task is deleted (cascade)
      const task = await prisma.task.findUnique({
        where: { id: taskId },
      });
      expect(task).toBeNull();

      // Verify comment is deleted (cascade)
      const comment = await prisma.comment.findUnique({
        where: { id: commentId },
      });
      expect(comment).toBeNull();
    });
  });
});

