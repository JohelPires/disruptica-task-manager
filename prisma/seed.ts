import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/utils/password';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

async function main() {
  const ownerPassword = await hashPassword('owner123');
  const memberPassword = await hashPassword('member123');

  const existingOwner = await prisma.user.findUnique({
    where: { email: 'owner@example.com' },
  });

  const existingMember = await prisma.user.findUnique({
    where: { email: 'member@example.com' },
  });

  const owner = existingOwner || await prisma.user.create({
    data: {
      email: 'owner@example.com',
      password: ownerPassword,
      name: 'Global Owner',
      role: 'owner',
    },
  });

  const member = existingMember || await prisma.user.create({
    data: {
      email: 'member@example.com',
      password: memberPassword,
      name: 'Project Member',
      role: 'member',
    },
  });

  await prisma.task.deleteMany({
    where: {
      project: {
        name: 'Seed Project',
      },
    },
  });

  await prisma.project.deleteMany({
    where: {
      name: 'Seed Project',
    },
  });

  const project = await prisma.project.create({
    data: {
      name: 'Seed Project',
      description: 'A project created by seed script',
      ownerId: member.id,
    },
  });

  const task = await prisma.task.create({
    data: {
      title: 'Seed Task',
      description: 'A task created by seed script',
      status: 'todo',
      priority: 'medium',
      projectId: project.id,
      createdById: member.id,
    },
  });

  console.log('Seed data created:', {
    owner: owner.email,
    member: member.email,
    project: project.name,
    task: task.title,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

