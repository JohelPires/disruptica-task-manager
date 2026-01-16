"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const app_1 = __importDefault(require("../src/app"));
const prisma_1 = require("../src/config/prisma");
const password_1 = require("../src/utils/password");
describe('Auth API', () => {
    beforeEach(async () => {
        await prisma_1.prisma.comment.deleteMany();
        await prisma_1.prisma.task.deleteMany();
        await prisma_1.prisma.projectMember.deleteMany();
        await prisma_1.prisma.project.deleteMany();
        await prisma_1.prisma.user.deleteMany();
    });
    describe('POST /auth/register', () => {
        it('should register a new user', async () => {
            const response = await (0, supertest_1.default)(app_1.default)
                .post('/auth/register')
                .send({
                email: 'test@example.com',
                password: 'password123',
                name: 'Test User',
            });
            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('user');
            expect(response.body).toHaveProperty('token');
            expect(response.body.user.email).toBe('test@example.com');
            expect(response.body.user.role).toBe('member');
        });
        it('should register a user with owner role', async () => {
            const response = await (0, supertest_1.default)(app_1.default)
                .post('/auth/register')
                .send({
                email: 'owner@example.com',
                password: 'password123',
                name: 'Owner User',
                role: 'owner',
            });
            expect(response.status).toBe(201);
            expect(response.body.user.role).toBe('owner');
        });
        it('should not register duplicate email', async () => {
            await prisma_1.prisma.user.create({
                data: {
                    email: 'test@example.com',
                    password: await (0, password_1.hashPassword)('password123'),
                    name: 'Existing User',
                },
            });
            const response = await (0, supertest_1.default)(app_1.default)
                .post('/auth/register')
                .send({
                email: 'test@example.com',
                password: 'password123',
                name: 'New User',
            });
            expect(response.status).toBe(409);
        });
        it('should validate email format', async () => {
            const response = await (0, supertest_1.default)(app_1.default)
                .post('/auth/register')
                .send({
                email: 'invalid-email',
                password: 'password123',
                name: 'Test User',
            });
            expect(response.status).toBe(400);
        });
        it('should validate password length', async () => {
            const response = await (0, supertest_1.default)(app_1.default)
                .post('/auth/register')
                .send({
                email: 'test@example.com',
                password: '123',
                name: 'Test User',
            });
            expect(response.status).toBe(400);
        });
    });
    describe('POST /auth/login', () => {
        beforeEach(async () => {
            await prisma_1.prisma.user.create({
                data: {
                    email: 'test@example.com',
                    password: await (0, password_1.hashPassword)('password123'),
                    name: 'Test User',
                },
            });
        });
        it('should login with valid credentials', async () => {
            const response = await (0, supertest_1.default)(app_1.default)
                .post('/auth/login')
                .send({
                email: 'test@example.com',
                password: 'password123',
            });
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('user');
            expect(response.body).toHaveProperty('token');
        });
        it('should not login with invalid email', async () => {
            const response = await (0, supertest_1.default)(app_1.default)
                .post('/auth/login')
                .send({
                email: 'wrong@example.com',
                password: 'password123',
            });
            expect(response.status).toBe(401);
        });
        it('should not login with invalid password', async () => {
            const response = await (0, supertest_1.default)(app_1.default)
                .post('/auth/login')
                .send({
                email: 'test@example.com',
                password: 'wrongpassword',
            });
            expect(response.status).toBe(401);
        });
    });
    describe('GET /auth/me', () => {
        let token;
        beforeEach(async () => {
            const user = await prisma_1.prisma.user.create({
                data: {
                    email: 'test@example.com',
                    password: await (0, password_1.hashPassword)('password123'),
                    name: 'Test User',
                },
            });
            const loginResponse = await (0, supertest_1.default)(app_1.default)
                .post('/auth/login')
                .send({
                email: 'test@example.com',
                password: 'password123',
            });
            token = loginResponse.body.token;
        });
        it('should get current user with valid token', async () => {
            const response = await (0, supertest_1.default)(app_1.default)
                .get('/auth/me')
                .set('Authorization', `Bearer ${token}`);
            expect(response.status).toBe(200);
            expect(response.body.user.email).toBe('test@example.com');
        });
        it('should not get current user without token', async () => {
            const response = await (0, supertest_1.default)(app_1.default).get('/auth/me');
            expect(response.status).toBe(401);
        });
        it('should not get current user with invalid token', async () => {
            const response = await (0, supertest_1.default)(app_1.default)
                .get('/auth/me')
                .set('Authorization', 'Bearer invalid-token');
            expect(response.status).toBe(401);
        });
    });
});
//# sourceMappingURL=auth.test.js.map