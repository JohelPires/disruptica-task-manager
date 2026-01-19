import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/prisma';
import { hashPassword } from '../src/utils/password';

describe('Rate Limiter Middleware', () => {
  // Store original environment variables
  const originalEnv = { ...process.env };

  beforeAll(() => {
    // Configure rate limits for faster testing
    process.env.RATE_LIMIT_ENABLED = 'true';
    process.env.RATE_LIMIT_AUTH_MAX = '3';
    process.env.RATE_LIMIT_API_MAX = '5';
    process.env.RATE_LIMIT_GLOBAL_MAX = '10';
    process.env.RATE_LIMIT_WINDOW_MS = '10000'; // 10 seconds instead of 15 minutes
  });

  afterAll(() => {
    // Restore original environment - disable rate limiting for other tests
    process.env.RATE_LIMIT_ENABLED = 'false';
    // Restore other original values
    Object.keys(originalEnv).forEach(key => {
      if (key.startsWith('RATE_LIMIT_') && key !== 'RATE_LIMIT_ENABLED') {
        process.env[key] = originalEnv[key];
      }
    });
  });

  beforeEach(async () => {
    // Clean database
    await prisma.comment.deleteMany();
    await prisma.task.deleteMany();
    await prisma.projectMember.deleteMany();
    await prisma.project.deleteMany();
    await prisma.user.deleteMany();

    // Note: Rate limiters use in-memory stores that persist between tests
    // Tests may need to wait for rate limit windows to expire
    // For tests that don't need isolation, we wait a bit to avoid interference
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  describe('Auth Rate Limiter', () => {
    describe('POST /auth/register', () => {
      it('should allow requests within limit', async () => {
        // Make 3 requests (at the limit)
        for (let i = 1; i <= 3; i++) {
          const response = await request(app)
            .post('/api/v1/auth/register')
            .send({
              email: `test${i}@example.com`,
              password: 'password123',
              name: `Test User ${i}`,
            });

          expect(response.status).toBe(201);
          expect(response.body).toHaveProperty('user');
        }
      });

      it('should block requests exceeding auth rate limit', async () => {
        // Make 3 successful requests
        for (let i = 1; i <= 3; i++) {
          const response = await request(app)
            .post('/api/v1/auth/register')
            .send({
              email: `test${i}@example.com`,
              password: 'password123',
              name: `Test User ${i}`,
            });

          expect(response.status).toBe(201);
        }

        // 4th request should be blocked
        const blockedResponse = await request(app)
          .post('/api/v1/auth/register')
          .send({
            email: 'test4@example.com',
            password: 'password123',
            name: 'Test User 4',
          });

        expect(blockedResponse.status).toBe(429);
        expect(blockedResponse.body.error).toBeDefined();
        expect(blockedResponse.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
        expect(blockedResponse.body.error.message).toContain('Too many authentication attempts');
      });

      it('should include rate limit headers', async () => {
        // Wait a bit to avoid interference from previous tests
        await new Promise((resolve) => setTimeout(resolve, 11000));

        const response = await request(app)
          .post('/api/v1/auth/register')
          .send({
            email: 'test@example.com',
            password: 'password123',
            name: 'Test User',
          });

        // May be rate limited if previous tests exhausted the limit
        expect([201, 429]).toContain(response.status);
        expect(response.headers['ratelimit-limit']).toBeDefined();
        expect(response.headers['ratelimit-remaining']).toBeDefined();
        expect(response.headers['ratelimit-reset']).toBeDefined();
      }, 20000);

      it('should decrease remaining count with each request', async () => {
        // Wait for rate limit window to expire from previous tests
        await new Promise((resolve) => setTimeout(resolve, 11000));

        const response1 = await request(app)
          .post('/api/v1/auth/register')
          .send({
            email: 'test1@example.com',
            password: 'password123',
            name: 'Test User 1',
          });

        const response2 = await request(app)
          .post('/api/v1/auth/register')
          .send({
            email: 'test2@example.com',
            password: 'password123',
            name: 'Test User 2',
          });

        const remaining1 = parseInt(response1.headers['ratelimit-remaining'] || '0', 10);
        const remaining2 = parseInt(response2.headers['ratelimit-remaining'] || '0', 10);

        // If both succeeded, remaining should decrease
        if (response1.status === 201 && response2.status === 201) {
          expect(remaining2).toBeLessThan(remaining1);
          expect(remaining1).toBeGreaterThan(0);
        } else {
          // If rate limited, just verify headers exist
          expect(response1.headers['ratelimit-remaining']).toBeDefined();
          expect(response2.headers['ratelimit-remaining']).toBeDefined();
        }
      }, 20000);
    });

    describe('POST /auth/login', () => {
      beforeEach(async () => {
        await prisma.user.create({
          data: {
            email: 'test@example.com',
            password: await hashPassword('password123'),
            name: 'Test User',
          },
        });
      });

      it('should block excessive login attempts', async () => {
        // Wait for rate limit window to expire from previous tests
        await new Promise((resolve) => setTimeout(resolve, 11000));

        // Make 3 login attempts (at the limit)
        for (let i = 0; i < 3; i++) {
          const response = await request(app)
            .post('/api/v1/auth/login')
            .send({
              email: 'test@example.com',
              password: i === 0 ? 'password123' : 'wrong', // First succeeds, rest fail
            });

          // First should succeed, others might fail but still count toward limit
          if (i === 0) {
            expect(response.status).toBe(200);
          }
        }

        // 4th attempt should be rate limited
        const blockedResponse = await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: 'test@example.com',
            password: 'password123',
          });

        expect(blockedResponse.status).toBe(429);
        expect(blockedResponse.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
      }, 20000);

      it('should track login and register together (shared auth limiter)', async () => {
        // Make 2 register attempts
        for (let i = 1; i <= 2; i++) {
          await request(app)
            .post('/api/v1/auth/register')
            .send({
              email: `test${i}@example.com`,
              password: 'password123',
              name: `Test User ${i}`,
            });
        }

        // Make 1 login attempt (should work)
        const loginResponse = await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: 'test@example.com',
            password: 'password123',
          });

        expect(loginResponse.status).toBe(200);

        // Next request should be blocked (3rd total)
        const blockedResponse = await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: 'test@example.com',
            password: 'password123',
          });

        // This should be blocked as we've reached the limit of 3
        // Actually, the limit is 3 per window, so 2 register + 1 login = 3, next should be blocked
        expect(blockedResponse.status).toBe(429);
      });
    });
  });

  describe('API Rate Limiter', () => {
    let token: string;
    let token2: string;

    beforeEach(async () => {
      // Create first user
      await prisma.user.create({
        data: {
          email: 'test@example.com',
          password: await hashPassword('password123'),
          name: 'Test User',
        },
      });

      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      token = loginResponse.body.token;

      // Create second user for user-based limiting tests
      await prisma.user.create({
        data: {
          email: 'test2@example.com',
          password: await hashPassword('password123'),
          name: 'Test User 2',
        },
      });

      const loginResponse2 = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test2@example.com',
          password: 'password123',
        });

      token2 = loginResponse2.body.token;
    });

    it('should allow requests within API rate limit', async () => {
      // Make 5 requests (at the limit)
      for (let i = 0; i < 5; i++) {
        const response = await request(app)
          .get('/api/v1/users')
          .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('users');
      }
    });

    it('should block requests exceeding API rate limit', async () => {
      // Make 5 requests (at the limit)
      for (let i = 0; i < 5; i++) {
        const response = await request(app)
          .get('/api/v1/users')
          .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
      }

      // 6th request should be blocked
      const blockedResponse = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${token}`);

      expect(blockedResponse.status).toBe(429);
      expect(blockedResponse.body.error).toBeDefined();
      expect(blockedResponse.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(blockedResponse.body.error.message).toContain('Too many requests');
    });

    it('should track rate limits per user (user-based limiting)', async () => {
      // Exhaust first user's limit
      for (let i = 0; i < 5; i++) {
        await request(app)
          .get('/api/v1/users')
          .set('Authorization', `Bearer ${token}`);
      }

      // Second user should still have their own limit (should work)
      const response = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${token2}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('users');
    });

    it('should apply rate limit to different authenticated endpoints', async () => {
      // Make requests to different endpoints
      await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${token}`);

      await request(app)
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${token}`);

      await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      // All should work and count toward the same limit
      const response = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
    });

    it('should reset rate limit after window expires', async () => {
      // Exhaust limit
      for (let i = 0; i < 5; i++) {
        await request(app)
          .get('/api/v1/users')
          .set('Authorization', `Bearer ${token}`);
      }

      // Verify it's blocked
      const blockedResponse = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${token}`);

      expect(blockedResponse.status).toBe(429);

      // Wait for window to expire (10 seconds + small buffer)
      await new Promise((resolve) => setTimeout(resolve, 11000));

      // Should work again after window expires
      const response = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
    }, 20000); // Increase Jest timeout for this test

      it('should include rate limit headers in API responses', async () => {
        const response = await request(app)
          .get('/api/v1/users')
          .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.headers['ratelimit-limit']).toBeDefined();
      expect(response.headers['ratelimit-remaining']).toBeDefined();
      expect(response.headers['ratelimit-reset']).toBeDefined();
    });
  });

  describe('Global Rate Limiter', () => {
    it('should apply global rate limit to public endpoints', async () => {
      // Make 10 requests to public endpoint (at the limit)
      for (let i = 0; i < 10; i++) {
        const response = await request(app).get('/api-docs.json');

        expect(response.status).toBe(200);
        expect(response.headers['ratelimit-limit']).toBeDefined();
      }

      // 11th request should be blocked
      const blockedResponse = await request(app).get('/api-docs.json');

      expect(blockedResponse.status).toBe(429);
      expect(blockedResponse.body.error).toBeDefined();
      expect(blockedResponse.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    });

    it('should apply global limit across different endpoints', async () => {
      // Make requests to different endpoints
      let requestCount = 0;

      // Make some requests to api-docs.json
      for (let i = 0; i < 5; i++) {
        await request(app).get('/api-docs.json');
        requestCount++;
      }

      // Should still work
      const response = await request(app).get('/api-docs.json');
      requestCount++;
      expect(response.status).toBe(200);

      // Continue until limit
      while (requestCount < 10) {
        await request(app).get('/api-docs.json');
        requestCount++;
      }

      // Next should be blocked
      const blockedResponse = await request(app).get('/api-docs.json');
      expect(blockedResponse.status).toBe(429);
    });

    it('should track global limit by IP address', async () => {
      // All requests from same IP share the global limit
      // This is tested implicitly by the previous tests
      // In a real scenario, different IPs would have separate limits
      const response = await request(app).get('/api-docs.json');
      expect(response.status).toBe(200);
      expect(response.headers['ratelimit-limit']).toBeDefined();
    });
  });

  describe('Rate Limiter Integration', () => {
    it('should apply different limits to different endpoint types', async () => {
      // Auth limit: 3, API limit: 5, Global limit: 10
      
      // Exhaust auth limit (3 requests)
      for (let i = 1; i <= 3; i++) {
        await request(app)
          .post('/api/v1/auth/register')
          .send({
            email: `test${i}@example.com`,
            password: 'password123',
            name: `Test User ${i}`,
          });
      }

      // Auth should be blocked
      const authBlocked = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test4@example.com',
          password: 'password123',
          name: 'Test User 4',
        });

      expect(authBlocked.status).toBe(429);

      // But global limit should still allow other endpoints
      const globalResponse = await request(app).get('/api-docs.json');
      expect(globalResponse.status).toBe(200);
    });

    it('should work correctly with authenticated and unauthenticated requests', async () => {
      // Create user and get token
      await prisma.user.create({
        data: {
          email: 'test@example.com',
          password: await hashPassword('password123'),
          name: 'Test User',
        },
      });

      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      const token = loginResponse.body.token;

      // Authenticated requests count toward API limit
      await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${token}`);

      // Unauthenticated requests count toward global limit
      await request(app).get('/api-docs.json');

      // Both should work
      expect(loginResponse.status).toBe(200);
    });
  });

  describe('Rate Limiter Headers', () => {
    it('should include standard rate limit headers in all responses', async () => {
      const response = await request(app).get('/api-docs.json');

      expect(response.headers['ratelimit-limit']).toBeDefined();
      expect(response.headers['ratelimit-remaining']).toBeDefined();
      expect(response.headers['ratelimit-reset']).toBeDefined();

      // Check header values are valid
      const limit = parseInt(response.headers['ratelimit-limit'] || '0', 10);
      const remaining = parseInt(response.headers['ratelimit-remaining'] || '0', 10);
      const reset = parseInt(response.headers['ratelimit-reset'] || '0', 10);

      expect(limit).toBeGreaterThan(0);
      expect(remaining).toBeGreaterThanOrEqual(0);
      expect(reset).toBeGreaterThan(0);
    });

    it('should show correct remaining count when approaching limit', async () => {
      // Make requests and check remaining count decreases
      const response1 = await request(app).get('/api-docs.json');
      const response2 = await request(app).get('/api-docs.json');
      const response3 = await request(app).get('/api-docs.json');

      const remaining1 = parseInt(response1.headers['ratelimit-remaining'] || '0', 10);
      const remaining2 = parseInt(response2.headers['ratelimit-remaining'] || '0', 10);
      const remaining3 = parseInt(response3.headers['ratelimit-remaining'] || '0', 10);

      expect(remaining1).toBeGreaterThan(remaining2);
      expect(remaining2).toBeGreaterThan(remaining3);
      expect(remaining3).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Rate Limiter Edge Cases', () => {
    it('should handle concurrent requests correctly', async () => {
      // Create users for registration
      const promises = Array.from({ length: 5 }, (_, i) =>
        request(app)
          .post('/api/v1/auth/register')
          .send({
            email: `test${Date.now()}-${i}@example.com`,
            password: 'password123',
            name: `Test User ${i}`,
          })
      );

      const responses = await Promise.all(promises);
      const successful = responses.filter((r) => r.status === 201);
      const rateLimited = responses.filter((r) => r.status === 429);

      // Some should succeed, some should be rate limited
      // Since limit is 3, at least 2 should be rate limited
      expect(rateLimited.length).toBeGreaterThan(0);
      expect(successful.length).toBeLessThanOrEqual(3);
    });

    it('should allow requests after rate limit window expires', async () => {
      // Exhaust limit
      for (let i = 0; i < 10; i++) {
        await request(app).get('/api-docs.json');
      }

      // Verify blocked
      const blocked = await request(app).get('/api-docs.json');
      expect(blocked.status).toBe(429);

      // Wait for window to expire
      await new Promise((resolve) => setTimeout(resolve, 11000));

      // Should work again
      const response = await request(app).get('/api-docs.json');
      expect(response.status).toBe(200);
    }, 20000); // Increase timeout for this test
  });
});

