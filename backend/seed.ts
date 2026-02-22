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

  // 2. Create Departments
  const salesDept = await prisma.department.create({
    data: { name: '销售部' }
  });
  console.log('Created Department: 销售部');

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

  // 4. Create Channels
  const onlineChannel = await prisma.channel.create({
    data: {
      name: '线上广告',
      type: ChannelType.ONLINE,
      status: ChannelStatus.ACTIVE,
    }
  });
  console.log('Created Channel:', onlineChannel.name);

  // 5. Create Customers
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
