import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.user.findUnique({
    where: { email: 'admin@crm.com' },
  });

  if (existing) {
    console.log('Admin sudah ada, skip seeding.');
    return;
  }

  const hashed = await bcrypt.hash('admin123', 10);
  await prisma.user.create({
    data: {
      name: 'Admin',
      email: 'admin@crm.com',
      password: hashed,
      role: 'ADMIN',
    },
  });

  console.log('✅ Admin berhasil dibuat!');
  console.log('Email: admin@crm.com');
  console.log('Password: admin123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());