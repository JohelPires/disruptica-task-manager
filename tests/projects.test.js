"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const app_1 = __importDefault(require("../src/app"));
const prisma_1 = require("../src/config/prisma");
const password_1 = require("../src/utils/password");
const jwt_1 = require("../src/utils/jwt");
describe('Projects API', () => {
    let ownerToken;
    let memberToken;
    let member2Token;
    let ownerId;
    let memberId;
    let member2Id;
    beforeEach(async () => {
        await prisma_1.prisma.comment.deleteMany();
        await prisma_1.prisma.task.deleteMany();
        await prisma_1.prisma.projectMember.deleteMany();
        await prisma_1.prisma.project.deleteMany();
        await prisma_1.prisma.user.deleteMany();
        const owner = await prisma_1.prisma.user.create({
            data: {
                email: 'owner@example.com',
                password: await (0, password_1.hashPassword)('password123'),
                name: 'Global Owner',
                role: 'owner',
            },
        });
        const member = await prisma_1.prisma.user.create({
            data: {
                email: 'member@example.com',
                password: await (0, password_1.hashPassword)('password123'),
                name: 'Member User',
                role: 'member',
            },
        });
        const member2 = await prisma_1.prisma.user.create({
            data: {
                email: 'member2@example.com',
                password: await (0, password_1.hashPassword)('password123'),
                name: 'Member User 2',
                role: 'member',
            },
        });
        ownerId = owner.id;
        memberId = member.id;
        member2Id = member2.id;
        ownerToken = (0, jwt_1.generateToken)({
            userId: owner.id,
            email: owner.email,
            role: owner.role,
        });
        memberToken = (0, jwt_1.generateToken)({
            userId: member.id,
            email: member.email,
            role: member.role,
        });
        member2Token = (0, jwt_1.generateToken)({
            userId: member2.id,
            email: member2.email,
            role: member2.role,
        });
    });
    describe('POST /projects', () => {
        it('should create a project', async () => {
            const response = await (0, supertest_1.default)(app_1.default)
                .post('/projects')
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
            const response = await (0, supertest_1.default)(app_1.default).post('/projects').send({
                name: 'Test Project',
            });
            expect(response.status).toBe(401);
        });
    });
    describe('GET /projects', () => {
        beforeEach(async () => {
            await prisma_1.prisma.project.create({
                data: {
                    name: 'Member Project',
                    ownerId: memberId,
                },
            });
            await prisma_1.prisma.project.create({
                data: {
                    name: 'Other Project',
                    ownerId: member2Id,
                },
            });
        });
        it('should return all projects for global owner', async () => {
            const response = await (0, supertest_1.default)(app_1.default)
                .get('/projects')
                .set('Authorization', `Bearer ${ownerToken}`);
            expect(response.status).toBe(200);
            expect(response.body.projects.length).toBe(2);
        });
        it('should return only accessible projects for member', async () => {
            const response = await (0, supertest_1.default)(app_1.default)
                .get('/projects')
                .set('Authorization', `Bearer ${memberToken}`);
            expect(response.status).toBe(200);
            expect(response.body.projects.length).toBe(1);
            expect(response.body.projects[0].name).toBe('Member Project');
        });
        it('should include projects where user is a member', async () => {
            const project = await prisma_1.prisma.project.create({
                data: {
                    name: 'Shared Project',
                    ownerId: member2Id,
                },
            });
            await prisma_1.prisma.projectMember.create({
                data: {
                    projectId: project.id,
                    userId: memberId,
                    role: 'developer',
                },
            });
            const response = await (0, supertest_1.default)(app_1.default)
                .get('/projects')
                .set('Authorization', `Bearer ${memberToken}`);
            expect(response.status).toBe(200);
            expect(response.body.projects.length).toBe(2);
        });
    });
    describe('GET /projects/:id', () => {
        let projectId;
        beforeEach(async () => {
            const project = await prisma_1.prisma.project.create({
                data: {
                    name: 'Test Project',
                    ownerId: memberId,
                },
            });
            projectId = project.id;
        });
        it('should get project by id for owner', async () => {
            const response = await (0, supertest_1.default)(app_1.default)
                .get(`/projects/${projectId}`)
                .set('Authorization', `Bearer ${memberToken}`);
            expect(response.status).toBe(200);
            expect(response.body.project.id).toBe(projectId);
        });
        it('should get project by id for global owner', async () => {
            const response = await (0, supertest_1.default)(app_1.default)
                .get(`/projects/${projectId}`)
                .set('Authorization', `Bearer ${ownerToken}`);
            expect(response.status).toBe(200);
        });
        it('should get project by id for project member', async () => {
            await prisma_1.prisma.projectMember.create({
                data: {
                    projectId,
                    userId: member2Id,
                    role: 'developer',
                },
            });
            const response = await (0, supertest_1.default)(app_1.default)
                .get(`/projects/${projectId}`)
                .set('Authorization', `Bearer ${member2Token}`);
            expect(response.status).toBe(200);
        });
        it('should not get project for non-member', async () => {
            const response = await (0, supertest_1.default)(app_1.default)
                .get(`/projects/${projectId}`)
                .set('Authorization', `Bearer ${member2Token}`);
            expect(response.status).toBe(403);
        });
    });
    describe('PUT /projects/:id', () => {
        let projectId;
        beforeEach(async () => {
            const project = await prisma_1.prisma.project.create({
                data: {
                    name: 'Test Project',
                    ownerId: memberId,
                },
            });
            projectId = project.id;
        });
        it('should update project by owner', async () => {
            const response = await (0, supertest_1.default)(app_1.default)
                .put(`/projects/${projectId}`)
                .set('Authorization', `Bearer ${memberToken}`)
                .send({
                name: 'Updated Project',
            });
            expect(response.status).toBe(200);
            expect(response.body.project.name).toBe('Updated Project');
        });
        it('should update project by global owner', async () => {
            const response = await (0, supertest_1.default)(app_1.default)
                .put(`/projects/${projectId}`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .send({
                name: 'Updated by Owner',
            });
            expect(response.status).toBe(200);
        });
        it('should not update project by non-owner member', async () => {
            await prisma_1.prisma.projectMember.create({
                data: {
                    projectId,
                    userId: member2Id,
                    role: 'developer',
                },
            });
            const response = await (0, supertest_1.default)(app_1.default)
                .put(`/projects/${projectId}`)
                .set('Authorization', `Bearer ${member2Token}`)
                .send({
                name: 'Unauthorized Update',
            });
            expect(response.status).toBe(403);
        });
    });
    describe('DELETE /projects/:id', () => {
        let projectId;
        beforeEach(async () => {
            const project = await prisma_1.prisma.project.create({
                data: {
                    name: 'Test Project',
                    ownerId: memberId,
                },
            });
            projectId = project.id;
        });
        it('should delete project by owner', async () => {
            const response = await (0, supertest_1.default)(app_1.default)
                .delete(`/projects/${projectId}`)
                .set('Authorization', `Bearer ${memberToken}`);
            expect(response.status).toBe(204);
            const project = await prisma_1.prisma.project.findUnique({
                where: { id: projectId },
            });
            expect(project).toBeNull();
        });
        it('should delete project by global owner', async () => {
            const response = await (0, supertest_1.default)(app_1.default)
                .delete(`/projects/${projectId}`)
                .set('Authorization', `Bearer ${ownerToken}`);
            expect(response.status).toBe(204);
        });
        it('should not delete project by non-owner', async () => {
            const response = await (0, supertest_1.default)(app_1.default)
                .delete(`/projects/${projectId}`)
                .set('Authorization', `Bearer ${member2Token}`);
            expect(response.status).toBe(403);
        });
    });
    describe('POST /projects/:id/members', () => {
        let projectId;
        beforeEach(async () => {
            const project = await prisma_1.prisma.project.create({
                data: {
                    name: 'Test Project',
                    ownerId: memberId,
                },
            });
            projectId = project.id;
        });
        it('should add member by project owner', async () => {
            const response = await (0, supertest_1.default)(app_1.default)
                .post(`/projects/${projectId}/members`)
                .set('Authorization', `Bearer ${memberToken}`)
                .send({
                userId: member2Id,
                role: 'developer',
            });
            expect(response.status).toBe(201);
            expect(response.body.member.userId).toBe(member2Id);
        });
        it('should add member by global owner', async () => {
            const response = await (0, supertest_1.default)(app_1.default)
                .post(`/projects/${projectId}/members`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .send({
                userId: member2Id,
                role: 'developer',
            });
            expect(response.status).toBe(201);
        });
        it('should not add member by non-owner', async () => {
            const response = await (0, supertest_1.default)(app_1.default)
                .post(`/projects/${projectId}/members`)
                .set('Authorization', `Bearer ${member2Token}`)
                .send({
                userId: ownerId,
                role: 'developer',
            });
            expect(response.status).toBe(403);
        });
    });
    describe('DELETE /projects/:id/members/:userId', () => {
        let projectId;
        beforeEach(async () => {
            const project = await prisma_1.prisma.project.create({
                data: {
                    name: 'Test Project',
                    ownerId: memberId,
                },
            });
            projectId = project.id;
            await prisma_1.prisma.projectMember.create({
                data: {
                    projectId,
                    userId: member2Id,
                    role: 'developer',
                },
            });
        });
        it('should remove member by project owner', async () => {
            const response = await (0, supertest_1.default)(app_1.default)
                .delete(`/projects/${projectId}/members/${member2Id}`)
                .set('Authorization', `Bearer ${memberToken}`);
            expect(response.status).toBe(204);
            const member = await prisma_1.prisma.projectMember.findUnique({
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
            const response = await (0, supertest_1.default)(app_1.default)
                .delete(`/projects/${projectId}/members/${member2Id}`)
                .set('Authorization', `Bearer ${ownerToken}`);
            expect(response.status).toBe(204);
        });
        it('should not remove member by non-owner', async () => {
            const response = await (0, supertest_1.default)(app_1.default)
                .delete(`/projects/${projectId}/members/${member2Id}`)
                .set('Authorization', `Bearer ${member2Token}`);
            expect(response.status).toBe(403);
        });
    });
});
//# sourceMappingURL=projects.test.js.map