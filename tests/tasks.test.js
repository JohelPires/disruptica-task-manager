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
describe('Tasks API', () => {
    let ownerToken;
    let memberToken;
    let member2Token;
    let ownerId;
    let memberId;
    let member2Id;
    let projectId;
    let project2Id;
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
        const project = await prisma_1.prisma.project.create({
            data: {
                name: 'Test Project',
                ownerId: memberId,
            },
        });
        projectId = project.id;
        const project2 = await prisma_1.prisma.project.create({
            data: {
                name: 'Other Project',
                ownerId: member2Id,
            },
        });
        project2Id = project2.id;
    });
    describe('POST /projects/:projectId/tasks', () => {
        it('should create task by project owner', async () => {
            const response = await (0, supertest_1.default)(app_1.default)
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
            await prisma_1.prisma.projectMember.create({
                data: {
                    projectId,
                    userId: member2Id,
                    role: 'developer',
                },
            });
            const response = await (0, supertest_1.default)(app_1.default)
                .post(`/projects/${projectId}/tasks`)
                .set('Authorization', `Bearer ${member2Token}`)
                .send({
                title: 'Member Task',
            });
            expect(response.status).toBe(201);
        });
        it('should create task by global owner', async () => {
            const response = await (0, supertest_1.default)(app_1.default)
                .post(`/projects/${projectId}/tasks`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .send({
                title: 'Owner Task',
            });
            expect(response.status).toBe(201);
        });
        it('should not create task by non-member', async () => {
            const response = await (0, supertest_1.default)(app_1.default)
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
            await prisma_1.prisma.task.create({
                data: {
                    title: 'Task 1',
                    projectId,
                    createdById: memberId,
                },
            });
            await prisma_1.prisma.task.create({
                data: {
                    title: 'Task 2',
                    projectId,
                    createdById: memberId,
                },
            });
        });
        it('should get tasks by project owner', async () => {
            const response = await (0, supertest_1.default)(app_1.default)
                .get(`/projects/${projectId}/tasks`)
                .set('Authorization', `Bearer ${memberToken}`);
            expect(response.status).toBe(200);
            expect(response.body.tasks.length).toBe(2);
        });
        it('should get tasks by project member', async () => {
            await prisma_1.prisma.projectMember.create({
                data: {
                    projectId,
                    userId: member2Id,
                    role: 'developer',
                },
            });
            const response = await (0, supertest_1.default)(app_1.default)
                .get(`/projects/${projectId}/tasks`)
                .set('Authorization', `Bearer ${member2Token}`);
            expect(response.status).toBe(200);
            expect(response.body.tasks.length).toBe(2);
        });
        it('should not get tasks by non-member', async () => {
            const response = await (0, supertest_1.default)(app_1.default)
                .get(`/projects/${projectId}/tasks`)
                .set('Authorization', `Bearer ${member2Token}`);
            expect(response.status).toBe(403);
        });
    });
    describe('GET /tasks/:id', () => {
        let taskId;
        beforeEach(async () => {
            const task = await prisma_1.prisma.task.create({
                data: {
                    title: 'Test Task',
                    projectId,
                    createdById: memberId,
                },
            });
            taskId = task.id;
        });
        it('should get task by project owner', async () => {
            const response = await (0, supertest_1.default)(app_1.default)
                .get(`/tasks/${taskId}`)
                .set('Authorization', `Bearer ${memberToken}`);
            expect(response.status).toBe(200);
            expect(response.body.task.id).toBe(taskId);
        });
        it('should get task by project member', async () => {
            await prisma_1.prisma.projectMember.create({
                data: {
                    projectId,
                    userId: member2Id,
                    role: 'developer',
                },
            });
            const response = await (0, supertest_1.default)(app_1.default)
                .get(`/tasks/${taskId}`)
                .set('Authorization', `Bearer ${member2Token}`);
            expect(response.status).toBe(200);
        });
        it('should not get task by non-member', async () => {
            const response = await (0, supertest_1.default)(app_1.default)
                .get(`/tasks/${taskId}`)
                .set('Authorization', `Bearer ${member2Token}`);
            expect(response.status).toBe(403);
        });
    });
    describe('PUT /tasks/:id', () => {
        let taskId;
        beforeEach(async () => {
            const task = await prisma_1.prisma.task.create({
                data: {
                    title: 'Test Task',
                    projectId,
                    createdById: memberId,
                },
            });
            taskId = task.id;
        });
        it('should update task by project owner', async () => {
            const response = await (0, supertest_1.default)(app_1.default)
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
            await prisma_1.prisma.projectMember.create({
                data: {
                    projectId,
                    userId: member2Id,
                    role: 'developer',
                },
            });
            const response = await (0, supertest_1.default)(app_1.default)
                .put(`/tasks/${taskId}`)
                .set('Authorization', `Bearer ${member2Token}`)
                .send({
                status: 'done',
            });
            expect(response.status).toBe(200);
        });
        it('should not update task by non-member', async () => {
            const response = await (0, supertest_1.default)(app_1.default)
                .put(`/tasks/${taskId}`)
                .set('Authorization', `Bearer ${member2Token}`)
                .send({
                title: 'Unauthorized Update',
            });
            expect(response.status).toBe(403);
        });
    });
    describe('DELETE /tasks/:id', () => {
        let taskId;
        beforeEach(async () => {
            const task = await prisma_1.prisma.task.create({
                data: {
                    title: 'Test Task',
                    projectId,
                    createdById: memberId,
                },
            });
            taskId = task.id;
        });
        it('should delete task by project owner', async () => {
            const response = await (0, supertest_1.default)(app_1.default)
                .delete(`/tasks/${taskId}`)
                .set('Authorization', `Bearer ${memberToken}`);
            expect(response.status).toBe(204);
            const task = await prisma_1.prisma.task.findUnique({
                where: { id: taskId },
            });
            expect(task).toBeNull();
        });
        it('should delete task by global owner', async () => {
            const response = await (0, supertest_1.default)(app_1.default)
                .delete(`/tasks/${taskId}`)
                .set('Authorization', `Bearer ${ownerToken}`);
            expect(response.status).toBe(204);
        });
        it('should not delete task by project member', async () => {
            await prisma_1.prisma.projectMember.create({
                data: {
                    projectId,
                    userId: member2Id,
                    role: 'developer',
                },
            });
            const response = await (0, supertest_1.default)(app_1.default)
                .delete(`/tasks/${taskId}`)
                .set('Authorization', `Bearer ${member2Token}`);
            expect(response.status).toBe(403);
        });
    });
});
//# sourceMappingURL=tasks.test.js.map