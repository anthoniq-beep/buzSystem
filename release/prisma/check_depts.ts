import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const depts = await prisma.department.findMany({ include: { children: true } });
  console.log('All Departments:', JSON.stringify(depts, null, 2));
  
  const users = await prisma.user.findMany({ 
      select: { id: true, name: true, departmentId: true, department: { select: { name: true } } }
  });
  console.log('Users and their departments:', JSON.stringify(users, null, 2));
}

main().finally(() => prisma.$disconnect());
