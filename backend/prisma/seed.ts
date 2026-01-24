import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clean existing data (in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('🧹 Cleaning existing data...');
    await prisma.auditLog.deleteMany();
    await prisma.eCOApproval.deleteMany();
    await prisma.eCO.deleteMany();
    await prisma.bOMOperation.deleteMany();
    await prisma.bOMComponent.deleteMany();
    await prisma.bOM.deleteMany();
    await prisma.productVersion.deleteMany();
    await prisma.product.deleteMany();
    await prisma.approvalStage.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();
  }

  // Hash password
  const hashedPassword = await bcrypt.hash('password123', 10);

  // Create Users
  console.log('👥 Creating users...');
  await prisma.user.create({
    data: {
      email: 'admin@ecoflow.com',
      password: hashedPassword,
      name: 'Admin User',
      roles: [UserRole.ADMIN, UserRole.APPROVER, UserRole.ENGINEERING], // Admin has all roles
      status: UserStatus.ACTIVE,
    },
  });

  await prisma.user.create({
    data: {
      email: 'engineer@ecoflow.com',
      password: hashedPassword,
      name: 'Engineering User',
      roles: [UserRole.ENGINEERING, UserRole.APPROVER], // Engineer can also approve
      status: UserStatus.ACTIVE,
    },
  });

  await prisma.user.create({
    data: {
      email: 'approver@ecoflow.com',
      password: hashedPassword,
      name: 'Approver User',
      roles: [UserRole.APPROVER],
      status: UserStatus.ACTIVE,
    },
  });

  await prisma.user.create({
    data: {
      email: 'operations@ecoflow.com',
      password: hashedPassword,
      name: 'Operations User',
      roles: [UserRole.OPERATIONS],
      status: UserStatus.ACTIVE,
    },
  });

  console.log('✅ Users created');

  // Create Approval Stages
  console.log('📋 Creating approval stages...');
  await prisma.approvalStage.createMany({
    data: [
      { name: 'New', order: 1, requiresApproval: false, isFinal: false },
      { name: 'Engineering Review', order: 2, requiresApproval: true, isFinal: false },
      { name: 'Manager Approval', order: 3, requiresApproval: true, isFinal: false },
      { name: 'Done', order: 4, requiresApproval: false, isFinal: true },
    ],
  });

  console.log('✅ Approval stages created');

  // Create Sample Products
  console.log('📦 Creating sample products...');
  
  const product1 = await prisma.product.create({
    data: {
      name: 'Wooden Table',
      status: 'ACTIVE',
      versions: {
        create: {
          version: 'v1.0',
          salePrice: 250.00,
          costPrice: 150.00,
          attachments: JSON.stringify([]),
          status: 'ACTIVE',
        },
      },
    },
    include: {
      versions: true,
    },
  });

  // Set current version
  await prisma.product.update({
    where: { id: product1.id },
    data: { currentVersionId: product1.versions[0].id },
  });

  const product2 = await prisma.product.create({
    data: {
      name: 'Office Chair',
      status: 'ACTIVE',
      versions: {
        create: {
          version: 'v1.0',
          salePrice: 180.00,
          costPrice: 100.00,
          attachments: JSON.stringify([]),
          status: 'ACTIVE',
        },
      },
    },
    include: {
      versions: true,
    },
  });

  await prisma.product.update({
    where: { id: product2.id },
    data: { currentVersionId: product2.versions[0].id },
  });

  // Create components
  const woodenLeg = await prisma.product.create({
    data: {
      name: 'Wooden Leg',
      status: 'ACTIVE',
      versions: {
        create: {
          version: 'v1.0',
          salePrice: 15.00,
          costPrice: 8.00,
          attachments: JSON.stringify([]),
          status: 'ACTIVE',
        },
      },
    },
    include: { versions: true },
  });

  await prisma.product.update({
    where: { id: woodenLeg.id },
    data: { currentVersionId: woodenLeg.versions[0].id },
  });

  const screw = await prisma.product.create({
    data: {
      name: 'Screw',
      status: 'ACTIVE',
      versions: {
        create: {
          version: 'v1.0',
          salePrice: 0.50,
          costPrice: 0.20,
          attachments: JSON.stringify([]),
          status: 'ACTIVE',
        },
      },
    },
    include: { versions: true },
  });

  await prisma.product.update({
    where: { id: screw.id },
    data: { currentVersionId: screw.versions[0].id },
  });

  console.log('✅ Products created');

  // Create BoM for Wooden Table
  console.log('🔧 Creating BoM...');
  await prisma.bOM.create({
    data: {
      productVersionId: product1.versions[0].id,
      version: 'v1.0',
      status: 'ACTIVE',
      components: {
        create: [
          { productId: woodenLeg.id, quantity: 4 },
          { productId: screw.id, quantity: 12 },
        ],
      },
      operations: {
        create: [
          { name: 'Assembly', time: 60, workCenter: 'Assembly Line', sequence: 1 },
          { name: 'Painting', time: 30, workCenter: 'Paint Floor', sequence: 2 },
          { name: 'Packing', time: 20, workCenter: 'Packaging Line', sequence: 3 },
        ],
      },
    },
  });

  console.log('✅ BoM created');

  console.log('');
  console.log('🎉 Seeding completed successfully!');
  console.log('');
  console.log('📧 Test Users:');
  console.log('  Admin:      admin@ecoflow.com / password123');
  console.log('  Engineer:   engineer@ecoflow.com / password123');
  console.log('  Approver:   approver@ecoflow.com / password123');
  console.log('  Operations: operations@ecoflow.com / password123');
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
