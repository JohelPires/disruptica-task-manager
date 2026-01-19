# Disruptica Task Manager

A comprehensive REST API for managing tasks, projects, users, and comments built with Node.js, Express, TypeScript, and PostgreSQL.

## 🌐 Live Demo

**Production API**: [https://canario-disruptica-tm-api.qmono1.easypanel.host/](https://canario-disruptica-tm-api.qmono1.easypanel.host/)

**API Documentation**: [https://canario-disruptica-tm-api.qmono1.easypanel.host/api-docs](https://canario-disruptica-tm-api.qmono1.easypanel.host/api-docs)

**Database Schema Diagram**: [View on dbdiagram.io](https://dbdiagram.io/d/disruptica-696958add6e030a02430399f)

---

## 📋 Table of Contents

-   [Features](#features)
-   [Tech Stack](#tech-stack)
-   [Database Schema](#database-schema)
-   [Prerequisites](#prerequisites)
-   [Installation](#installation)
-   [Configuration](#configuration)
-   [Running the Application](#running-the-application)
-   [API Documentation](#api-documentation)
-   [API Endpoints](#api-endpoints)
-   [Testing](#testing)
-   [Project Structure](#project-structure)
-   [Deployment](#deployment)
-   [Troubleshooting](#troubleshooting)

## ✨ Features

-   🔐 **Authentication & Authorization** - JWT-based authentication with role-based access control
-   📁 **Project Management** - Create, update, delete projects with member management
-   ✅ **Task Management** - Full CRUD operations with advanced filtering, sorting, and pagination
-   💬 **Comments** - Add comments to tasks for collaboration
-   👥 **User Management** - User profiles with role-based access (owner/member)
-   🔄 **Idempotency Keys** - Prevent duplicate resource creation with idempotency key support
-   🚦 **Rate Limiting** - Protect API endpoints from abuse with configurable rate limits
-   📚 **API Documentation** - Interactive Swagger/OpenAPI documentation
-   🔒 **Security** - Password hashing with bcrypt, secure JWT tokens
-   🎯 **Type Safety** - Full TypeScript support for better developer experience
-   🔍 **Advanced Filtering** - Filter by multiple criteria (status, priority, dates, assignments, etc.)
-   📄 **Pagination** - Efficient data retrieval with pagination support
-   🔎 **Search** - Full-text search across projects, tasks, comments, and users

## 🛠 Tech Stack

-   **Runtime**: Node.js 20+
-   **Framework**: Express.js
-   **Language**: TypeScript
-   **Database**: PostgreSQL
-   **ORM**: Prisma
-   **Authentication**: JWT (jsonwebtoken)
-   **Password Hashing**: bcrypt
-   **Validation**: Zod
-   **Documentation**: Swagger/OpenAPI (swagger-jsdoc, swagger-ui-express)
-   **Testing**: Jest, Supertest
-   **Containerization**: Docker

## 🗄️ Database Schema

The database schema uses PostgreSQL with Prisma ORM. You can view an interactive diagram of the database relationships:

**[View Database Schema Diagram →](https://dbdiagram.io/d/disruptica-696958add6e030a02430399f)**

### Models

-   **User** - User accounts with authentication (email, password, name, role)
-   **Project** - Projects owned by users with optional descriptions
-   **ProjectMember** - Many-to-many relationship between projects and members with roles
-   **Task** - Tasks belonging to projects with status, priority, and assignments
-   **Comment** - Comments on tasks for collaboration
-   **IdempotencyKey** - Stores idempotency keys to prevent duplicate resource creation

### Relationships

-   User → Project (one-to-many, owner)
-   User → ProjectMember (one-to-many)
-   Project → ProjectMember (one-to-many)
-   Project → Task (one-to-many)
-   User → Task (many-to-many, assignedTo/createdBy)
-   Task → Comment (one-to-many)
-   User → Comment (one-to-many, author)
-   User → IdempotencyKey (one-to-many, for tracking idempotent requests)

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

-   **Node.js** (v20 or higher)
-   **PostgreSQL** (v12 or higher)
-   **npm** or **yarn**
-   **Git**

Optional:

-   **Docker** and **Docker Compose** (for containerized deployment)

## 🚀 Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd disruptica-task-manager
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Copy the environment template and configure it:

```bash
cp env.template .env
```

Edit `.env` with your configuration:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/taskmanager?schema=public"
TEST_DATABASE_URL="postgresql://user:password@localhost:5432/taskmanager_test?schema=public"
JWT_SECRET="your-secret-key-change-in-production"
JWT_EXPIRES_IN="7d"
PORT=3000
NODE_ENV=development

# Rate Limiting Configuration
RATE_LIMIT_ENABLED=true
RATE_LIMIT_AUTH_MAX=5
RATE_LIMIT_API_MAX=100
RATE_LIMIT_GLOBAL_MAX=200
RATE_LIMIT_WINDOW_MS=900000
```

### 4. Set up the database

Create PostgreSQL databases:

```bash
createdb taskmanager
createdb taskmanager_test  # For testing
```

Or using PostgreSQL command line:

```bash
psql -U postgres
CREATE DATABASE taskmanager;
CREATE DATABASE taskmanager_test;
```

### 5. Run database migrations

```bash
npm run prisma:migrate
```

This will:

-   Create the database schema
-   Generate Prisma Client

### 6. (Optional) Seed the database

```bash
npm run prisma:seed
```

## ⚙️ Configuration

### Environment Variables

| Variable                | Description                                | Default                      |
| ----------------------- | ------------------------------------------ | ---------------------------- |
| `DATABASE_URL`          | PostgreSQL connection string               | Required                     |
| `TEST_DATABASE_URL`     | Test database connection string            | Required                     |
| `JWT_SECRET`            | Secret key for JWT token signing           | Required                     |
| `JWT_EXPIRES_IN`        | JWT token expiration time                  | `7d`                         |
| `PORT`                  | Server port                                | `3000`                       |
| `NODE_ENV`              | Environment (development/production/test)  | `development`                |
| `LOG_LEVEL`             | Logging level (error/warn/info/debug)      | `info` (prod), `debug` (dev) |
| `RATE_LIMIT_ENABLED`    | Enable/disable rate limiting               | `true`                       |
| `RATE_LIMIT_AUTH_MAX`   | Max requests per window for auth endpoints | `5`                          |
| `RATE_LIMIT_API_MAX`    | Max requests per window for API endpoints  | `100`                        |
| `RATE_LIMIT_GLOBAL_MAX` | Global max requests per window             | `200`                        |
| `RATE_LIMIT_WINDOW_MS`  | Rate limit window in milliseconds          | `900000` (15 min)            |

### Logging

The application uses **pino** for high-performance structured logging. Logs are automatically configured based on the environment:

-   **Development**: Pretty-printed, human-readable logs with colors and timestamps
-   **Production**: Structured JSON logs optimized for log aggregation systems (e.g., ELK, Datadog, CloudWatch)

#### Log Levels

Configure log verbosity using the `LOG_LEVEL` environment variable:

-   `error` - Only error logs
-   `warn` - Warnings and errors
-   `info` - Informational messages, warnings, and errors (default for production)
-   `debug` - Verbose logging including debug information (default for development)

#### Request ID

Every request automatically receives a unique `requestId` (UUID) that:

-   Is included in all log entries for request tracing
-   Is returned in the `X-Request-Id` response header
-   Can be used for distributed tracing and log correlation

Example log entry (production):

```json
{
    "level": 30,
    "time": "2024-01-15T10:30:45.123Z",
    "msg": "Task created successfully",
    "requestId": "550e8400-e29b-41d4-a716-446655440000",
    "userId": "user-uuid-here",
    "endpoint": "/projects/123/tasks",
    "method": "POST"
}
```

#### Error Logging

Errors are logged with full context including:

-   Request ID
-   User ID (if authenticated)
-   Endpoint and HTTP method
-   Full error stack traces
-   Error name and code (if available)

Sensitive data (passwords, tokens, secrets) is never logged.

### Production Configuration

For the production environment at [https://canario-disruptica-tm-api.qmono1.easypanel.host/](https://canario-disruptica-tm-api.qmono1.easypanel.host/), ensure all environment variables are properly configured according to your hosting platform requirements.

**Important Security Notes:**

-   Use a strong, random `JWT_SECRET` in production
-   Set `NODE_ENV=production`
-   Use environment-specific database URLs
-   Review rate limiting settings based on expected traffic
-   Set `LOG_LEVEL=info` in production for optimal performance

## 🏃 Running the Application

### Development Mode

Start the development server with hot-reload:

```bash
npm run dev
```

The API will be available at `http://localhost:3000`

### Production Mode

1. Build the application:

```bash
npm run build
```

2. Run database migrations:

```bash
npm run prisma:migrate:deploy
```

3. Start the server:

```bash
npm start
```

### Using Docker

Build and run with Docker:

```bash
docker build -t disruptica-task-manager .
docker run -p 3000:3000 --env-file .env disruptica-task-manager
```

**Note**: Make sure your PostgreSQL database is accessible from the Docker container.

### Production API

The production API is deployed at:  
**https://canario-disruptica-tm-api.qmono1.easypanel.host/**

All API endpoints are available at this URL. Visit `/api-docs` for interactive documentation.

## 📚 API Documentation

Interactive API documentation is available via Swagger UI:

**Local Development**: `http://localhost:3000/api-docs`  
**Production**: [https://canario-disruptica-tm-api.qmono1.easypanel.host/api-docs](https://canario-disruptica-tm-api.qmono1.easypanel.host/api-docs)  
**OpenAPI JSON**: `http://localhost:3000/api-docs.json`

The Swagger UI provides:

-   Complete API endpoint documentation
-   Request/response schemas
-   Interactive API testing
-   Authentication support

### Quick Start Example

1. **Register a new user**:

```bash
curl -X POST https://canario-disruptica-tm-api.qmono1.easypanel.host/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "name": "John Doe"
  }'
```

2. **Login**:

```bash
curl -X POST https://canario-disruptica-tm-api.qmono1.easypanel.host/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

Response:

```json
{
    "user": {
        "id": "uuid",
        "email": "user@example.com",
        "name": "John Doe",
        "role": "member"
    },
    "token": "your-jwt-token-here"
}
```

3. **Use the JWT token** for authenticated requests:

```bash
curl -X GET https://canario-disruptica-tm-api.qmono1.easypanel.host/api/v1/projects \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Note**: Replace `https://canario-disruptica-tm-api.qmono1.easypanel.host` with `http://localhost:3000` for local development.

## 🔄 Idempotency Keys

The API supports idempotency keys to prevent duplicate resource creation when retrying requests. This is especially useful for network failures or client-side retries.

### Supported Endpoints

Idempotency key support is available for the following POST endpoints:

-   `POST /api/v1/projects` - Create project
-   `POST /api/v1/projects/:projectId/tasks` - Create task
-   `POST /api/v1/tasks/:taskId/comments` - Create comment

### How It Works

1. **Send Request with Idempotency Key**: Include an `Idempotency-Key` header with a unique value (e.g., UUID)
2. **First Request**: The API processes the request normally and stores the response
3. **Duplicate Request**: If the same key is used within 24 hours, the API returns the cached response without creating a duplicate resource

### Key Scoping

Idempotency keys are scoped by:
-   **User ID** - Each user has their own idempotency key namespace
-   **HTTP Method** - Different methods are isolated
-   **Request Path** - Path parameters (like `projectId`, `taskId`) are included in the scope
-   **Key Value** - The actual idempotency key value

This means:
-   The same key can be used for different endpoints
-   The same key can be used by different users
-   Path parameters ensure keys are scoped correctly (e.g., different `projectId` values create different scopes)

### Example Usage

**Create a project with idempotency key:**

```bash
curl -X POST https://canario-disruptica-tm-api.qmono1.easypanel.host/api/v1/projects \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000" \
  -d '{
    "name": "My Project",
    "description": "Project description"
  }'
```

**Retry the same request (duplicate):**

```bash
# Same request with same idempotency key - returns cached response
curl -X POST https://canario-disruptica-tm-api.qmono1.easypanel.host/api/v1/projects \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000" \
  -d '{
    "name": "My Project",
    "description": "Project description"
  }'
```

The second request will return the same response as the first, without creating a duplicate project.

### Key Expiration

-   Idempotency keys expire after **24 hours**
-   Expired keys are automatically cleaned up
-   After expiration, the same key can be reused for a new request

### Error Handling

-   **Invalid Format**: Returns `400 Bad Request` with `INVALID_IDEMPOTENCY_KEY` error code
-   **Unauthorized**: Returns `401 Unauthorized` if authentication is required but not provided
-   **Key Expired**: Expired keys are automatically deleted and the request proceeds normally

### Best Practices

1. **Generate Unique Keys**: Use UUIDs or other unique identifiers for idempotency keys
2. **Store Keys Client-Side**: Keep track of idempotency keys for retry scenarios
3. **Key Per Operation**: Use a new key for each distinct operation
4. **Handle Cached Responses**: Be prepared to receive cached responses (status 200) instead of creation responses (status 201) on retries

### Notes

-   Idempotency keys are **optional** - requests without the header proceed normally
-   Only **201 Created** responses are cached
-   The middleware fails open - if idempotency checking fails, the request proceeds normally
-   Other endpoints (PUT, DELETE) are naturally idempotent and don't require idempotency keys
-   Endpoints with unique constraints (like `POST /auth/register` with unique email) are already idempotent

## 🔄 API Versioning

The API uses URI-based versioning with support for version negotiation via HTTP headers.

### Base Path

All public API endpoints are available under the `/api/v1` prefix:

- **Base URL**: `/api/v1`
- **Supported Versions**: `v1`

### Version Negotiation

The API supports optional version negotiation via the `Accept-Version` HTTP header:

- **Header**: `Accept-Version: v1`
- **Default**: If no header is provided, the API defaults to `v1`
- **Invalid Version**: If an unsupported version is requested, the API returns `400 Bad Request` with details

### Example Requests

**Without Accept-Version header** (defaults to v1):
```bash
curl -X GET http://localhost:3000/api/v1/projects \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**With Accept-Version header**:
```bash
curl -X GET http://localhost:3000/api/v1/projects \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Accept-Version: v1"
```

**Unsupported version** (returns 400):
```bash
curl -X GET http://localhost:3000/api/v1/projects \
  -H "Accept-Version: v2"
```

Response:
```json
{
  "error": "Unsupported API version",
  "supportedVersions": ["v1"],
  "requestedVersion": "v2"
}
```

### Unversioned Endpoints

The following endpoints remain unversioned (internal/utility routes):

- `GET /` - API information
- `GET /health` - Health check
- `GET /api-docs` - Swagger UI documentation
- `GET /api-docs.json` - OpenAPI JSON spec

## 📡 API Endpoints

### Authentication

| Method | Endpoint                    | Description             | Auth Required |
| ------ | --------------------------- | ----------------------- | ------------- |
| POST   | `/api/v1/auth/register`     | Register a new user     | No            |
| POST   | `/api/v1/auth/login`        | Login and get JWT token | No            |
| GET    | `/api/v1/auth/me`           | Get current user info   | Yes           |

**Rate Limit**: Auth endpoints have stricter rate limiting (5 requests per 15 minutes by default)

### Users

| Method | Endpoint            | Description                                        | Auth Required |
| ------ | ------------------- | -------------------------------------------------- | ------------- |
| GET    | `/api/v1/users`     | Get all users (with pagination, filtering, search) | Yes           |
| GET    | `/api/v1/users/:id` | Get user by ID                                     | Yes           |

**Query Parameters** (for GET `/users`):

-   `page`, `limit` - Pagination
-   `search` - Search in name and email (case-insensitive)
-   `name`, `email`, `role` - Filter by exact values
-   `createdAfter`, `createdBefore`, `updatedAfter`, `updatedBefore` - Date filters
-   `sortBy`, `sortOrder` - Sorting options
-   `fields` - Select specific fields to include

### Projects

| Method | Endpoint                                  | Description                                          | Auth Required    |
| ------ | ----------------------------------------- | ---------------------------------------------------- | ---------------- |
| POST   | `/api/v1/projects`                       | Create a new project (supports idempotency keys)    | Yes              |
| GET    | `/api/v1/projects`                       | Get all user's projects (with filtering, pagination) | Yes              |
| GET    | `/api/v1/projects/:id`                   | Get project by ID                                    | Yes              |
| PUT    | `/api/v1/projects/:id`                   | Update project                                       | Yes (Owner only) |
| DELETE | `/api/v1/projects/:id`                   | Delete project                                       | Yes (Owner only) |
| POST   | `/api/v1/projects/:id/members`           | Add member to project                                | Yes (Owner only) |
| DELETE | `/api/v1/projects/:id/members/:userId`   | Remove member from project                           | Yes (Owner only) |

**Query Parameters** (for GET `/projects`):

-   `page`, `limit` - Pagination
-   `include` - Include relations (owner, members, tasks)
-   `search` - Search in name and description
-   `name`, `ownerId` - Filter by exact values
-   `createdAfter`, `createdBefore` - Date filters
-   `sortBy`, `sortOrder` - Sorting options

### Tasks

| Method | Endpoint                                 | Description                | Auth Required |
| ------ | ---------------------------------------- | -------------------------- | ------------- |
| POST   | `/api/v1/projects/:projectId/tasks`      | Create a task in a project (supports idempotency keys) | Yes           |
| GET    | `/api/v1/projects/:projectId/tasks`      | Get all tasks in project   | Yes           |
| GET    | `/api/v1/tasks/:id`                      | Get task by ID             | Yes           |
| PUT    | `/api/v1/tasks/:id`                      | Update task                | Yes           |
| DELETE | `/api/v1/tasks/:id`                      | Delete task                | Yes           |

**Query Parameters** (for GET `/projects/:projectId/tasks`):

-   `page`, `limit` - Pagination
-   `search` - Search in title and description
-   `title`, `status`, `priority` - Filter by exact values
-   `assignedToId`, `createdById` - Filter by user IDs
-   `unassigned` - Filter for assigned/unassigned tasks (true/false)
-   `createdAfter`, `createdBefore`, `updatedAfter`, `updatedBefore` - Date filters
-   `sortBy`, `sortOrder` - Sorting options (title, status, priority, createdAt, updatedAt)
-   `include` - Include relations (comments, project, assignedTo, createdBy)

**Task Status Values**: `todo`, `in-progress`, `done` (customizable)

**Task Priority Values**: `low`, `medium`, `high` (customizable)

### Comments

| Method | Endpoint                              | Description                 | Auth Required     |
| ------ | ------------------------------------- | --------------------------- | ----------------- |
| POST   | `/api/v1/tasks/:taskId/comments`      | Create a comment on a task (supports idempotency keys)  | Yes               |
| GET    | `/api/v1/tasks/:taskId/comments`      | Get all comments for a task | Yes               |
| GET    | `/api/v1/comments/:id`                | Get comment by ID           | Yes               |
| DELETE | `/api/v1/comments/:id`                | Delete comment              | Yes (Author only) |

**Query Parameters** (for GET `/tasks/:taskId/comments`):

-   `page`, `limit` - Pagination
-   `search` - Search in comment content
-   `authorId` - Filter by author user ID
-   `myComments` - Filter by current user (true/false)
-   `createdAfter`, `createdBefore`, `updatedAfter`, `updatedBefore` - Date filters
-   `sortBy`, `sortOrder` - Sorting options (createdAt, updatedAt)
-   `include` - Include relations (task, author)

## 🧪 Testing

Run the test suite:

```bash
npm test
```

The tests use a separate test database (`TEST_DATABASE_URL`). Make sure it's configured in your `.env` file.

Tests are located in the `tests/` directory and include:

-   Authentication tests
-   Project management tests
-   Task management tests
-   Comment tests
-   Rate limiter tests

## 📁 Project Structure

```
disruptica-task-manager/
├── src/
│   ├── app.ts                 # Express app configuration
│   ├── server.ts              # Server entry point
│   ├── config/                # Configuration files
│   │   ├── env.ts            # Environment variables validation
│   │   ├── prisma.ts         # Prisma client singleton
│   │   └── swagger.ts        # Swagger/OpenAPI configuration
│   ├── middlewares/           # Express middlewares
│   │   ├── auth.middleware.ts         # JWT authentication
│   │   ├── error.middleware.ts        # Error handling
│   │   ├── idempotency.middleware.ts  # Idempotency key support
│   │   ├── project-owner.middleware.ts # Project ownership verification
│   │   └── rateLimiter.middleware.ts  # Rate limiting
│   ├── modules/               # Feature modules
│   │   ├── auth/             # Authentication routes, controllers, services
│   │   ├── users/            # User management
│   │   ├── projects/         # Project management
│   │   ├── tasks/            # Task management
│   │   └── comments/         # Comment management
│   └── utils/                 # Utility functions
│       ├── jwt.ts            # JWT token generation/verification
│       └── password.ts       # Password hashing/verification
├── prisma/
│   ├── schema.prisma          # Database schema definition
│   ├── migrations/            # Database migrations
│   └── seed.ts               # Database seeder
├── tests/                     # Test files
│   ├── setup.ts              # Test setup configuration
│   ├── auth.test.ts
│   ├── projects.test.ts
│   ├── tasks.test.ts
│   ├── comments.test.ts
│   └── rateLimiter.test.ts
├── dist/                      # Compiled JavaScript (generated)
├── Dockerfile                 # Docker configuration
├── env.template               # Environment variables template
├── jest.config.js            # Jest test configuration
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
└── README.md                 # This file
```

## 🚢 Deployment

### Prerequisites for Production

1. Set `NODE_ENV=production` in your environment
2. Use a strong, random `JWT_SECRET` (minimum 32 characters)
3. Configure production database URL
4. Set up proper rate limiting values based on expected traffic
5. Enable HTTPS/SSL
6. Configure firewall rules
7. Set up monitoring and logging

### Database Migrations in Production

Run migrations before starting the application:

```bash
npm run prisma:migrate:deploy
```

This applies all pending migrations without creating new ones.

### Docker Deployment

The included `Dockerfile` uses a multi-stage build for optimized production images:

1. **Build stage**: Installs dependencies, generates Prisma Client, compiles TypeScript
2. **Production stage**: Only includes production dependencies and compiled code

Build and run:

```bash
docker build -t disruptica-task-manager .
docker run -p 3000:3000 --env-file .env disruptica-task-manager
```

### Environment-Specific Configuration

Ensure production environment variables are set:

-   Strong `JWT_SECRET`
-   Production `DATABASE_URL`
-   Appropriate `PORT`
-   Rate limiting configured for production load
-   `NODE_ENV=production`

### Health Checks

The production API is available at:

-   Base URL: [https://canario-disruptica-tm-api.qmono1.easypanel.host/](https://canario-disruptica-tm-api.qmono1.easypanel.host/)
-   Documentation: [https://canario-disruptica-tm-api.qmono1.easypanel.host/api-docs](https://canario-disruptica-tm-api.qmono1.easypanel.host/api-docs)

## 🐛 Troubleshooting

### Database Connection Issues

**Problem**: Cannot connect to PostgreSQL

**Solutions**:

-   Verify PostgreSQL is running: `pg_isready`
-   Check `DATABASE_URL` format in `.env`
-   Ensure database exists: `psql -l`
-   Verify network connectivity and firewall rules
-   Check PostgreSQL logs for connection errors

### Migration Issues

**Problem**: Migration fails or Prisma Client not generated

**Solutions**:

-   Generate Prisma Client: `npm run prisma:generate`
-   Check migration status: `npx prisma migrate status`
-   Reset database (dev only): `npx prisma migrate reset`
-   Verify database connection string
-   Check for pending migrations: `npx prisma migrate dev`

### Port Already in Use

**Problem**: Port 3000 is already in use

**Solutions**:

-   Change `PORT` in `.env` file
-   Find and kill the process: `lsof -ti:3000 | xargs kill`
-   Use a different port: `PORT=3001 npm run dev`

### Authentication Errors

**Problem**: JWT token invalid or expired

**Solutions**:

-   Verify `JWT_SECRET` matches the one used to create the token
-   Check token expiration (`JWT_EXPIRES_IN`)
-   Ensure token is sent in `Authorization: Bearer <token>` header
-   Verify token format (no extra spaces or quotes)

### Rate Limiting Issues

**Problem**: Getting 429 Too Many Requests errors

**Solutions**:

-   Check rate limit configuration in `.env`
-   Verify `RATE_LIMIT_WINDOW_MS` is set correctly
-   Adjust limits based on your use case
-   Implement exponential backoff in client applications

### TypeScript Compilation Errors

**Problem**: Type errors during build

**Solutions**:

-   Run `npm run prisma:generate` to update Prisma types
-   Check `tsconfig.json` configuration
-   Ensure all dependencies are installed: `npm install`
-   Clear build directory: `rm -rf dist`

## 📝 Available Scripts

| Script                          | Description                                          |
| ------------------------------- | ---------------------------------------------------- |
| `npm run dev`                   | Start development server with hot-reload (tsx watch) |
| `npm run build`                 | Build TypeScript for production                      |
| `npm start`                     | Start production server (requires build first)       |
| `npm test`                      | Run test suite with Jest                             |
| `npm run prisma:generate`       | Generate Prisma Client                               |
| `npm run prisma:migrate`        | Run database migrations (development)                |
| `npm run prisma:migrate:deploy` | Deploy migrations (production)                       |
| `npm run prisma:seed`           | Seed the database with sample data                   |
| `npm run prisma:studio`         | Open Prisma Studio GUI for database management       |

## 📄 License

[Specify your license here]

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 Support

For support and questions:

-   Check the [API Documentation](https://canario-disruptica-tm-api.qmono1.easypanel.host/api-docs)
-   Review the [Database Schema Diagram](https://dbdiagram.io/d/disruptica-696958add6e030a02430399f)
-   Open an issue on GitHub

---

**Built with ❤️ using Node.js, Express, TypeScript, and PostgreSQL**

For detailed API documentation, visit `/api-docs` when the server is running.
