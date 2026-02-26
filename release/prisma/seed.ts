import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const departments = [
    { name: '总经办', code: 'CEO' },
    { name: '市场营销部', code: 'MKT' },
    { name: '网络运营部', code: 'OPS' },
    { name: '人力资源部', code: 'HR' },
    { name: '财务部', code: 'FIN' }
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

  // Clean up wrong departments
  // Default target for migration: '市场营销部'
  const mktDept = await prisma.department.findFirst({ where: { name: '市场营销部' } });
  
  if (mktDept) {
      const standardNames = departments.map(d => d.name);
      
      // Find departments that are NOT in our standard list
      const wrongDepts = await prisma.department.findMany({
          where: {
              name: { notIn: standardNames }
          }
      });
      
      for (const wrongDept of wrongDepts) {
          console.log(`Found non-standard department: ${wrongDept.name} (ID: ${wrongDept.id})`);
          
          // Migrate users to Marketing Department
          const updateResult = await prisma.user.updateMany({
              where: { departmentId: wrongDept.id },
              data: { departmentId: mktDept.id }
          });
          console.log(`Migrated ${updateResult.count} users to 市场营销部`);
          
          // Delete wrong dept
          try {
              // Check for sub-departments first?
              // If recursive delete is not enabled in schema, we might fail.
              // But let's try.
              await prisma.department.delete({ where: { id: wrongDept.id } });
              console.log(`Deleted department: ${wrongDept.name}`);
          } catch (e) {
              console.error(`Could not delete ${wrongDept.name}:`, e);
          }
      }
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
