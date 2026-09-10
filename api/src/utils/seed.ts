import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  await prisma.usageLimit.upsert({
    where: { role: 'USER' },
    update: {},
    create: { role: 'USER', dailyLimit: 50, monthlyLimit: 1000 },
  });

  await prisma.usageLimit.upsert({
    where: { role: 'ADMIN' },
    update: {},
    create: { role: 'ADMIN', dailyLimit: 500, monthlyLimit: 10000 },
  });

  const adminPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@scriptgpt.com' },
    update: {},
    create: {
      email: 'admin@scriptgpt.com',
      username: 'admin',
      password: adminPassword,
      role: 'ADMIN',
      dailyLimit: 500,
      monthlyLimit: 10000,
    },
  });

  console.log('Admin user created:', admin.email);
  console.log('Default password: admin123');
  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
