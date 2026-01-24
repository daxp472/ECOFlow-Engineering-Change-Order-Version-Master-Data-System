import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting user seed...');

  const password = await bcrypt.hash('password123', 10);

  // Default Admins logic
  await prisma.user.upsert({
    where: { email: 'admin@ecoflow.com' },
    update: {},
    create: {
      email: 'admin@ecoflow.com',
      name: 'Admin User',
      password,
      roles: [UserRole.ADMIN],
      status: UserStatus.ACTIVE,
    },
  });

  const usersList = [
    // Super Admins (Admin + All Roles for testing)
    { name: 'Kanishka', roles: [UserRole.ADMIN, UserRole.APPROVER, UserRole.ENGINEERING, UserRole.OPERATIONS] },
    { name: 'Krish', roles: [UserRole.ADMIN, UserRole.APPROVER, UserRole.ENGINEERING, UserRole.OPERATIONS] },
    { name: 'Kalpan', roles: [UserRole.ADMIN, UserRole.APPROVER, UserRole.ENGINEERING, UserRole.OPERATIONS] },
    { name: 'Kalp', roles: [UserRole.ADMIN, UserRole.APPROVER, UserRole.ENGINEERING, UserRole.OPERATIONS] },

    // Lead Approvers (Approver + Engineering)
    { name: 'Dax', roles: [UserRole.APPROVER, UserRole.ENGINEERING] },
    { name: 'Priy', roles: [UserRole.APPROVER, UserRole.ENGINEERING] },
    { name: 'Dhruvesh', roles: [UserRole.APPROVER, UserRole.OPERATIONS] },
    { name: 'Nehil', roles: [UserRole.APPROVER, UserRole.ENGINEERING] },
    { name: 'Het', roles: [UserRole.APPROVER, UserRole.OPERATIONS] },

    // Core Engineering
    { name: 'Pawan', roles: [UserRole.ENGINEERING] },
    { name: 'Aniket', roles: [UserRole.ENGINEERING] },
    { name: 'Arya', roles: [UserRole.ENGINEERING] },
    { name: 'Kiran', roles: [UserRole.ENGINEERING] },
    { name: 'Vanshika 1', roles: [UserRole.ENGINEERING] },
    { name: 'Vanshika 2', roles: [UserRole.ENGINEERING] },
    { name: 'Khushi', roles: [UserRole.ENGINEERING] },
    { name: 'Isha', roles: [UserRole.ENGINEERING] },
    { name: 'RIjans', roles: [UserRole.ENGINEERING] },
    { name: 'Dhruv', roles: [UserRole.ENGINEERING] },
    { name: 'Jatin', roles: [UserRole.ENGINEERING] },
    { name: 'Ishita', roles: [UserRole.ENGINEERING] },
    { name: 'Dristi', roles: [UserRole.ENGINEERING] },
    { name: 'Mahir', roles: [UserRole.ENGINEERING] },
    { name: 'Kk', roles: [UserRole.ENGINEERING] },
    { name: 'Homasvi', roles: [UserRole.ENGINEERING] },
    { name: 'Jatan', roles: [UserRole.ENGINEERING] },

    // Operations Team
    { name: 'Garvit', roles: [UserRole.OPERATIONS] },
    { name: 'Priyasha', roles: [UserRole.OPERATIONS] },
    { name: 'Khushbu', roles: [UserRole.OPERATIONS] },
    { name: 'Dhruvil', roles: [UserRole.OPERATIONS] },
    { name: 'Yashvi', roles: [UserRole.OPERATIONS] },
    { name: 'Arjun', roles: [UserRole.OPERATIONS] },
    { name: 'Krishna', roles: [UserRole.OPERATIONS] },
    { name: 'Deep', roles: [UserRole.OPERATIONS] },
    { name: 'Dev', roles: [UserRole.OPERATIONS] },
    { name: 'Kashyap', roles: [UserRole.OPERATIONS] },
    { name: 'Shubham', roles: [UserRole.OPERATIONS] },
  ];

  for (const u of usersList) {
    try {
      const email = `${u.name.toLowerCase().replace(/\s+/g, '')}@gmail.com`;
      await prisma.user.upsert({
        where: { email },
        update: { roles: u.roles },
        create: {
          email,
          name: u.name,
          password,
          roles: u.roles,
          status: UserStatus.ACTIVE,
        }
      });
      console.log(`Created user: ${u.name} (${email}) - Roles: ${u.roles.join(', ')}`);
    } catch (err) {
      console.error(`Failed to create user ${u.name}:`, err);
    }
  }

  console.log('✅ Batch Users created successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
