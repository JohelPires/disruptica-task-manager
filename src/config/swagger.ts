import swaggerJsdoc from 'swagger-jsdoc'
import { env } from './env'
import path from 'path'

const options: swaggerJsdoc.Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Task Management System API',
            version: '1.0.0',
            description:
                'A comprehensive REST API for managing tasks, projects, users, and comments',
            contact: {
                name: 'API Support',
            },
        },
        servers: [
            // Production/server URL from environment (if provided)
            ...(process.env.API_BASE_URL
                ? [
                      {
                          url: process.env.API_BASE_URL,
                          description: 'Production server',
                      },
                  ]
                : []),
            // Development server (always include for local development)
            {
                url: `http://localhost:${env.PORT}`,
                description: 'Development server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description:
                        'Enter JWT token obtained from /auth/login or /auth/register',
                },
            },
            schemas: {
                User: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid',
                            description: 'Unique user identifier',
                        },
                        email: {
                            type: 'string',
                            format: 'email',
                            description: 'User email address',
                        },
                        name: {
                            type: 'string',
                            description: 'User full name',
                        },
                        role: {
                            type: 'string',
                            enum: ['owner', 'member'],
                            description: 'User role',
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                            description: 'User creation timestamp',
                        },
                        updatedAt: {
                            type: 'string',
                            format: 'date-time',
                            description: 'User last update timestamp',
                        },
                    },
                },
                Project: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid',
                            description: 'Unique project identifier',
                        },
                        name: {
                            type: 'string',
                            description: 'Project name',
                        },
                        description: {
                            type: 'string',
                            nullable: true,
                            description: 'Project description',
                        },
                        ownerId: {
                            type: 'string',
                            format: 'uuid',
                            description: 'ID of the project owner',
                        },
                        owner: {
                            $ref: '#/components/schemas/User',
                        },
                        members: {
                            type: 'array',
                            items: {
                                $ref: '#/components/schemas/ProjectMember',
                            },
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                        },
                        updatedAt: {
                            type: 'string',
                            format: 'date-time',
                        },
                    },
                },
                ProjectMember: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid',
                        },
                        projectId: {
                            type: 'string',
                            format: 'uuid',
                        },
                        userId: {
                            type: 'string',
                            format: 'uuid',
                        },
                        role: {
                            type: 'string',
                        },
                        user: {
                            $ref: '#/components/schemas/User',
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                        },
                    },
                },
                Task: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid',
                            description: 'Unique task identifier',
                        },
                        title: {
                            type: 'string',
                            description: 'Task title',
                        },
                        description: {
                            type: 'string',
                            nullable: true,
                            description: 'Task description',
                        },
                        status: {
                            type: 'string',
                            default: 'todo',
                            description: 'Task status',
                        },
                        priority: {
                            type: 'string',
                            default: 'medium',
                            description: 'Task priority',
                        },
                        projectId: {
                            type: 'string',
                            format: 'uuid',
                            description:
                                'ID of the project this task belongs to',
                        },
                        assignedToId: {
                            type: 'string',
                            format: 'uuid',
                            nullable: true,
                            description: 'ID of the user assigned to this task',
                        },
                        createdById: {
                            type: 'string',
                            format: 'uuid',
                            description: 'ID of the user who created this task',
                        },
                        assignedTo: {
                            $ref: '#/components/schemas/User',
                            nullable: true,
                        },
                        createdBy: {
                            $ref: '#/components/schemas/User',
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                        },
                        updatedAt: {
                            type: 'string',
                            format: 'date-time',
                        },
                    },
                },
                Comment: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid',
                            description: 'Unique comment identifier',
                        },
                        content: {
                            type: 'string',
                            description: 'Comment content',
                        },
                        taskId: {
                            type: 'string',
                            format: 'uuid',
                            description:
                                'ID of the task this comment belongs to',
                        },
                        authorId: {
                            type: 'string',
                            format: 'uuid',
                            description:
                                'ID of the user who created this comment',
                        },
                        author: {
                            $ref: '#/components/schemas/User',
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                        },
                        updatedAt: {
                            type: 'string',
                            format: 'date-time',
                        },
                    },
                },
                RegisterRequest: {
                    type: 'object',
                    required: ['email', 'password', 'name'],
                    properties: {
                        email: {
                            type: 'string',
                            format: 'email',
                            description: 'User email address',
                        },
                        password: {
                            type: 'string',
                            minLength: 6,
                            description: 'User password (minimum 6 characters)',
                        },
                        name: {
                            type: 'string',
                            minLength: 1,
                            description: 'User full name',
                        },
                        role: {
                            type: 'string',
                            enum: ['owner', 'member'],
                            default: 'member',
                            description:
                                'User role (optional, defaults to member)',
                        },
                    },
                },
                LoginRequest: {
                    type: 'object',
                    required: ['email', 'password'],
                    properties: {
                        email: {
                            type: 'string',
                            format: 'email',
                            description: 'User email address',
                        },
                        password: {
                            type: 'string',
                            description: 'User password',
                        },
                    },
                },
                AuthResponse: {
                    type: 'object',
                    properties: {
                        user: {
                            $ref: '#/components/schemas/User',
                        },
                        token: {
                            type: 'string',
                            description: 'JWT authentication token',
                        },
                    },
                },
                CreateProjectRequest: {
                    type: 'object',
                    required: ['name'],
                    properties: {
                        name: {
                            type: 'string',
                            minLength: 1,
                            description: 'Project name',
                        },
                        description: {
                            type: 'string',
                            description: 'Project description (optional)',
                        },
                    },
                },
                UpdateProjectRequest: {
                    type: 'object',
                    properties: {
                        name: {
                            type: 'string',
                            minLength: 1,
                            description: 'Project name',
                        },
                        description: {
                            type: 'string',
                            description: 'Project description',
                        },
                    },
                },
                AddMemberRequest: {
                    type: 'object',
                    required: ['userId', 'role'],
                    properties: {
                        userId: {
                            type: 'string',
                            format: 'uuid',
                            description: 'ID of the user to add as a member',
                        },
                        role: {
                            type: 'string',
                            minLength: 1,
                            description: 'Role of the member in the project',
                        },
                    },
                },
                CreateTaskRequest: {
                    type: 'object',
                    required: ['title'],
                    properties: {
                        title: {
                            type: 'string',
                            minLength: 1,
                            description: 'Task title',
                        },
                        description: {
                            type: 'string',
                            description: 'Task description (optional)',
                        },
                        status: {
                            type: 'string',
                            default: 'todo',
                            description: 'Task status',
                        },
                        priority: {
                            type: 'string',
                            default: 'medium',
                            description: 'Task priority',
                        },
                        assignedToId: {
                            type: 'string',
                            format: 'uuid',
                            nullable: true,
                            description:
                                'ID of the user to assign this task to (optional)',
                        },
                    },
                },
                UpdateTaskRequest: {
                    type: 'object',
                    properties: {
                        title: {
                            type: 'string',
                            minLength: 1,
                            description: 'Task title',
                        },
                        description: {
                            type: 'string',
                            description: 'Task description',
                        },
                        status: {
                            type: 'string',
                            description: 'Task status',
                        },
                        priority: {
                            type: 'string',
                            description: 'Task priority',
                        },
                        assignedToId: {
                            type: 'string',
                            format: 'uuid',
                            nullable: true,
                            description:
                                'ID of the user to assign this task to',
                        },
                    },
                },
                CreateCommentRequest: {
                    type: 'object',
                    required: ['content'],
                    properties: {
                        content: {
                            type: 'string',
                            minLength: 1,
                            description: 'Comment content',
                        },
                    },
                },
                ErrorResponse: {
                    type: 'object',
                    properties: {
                        error: {
                            type: 'object',
                            properties: {
                                message: {
                                    type: 'string',
                                    description: 'Error message',
                                },
                                code: {
                                    type: 'string',
                                    description: 'Error code',
                                },
                            },
                        },
                    },
                },
            },
        },
        tags: [
            {
                name: 'Authentication',
                description: 'User authentication and registration endpoints',
            },
            {
                name: 'Users',
                description: 'User management endpoints',
            },
            {
                name: 'Projects',
                description: 'Project management endpoints',
            },
            {
                name: 'Tasks',
                description: 'Task management endpoints',
            },
            {
                name: 'Comments',
                description: 'Comment management endpoints',
            },
        ],
    },
    apis:
        process.env.NODE_ENV === 'production'
            ? [
                  path.join(process.cwd(), 'dist/modules/**/*.routes.js'),
                  path.join(process.cwd(), 'dist/modules/**/*.controller.js'),
              ]
            : [
                  path.join(process.cwd(), 'src/modules/**/*.routes.ts'),
                  path.join(process.cwd(), 'src/modules/**/*.controller.ts'),
              ],
}

export const swaggerSpec = swaggerJsdoc(options)
