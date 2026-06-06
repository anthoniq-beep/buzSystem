import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const departments = [
    { name: '总经办', code: 'CEO' },
    { name: '市场营销部', code: 'MKT' },
    { name: '网络运营部', code: 'OPS' },
    { name: '渠道销售部', code: 'CHN' },
    { name: '人力资源部', code: 'HR' },
    { name: '财务部', code: 'FIN' },
    { name: '教培部', code: 'EDU' }
  ];

  console.log('Start seeding departments...');

  for (const dept of departments) {
    const existing = await prisma.department.findFirst({
        where: { name: dept.name }
    });
    
    if (!existing) {
        await prisma.department.create({
            data: { name: dept.name }
        });
        console.log(`Created department: ${dept.name}`);
    } else {
        console.log(`Department exists: ${dept.name}`);
    }
  }

  console.log('Start seeding users...');

  // Create Admin User
  const adminExists = await prisma.user.findUnique({ where: { username: 'admin' } });
  if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const adminDept = await prisma.department.findFirst({ where: { name: '总经办' } });
      
      await prisma.user.create({
          data: {
              username: 'admin',
              password: hashedPassword,
              name: '系统管理员',
              role: 'ADMIN',
              phone: '13800000000',
              departmentId: adminDept ? adminDept.id : null,
              status: 'REGULAR'
          }
      });
      console.log('Created user: admin');
  } else {
      console.log('User admin exists');
  }

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
