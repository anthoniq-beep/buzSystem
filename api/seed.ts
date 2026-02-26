import { PrismaClient, Role, EmployeeStatus, ChannelType, ChannelStatus, CustomerStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  // 1. Clean up existing data (optional, be careful in production)
  // await prisma.saleLog.deleteMany();
  // await prisma.salesTarget.deleteMany();
  // await prisma.customer.deleteMany();
  // await prisma.channel.deleteMany();
  // await prisma.user.deleteMany();
  // await prisma.department.deleteMany();

  // 2. Create/Find Departments
  let salesDept = await prisma.department.findFirst({ 
      where: { 
          name: { in: ['销售部', '市场营销部'] } 
      } 
  });
  
  if (!salesDept) {
    try {
        salesDept = await prisma.department.create({
            data: { name: '销售部' }
        });
        console.log('Created Department: 销售部');
    } catch (e) {
        console.log('Failed to create sales dept, might exist or ID conflict');
        // Fallback to fetching any department or handle error
        salesDept = await prisma.department.findFirst();
    }
  } else {
    console.log(`Department ${salesDept.name} already exists`);
  }

  let trainingDept = await prisma.department.findFirst({ where: { name: '教培部' } });
  if (!trainingDept) {
    try {
        trainingDept = await prisma.department.create({
            data: { name: '教培部' }
        });
        console.log('Created Department: 教培部');
    } catch (e) {
        console.log('Failed to create training dept');
    }
  } else {
    console.log('Department 教培部 already exists');
  }

  if (!salesDept || !trainingDept) {
      console.error('Required departments not found or created. Exiting.');
      return;
  }

  // 3. Create Users
  // Admin (already exists from previous step, skipping or handling error)
  try {
    const admin = await prisma.user.upsert({
      where: { username: 'admin' },
      update: {},
      create: {
        username: 'admin',
        password: 'password', // In real app: hash this
        name: '系统管理员',
        role: Role.ADMIN,
        status: EmployeeStatus.REGULAR,
      },
    });
    console.log('Upserted Admin:', admin.username);
  } catch (e) {
    console.log('Admin user might already exist');
  }

  // Manager
  const manager = await prisma.user.upsert({
    where: { username: 'manager1' },
    update: {},
    create: {
      username: 'manager1',
      password: 'password',
      name: '销售经理',
      role: Role.MANAGER,
      status: EmployeeStatus.REGULAR,
      departmentId: salesDept.id,
    },
  });
  console.log('Upserted Manager:', manager.username);

  // Sales Employee
  const sales1 = await prisma.user.upsert({
    where: { username: 'sales1' },
    update: {},
    create: {
      username: 'sales1',
      password: 'password',
      name: '销售专员A',
      role: Role.EMPLOYEE,
      status: EmployeeStatus.REGULAR,
      departmentId: salesDept.id,
      supervisorId: manager.id,
    },
  });
  console.log('Upserted Sales:', sales1.username);

  // Training Instructor
  const instructor1 = await prisma.user.upsert({
    where: { username: 'instructor1' },
    update: {},
    create: {
      username: 'instructor1',
      password: 'password',
      name: '教员A',
      role: Role.EMPLOYEE,
      status: EmployeeStatus.REGULAR,
      departmentId: trainingDept.id,
    },
  });
  console.log('Upserted Instructor:', instructor1.username);

  // 4. Create Channels
  let onlineChannel = await prisma.channel.findFirst({ where: { name: '线上广告' } });
  if (!onlineChannel) {
    onlineChannel = await prisma.channel.create({
      data: {
        name: '线上广告',
        type: ChannelType.ONLINE,
        status: ChannelStatus.ACTIVE,
      }
    });
    console.log('Created Channel: 线上广告');
  } else {
    console.log('Channel 线上广告 already exists');
  }

  // 5. Create Customers
  // Only create if not exists (check by phone)
  const existingCustomer1 = await prisma.customer.findFirst({ where: { phone: '13800138000' } });
  if (!existingCustomer1) {
      const customer1 = await prisma.customer.create({
        data: {
          name: '张三科技',
          phone: '13800138000',
          companyName: '张三科技有限公司',
          status: CustomerStatus.LEAD,
          channelId: onlineChannel.id,
          ownerId: sales1.id, // Assigned to sales1
        }
      });
      console.log('Created Customer:', customer1.name);
  }

  const existingCustomer2 = await prisma.customer.findFirst({ where: { phone: '13900139000' } });
  if (!existingCustomer2) {
      const customer2 = await prisma.customer.create({
        data: {
          name: '李四贸易',
          phone: '13900139000',
          companyName: '李四贸易有限公司',
          status: CustomerStatus.CHANCE,
          channelId: onlineChannel.id,
          ownerId: manager.id, // Assigned to manager
        }
      });
      console.log('Created Customer:', customer2.name);
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
