import { PrismaClient, UserRole, UserStatus, ProductStatus, BOMStatus, ECOType, ECOStatus, ApprovalStatus, AuditAction, EntityType, NotificationType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🗑️  Clearing existing data...');
  
  // Clear all data in correct order (respecting foreign keys)
  await prisma.notification.deleteMany();
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

  console.log('🌱 Seeding fresh data...');

  const password = await bcrypt.hash('password123', 10);

  // ========================================
  // 1. CREATE USERS (1 Admin + 2-3 per role)
  // ========================================
  console.log('👤 Creating users...');

  const admin = await prisma.user.create({
    data: {
      email: 'admin@ecoflow.com',
      name: 'System Administrator',
      password,
      roles: [UserRole.ADMIN],
      status: UserStatus.ACTIVE,
    },
  });

  // Engineering Team (3 members)
  const engineer1 = await prisma.user.create({
    data: {
      email: 'john.smith@ecoflow.com',
      name: 'John Smith',
      password,
      roles: [UserRole.ENGINEERING],
      status: UserStatus.ACTIVE,
    },
  });

  const engineer2 = await prisma.user.create({
    data: {
      email: 'sarah.johnson@ecoflow.com',
      name: 'Sarah Johnson',
      password,
      roles: [UserRole.ENGINEERING],
      status: UserStatus.ACTIVE,
    },
  });

  const engineer3 = await prisma.user.create({
    data: {
      email: 'mike.chen@ecoflow.com',
      name: 'Mike Chen',
      password,
      roles: [UserRole.ENGINEERING],
      status: UserStatus.ACTIVE,
    },
  });

  // Approvers (2 members)
  const approver1 = await prisma.user.create({
    data: {
      email: 'david.wilson@ecoflow.com',
      name: 'David Wilson',
      password,
      roles: [UserRole.APPROVER],
      status: UserStatus.ACTIVE,
    },
  });

  const approver2 = await prisma.user.create({
    data: {
      email: 'emily.brown@ecoflow.com',
      name: 'Emily Brown',
      password,
      roles: [UserRole.APPROVER],
      status: UserStatus.ACTIVE,
    },
  });

  // Operations Team (3 members)
  const ops1 = await prisma.user.create({
    data: {
      email: 'james.taylor@ecoflow.com',
      name: 'James Taylor',
      password,
      roles: [UserRole.OPERATIONS],
      status: UserStatus.ACTIVE,
    },
  });

  const ops2 = await prisma.user.create({
    data: {
      email: 'lisa.anderson@ecoflow.com',
      name: 'Lisa Anderson',
      password,
      roles: [UserRole.OPERATIONS],
      status: UserStatus.ACTIVE,
    },
  });

  await prisma.user.create({
    data: {
      email: 'robert.martinez@ecoflow.com',
      name: 'Robert Martinez',
      password,
      roles: [UserRole.OPERATIONS],
      status: UserStatus.ACTIVE,
    },
  });

  // One pending user for testing approval flow
  await prisma.user.create({
    data: {
      email: 'pending.user@ecoflow.com',
      name: 'Pending User',
      password,
      roles: [UserRole.ENGINEERING],
      status: UserStatus.PENDING,
    },
  });

  console.log(`   ✅ Created ${10} users`);

  // ========================================
  // 2. CREATE APPROVAL STAGES
  // ========================================
  console.log('📋 Creating approval stages...');

  await prisma.approvalStage.create({
    data: { name: 'New', order: 1, requiresApproval: false, isFinal: false },
  });

  const stageEngReview = await prisma.approvalStage.create({
    data: { name: 'Engineering Review', order: 2, requiresApproval: true, isFinal: false },
  });

  const stageApproval = await prisma.approvalStage.create({
    data: { name: 'Manager Approval', order: 3, requiresApproval: true, isFinal: false },
  });

  const stageOpsReview = await prisma.approvalStage.create({
    data: { name: 'Operations Review', order: 4, requiresApproval: true, isFinal: false },
  });

  const stageFinal = await prisma.approvalStage.create({
    data: { name: 'Final Approval', order: 5, requiresApproval: true, isFinal: true },
  });

  console.log('   ✅ Created 5 approval stages');

  // ========================================
  // 3. CREATE PRODUCTS (Raw Materials & Finished Goods)
  // ========================================
  console.log('📦 Creating products...');

  // Raw Materials / Components
  const steelSheet = await prisma.product.create({
    data: {
      name: 'Steel Sheet 2mm',
      status: ProductStatus.ACTIVE,
      versions: {
        create: {
          version: 'v1.0',
          salePrice: 0,
          costPrice: 45.00,
          status: ProductStatus.ACTIVE,
          attachments: JSON.stringify([]),
        },
      },
    },
    include: { versions: true },
  });

  const aluminumTube = await prisma.product.create({
    data: {
      name: 'Aluminum Tube 25mm',
      status: ProductStatus.ACTIVE,
      versions: {
        create: {
          version: 'v1.0',
          salePrice: 0,
          costPrice: 28.50,
          status: ProductStatus.ACTIVE,
          attachments: JSON.stringify([]),
        },
      },
    },
    include: { versions: true },
  });

  const bearingAssembly = await prisma.product.create({
    data: {
      name: 'Bearing Assembly SKF-6205',
      status: ProductStatus.ACTIVE,
      versions: {
        create: {
          version: 'v1.0',
          salePrice: 0,
          costPrice: 12.75,
          status: ProductStatus.ACTIVE,
          attachments: JSON.stringify([]),
        },
      },
    },
    include: { versions: true },
  });

  const motorUnit = await prisma.product.create({
    data: {
      name: 'Electric Motor 500W',
      status: ProductStatus.ACTIVE,
      versions: {
        create: {
          version: 'v1.0',
          salePrice: 0,
          costPrice: 156.00,
          status: ProductStatus.ACTIVE,
          attachments: JSON.stringify([]),
        },
      },
    },
    include: { versions: true },
  });

  const controlBoard = await prisma.product.create({
    data: {
      name: 'Control Board PCB-200',
      status: ProductStatus.ACTIVE,
      versions: {
        create: {
          version: 'v1.0',
          salePrice: 0,
          costPrice: 89.00,
          status: ProductStatus.ACTIVE,
          attachments: JSON.stringify([]),
        },
      },
    },
    include: { versions: true },
  });

  const rubberSeal = await prisma.product.create({
    data: {
      name: 'Rubber Seal Ring O-45',
      status: ProductStatus.ACTIVE,
      versions: {
        create: {
          version: 'v1.0',
          salePrice: 0,
          costPrice: 2.30,
          status: ProductStatus.ACTIVE,
          attachments: JSON.stringify([]),
        },
      },
    },
    include: { versions: true },
  });

  const fastenerKit = await prisma.product.create({
    data: {
      name: 'Fastener Kit M8',
      status: ProductStatus.ACTIVE,
      versions: {
        create: {
          version: 'v1.0',
          salePrice: 0,
          costPrice: 8.50,
          status: ProductStatus.ACTIVE,
          attachments: JSON.stringify([]),
        },
      },
    },
    include: { versions: true },
  });

  const wireLoom = await prisma.product.create({
    data: {
      name: 'Wiring Harness WH-100',
      status: ProductStatus.ACTIVE,
      versions: {
        create: {
          version: 'v1.0',
          salePrice: 0,
          costPrice: 34.00,
          status: ProductStatus.ACTIVE,
          attachments: JSON.stringify([]),
        },
      },
    },
    include: { versions: true },
  });

  // Finished Products
  const industrialPump = await prisma.product.create({
    data: {
      name: 'Industrial Water Pump IP-3000',
      status: ProductStatus.ACTIVE,
      versions: {
        create: {
          version: 'v1.0',
          salePrice: 1299.00,
          costPrice: 650.00,
          status: ProductStatus.ACTIVE,
          attachments: JSON.stringify([]),
        },
      },
    },
    include: { versions: true },
  });

  const conveyorMotor = await prisma.product.create({
    data: {
      name: 'Conveyor Drive Unit CDU-500',
      status: ProductStatus.ACTIVE,
      versions: {
        create: {
          version: 'v1.0',
          salePrice: 2450.00,
          costPrice: 1180.00,
          status: ProductStatus.ACTIVE,
          attachments: JSON.stringify([]),
        },
      },
    },
    include: { versions: true },
  });

  const compressorUnit = await prisma.product.create({
    data: {
      name: 'Air Compressor AC-750',
      status: ProductStatus.ACTIVE,
      versions: {
        create: {
          version: 'v1.0',
          salePrice: 3200.00,
          costPrice: 1560.00,
          status: ProductStatus.ACTIVE,
          attachments: JSON.stringify([]),
        },
      },
    },
    include: { versions: true },
  });

  // Draft product (new design)
  const prototypeValve = await prisma.product.create({
    data: {
      name: 'Smart Valve SV-200 (Prototype)',
      status: ProductStatus.DRAFT,
      versions: {
        create: {
          version: 'v0.1',
          salePrice: 0,
          costPrice: 0,
          status: ProductStatus.DRAFT,
          attachments: JSON.stringify([]),
        },
      },
    },
    include: { versions: true },
  });

  // Update currentVersionId for all products
  await prisma.product.update({ where: { id: steelSheet.id }, data: { currentVersionId: steelSheet.versions[0].id } });
  await prisma.product.update({ where: { id: aluminumTube.id }, data: { currentVersionId: aluminumTube.versions[0].id } });
  await prisma.product.update({ where: { id: bearingAssembly.id }, data: { currentVersionId: bearingAssembly.versions[0].id } });
  await prisma.product.update({ where: { id: motorUnit.id }, data: { currentVersionId: motorUnit.versions[0].id } });
  await prisma.product.update({ where: { id: controlBoard.id }, data: { currentVersionId: controlBoard.versions[0].id } });
  await prisma.product.update({ where: { id: rubberSeal.id }, data: { currentVersionId: rubberSeal.versions[0].id } });
  await prisma.product.update({ where: { id: fastenerKit.id }, data: { currentVersionId: fastenerKit.versions[0].id } });
  await prisma.product.update({ where: { id: wireLoom.id }, data: { currentVersionId: wireLoom.versions[0].id } });
  await prisma.product.update({ where: { id: industrialPump.id }, data: { currentVersionId: industrialPump.versions[0].id } });
  await prisma.product.update({ where: { id: conveyorMotor.id }, data: { currentVersionId: conveyorMotor.versions[0].id } });
  await prisma.product.update({ where: { id: compressorUnit.id }, data: { currentVersionId: compressorUnit.versions[0].id } });
  await prisma.product.update({ where: { id: prototypeValve.id }, data: { currentVersionId: prototypeValve.versions[0].id } });

  console.log('   ✅ Created 12 products with versions');

  // ========================================
  // 4. CREATE BOMs (Bill of Materials)
  // ========================================
  console.log('🔧 Creating BOMs...');

  // BOM for Industrial Water Pump
  const pumpBOM = await prisma.bOM.create({
    data: {
      productVersionId: industrialPump.versions[0].id,
      version: 'v1.0',
      status: BOMStatus.ACTIVE,
      components: {
        create: [
          { productId: steelSheet.id, quantity: 2 },
          { productId: motorUnit.id, quantity: 1 },
          { productId: bearingAssembly.id, quantity: 4 },
          { productId: rubberSeal.id, quantity: 6 },
          { productId: controlBoard.id, quantity: 1 },
          { productId: wireLoom.id, quantity: 1 },
          { productId: fastenerKit.id, quantity: 2 },
        ],
      },
      operations: {
        create: [
          { name: 'Sheet Metal Cutting', time: 45, workCenter: 'WC-CUT-01', sequence: 1 },
          { name: 'Sheet Metal Forming', time: 60, workCenter: 'WC-FORM-01', sequence: 2 },
          { name: 'Motor Assembly', time: 30, workCenter: 'WC-ASM-01', sequence: 3 },
          { name: 'Bearing Installation', time: 25, workCenter: 'WC-ASM-01', sequence: 4 },
          { name: 'Electrical Wiring', time: 40, workCenter: 'WC-ELEC-01', sequence: 5 },
          { name: 'Quality Testing', time: 20, workCenter: 'WC-QC-01', sequence: 6 },
          { name: 'Final Assembly', time: 35, workCenter: 'WC-ASM-02', sequence: 7 },
        ],
      },
    },
  });

  // BOM for Conveyor Drive Unit
  const conveyorBOM = await prisma.bOM.create({
    data: {
      productVersionId: conveyorMotor.versions[0].id,
      version: 'v1.0',
      status: BOMStatus.ACTIVE,
      components: {
        create: [
          { productId: aluminumTube.id, quantity: 4 },
          { productId: motorUnit.id, quantity: 2 },
          { productId: bearingAssembly.id, quantity: 8 },
          { productId: controlBoard.id, quantity: 1 },
          { productId: wireLoom.id, quantity: 2 },
          { productId: fastenerKit.id, quantity: 4 },
        ],
      },
      operations: {
        create: [
          { name: 'Frame Cutting', time: 30, workCenter: 'WC-CUT-01', sequence: 1 },
          { name: 'Frame Welding', time: 50, workCenter: 'WC-WELD-01', sequence: 2 },
          { name: 'Motor Mounting', time: 45, workCenter: 'WC-ASM-01', sequence: 3 },
          { name: 'Belt Installation', time: 35, workCenter: 'WC-ASM-01', sequence: 4 },
          { name: 'Control System Setup', time: 40, workCenter: 'WC-ELEC-01', sequence: 5 },
          { name: 'Load Testing', time: 30, workCenter: 'WC-QC-01', sequence: 6 },
        ],
      },
    },
  });

  // BOM for Air Compressor
  const compressorBOM = await prisma.bOM.create({
    data: {
      productVersionId: compressorUnit.versions[0].id,
      version: 'v1.0',
      status: BOMStatus.ACTIVE,
      components: {
        create: [
          { productId: steelSheet.id, quantity: 4 },
          { productId: aluminumTube.id, quantity: 2 },
          { productId: motorUnit.id, quantity: 1 },
          { productId: bearingAssembly.id, quantity: 6 },
          { productId: rubberSeal.id, quantity: 12 },
          { productId: controlBoard.id, quantity: 1 },
          { productId: wireLoom.id, quantity: 1 },
          { productId: fastenerKit.id, quantity: 6 },
        ],
      },
      operations: {
        create: [
          { name: 'Tank Fabrication', time: 90, workCenter: 'WC-WELD-01', sequence: 1 },
          { name: 'Pressure Testing', time: 30, workCenter: 'WC-QC-01', sequence: 2 },
          { name: 'Compressor Assembly', time: 60, workCenter: 'WC-ASM-01', sequence: 3 },
          { name: 'Motor Integration', time: 40, workCenter: 'WC-ASM-01', sequence: 4 },
          { name: 'Pneumatic Connections', time: 35, workCenter: 'WC-ASM-02', sequence: 5 },
          { name: 'Control Panel Install', time: 45, workCenter: 'WC-ELEC-01', sequence: 6 },
          { name: 'Final QC & Certification', time: 40, workCenter: 'WC-QC-01', sequence: 7 },
        ],
      },
    },
  });

  // Draft BOM for prototype
  await prisma.bOM.create({
    data: {
      productVersionId: prototypeValve.versions[0].id,
      version: 'v0.1',
      status: BOMStatus.DRAFT,
      components: {
        create: [
          { productId: aluminumTube.id, quantity: 1 },
          { productId: rubberSeal.id, quantity: 4 },
          { productId: controlBoard.id, quantity: 1 },
        ],
      },
      operations: {
        create: [
          { name: 'Valve Body Machining', time: 60, workCenter: 'WC-CNC-01', sequence: 1 },
          { name: 'Seal Installation', time: 15, workCenter: 'WC-ASM-01', sequence: 2 },
          { name: 'Electronics Integration', time: 30, workCenter: 'WC-ELEC-01', sequence: 3 },
        ],
      },
    },
  });

  console.log('   ✅ Created 4 BOMs with components and operations');

  // ========================================
  // 5. CREATE ECOs (Engineering Change Orders)
  // ========================================
  console.log('📝 Creating ECOs...');

  // ECO 1: Applied ECO (completed)
  const eco1 = await prisma.eCO.create({
    data: {
      title: 'Upgrade Motor Bearings for Industrial Pump',
      type: ECOType.BOM,
      productId: industrialPump.id,
      bomId: pumpBOM.id,
      createdBy: engineer1.id,
      effectiveDate: new Date('2026-01-15'),
      versionUpdate: false,
      currentStage: 'Final Approval',
      status: ECOStatus.APPLIED,
      draftData: JSON.stringify({
        reason: 'Improve bearing life and reduce maintenance frequency',
        changes: [
          { type: 'component', action: 'update', component: 'Bearing Assembly SKF-6205', from: 4, to: 6 },
        ],
      }),
    },
  });

  // ECO 2: Approved, waiting to be applied
  const eco2 = await prisma.eCO.create({
    data: {
      title: 'Add Safety Guard to Conveyor Drive Unit',
      type: ECOType.PRODUCT,
      productId: conveyorMotor.id,
      bomId: conveyorBOM.id,
      createdBy: engineer2.id,
      effectiveDate: new Date('2026-02-01'),
      versionUpdate: true,
      currentStage: 'Final Approval',
      status: ECOStatus.APPROVED,
      draftData: JSON.stringify({
        reason: 'Comply with updated safety regulations',
        changes: [
          { type: 'product', action: 'add', field: 'Safety Guard Assembly', value: 'Included' },
          { type: 'component', action: 'add', component: 'Steel Sheet 2mm', quantity: 1 },
        ],
      }),
    },
  });

  // ECO 3: In Progress
  const eco3 = await prisma.eCO.create({
    data: {
      title: 'Reduce Compressor Tank Weight',
      type: ECOType.BOM,
      productId: compressorUnit.id,
      bomId: compressorBOM.id,
      createdBy: engineer3.id,
      effectiveDate: new Date('2026-02-15'),
      versionUpdate: true,
      currentStage: 'Engineering Review',
      status: ECOStatus.IN_PROGRESS,
      draftData: JSON.stringify({
        reason: 'Reduce shipping costs and improve portability',
        changes: [
          { type: 'component', action: 'update', component: 'Steel Sheet 2mm', from: 4, to: 3 },
          { type: 'component', action: 'add', component: 'Aluminum Tube 25mm', quantity: 2 },
        ],
      }),
    },
  });

  // ECO 4: Draft
  await prisma.eCO.create({
    data: {
      title: 'Update Control Board to New Revision',
      type: ECOType.BOM,
      productId: industrialPump.id,
      bomId: pumpBOM.id,
      createdBy: engineer1.id,
      effectiveDate: null,
      versionUpdate: false,
      currentStage: 'New',
      status: ECOStatus.DRAFT,
      draftData: JSON.stringify({
        reason: 'New control board with improved energy efficiency',
        changes: [
          { type: 'component', action: 'replace', from: 'Control Board PCB-200', to: 'Control Board PCB-300' },
        ],
      }),
    },
  });

  // ECO 5: Rejected
  const eco5 = await prisma.eCO.create({
    data: {
      title: 'Change Rubber Seal Material',
      type: ECOType.BOM,
      productId: industrialPump.id,
      bomId: pumpBOM.id,
      createdBy: engineer2.id,
      effectiveDate: null,
      versionUpdate: false,
      currentStage: 'Manager Approval',
      status: ECOStatus.REJECTED,
      draftData: JSON.stringify({
        reason: 'Use silicone seals instead of rubber for high-temp applications',
        changes: [
          { type: 'component', action: 'replace', from: 'Rubber Seal Ring O-45', to: 'Silicone Seal Ring S-45' },
        ],
        rejectionReason: 'Cost increase not justified for current use cases',
      }),
    },
  });

  console.log('   ✅ Created 5 ECOs');

  // ========================================
  // 6. CREATE ECO APPROVALS
  // ========================================
  console.log('✅ Creating ECO approvals...');

  // Approvals for ECO 1 (Applied - all approved)
  await prisma.eCOApproval.createMany({
    data: [
      { ecoId: eco1.id, stageId: stageEngReview.id, approvedBy: engineer3.id, approvedAt: new Date('2026-01-08'), status: ApprovalStatus.APPROVED, comments: 'Engineering review passed' },
      { ecoId: eco1.id, stageId: stageApproval.id, approvedBy: approver1.id, approvedAt: new Date('2026-01-10'), status: ApprovalStatus.APPROVED, comments: 'Approved - good improvement' },
      { ecoId: eco1.id, stageId: stageOpsReview.id, approvedBy: ops1.id, approvedAt: new Date('2026-01-12'), status: ApprovalStatus.APPROVED, comments: 'No impact on production schedule' },
      { ecoId: eco1.id, stageId: stageFinal.id, approvedBy: approver2.id, approvedAt: new Date('2026-01-14'), status: ApprovalStatus.APPROVED, comments: 'Final approval granted' },
    ],
  });

  // Approvals for ECO 2 (Approved)
  await prisma.eCOApproval.createMany({
    data: [
      { ecoId: eco2.id, stageId: stageEngReview.id, approvedBy: engineer1.id, approvedAt: new Date('2026-01-18'), status: ApprovalStatus.APPROVED, comments: 'Design validated' },
      { ecoId: eco2.id, stageId: stageApproval.id, approvedBy: approver1.id, approvedAt: new Date('2026-01-20'), status: ApprovalStatus.APPROVED, comments: 'Safety compliance is mandatory' },
      { ecoId: eco2.id, stageId: stageOpsReview.id, approvedBy: ops2.id, approvedAt: new Date('2026-01-22'), status: ApprovalStatus.APPROVED, comments: 'Production line ready' },
      { ecoId: eco2.id, stageId: stageFinal.id, approvedBy: approver2.id, approvedAt: new Date('2026-01-23'), status: ApprovalStatus.APPROVED, comments: 'Approved for implementation' },
    ],
  });

  // Approvals for ECO 3 (In Progress - pending)
  await prisma.eCOApproval.createMany({
    data: [
      { ecoId: eco3.id, stageId: stageEngReview.id, status: ApprovalStatus.PENDING },
    ],
  });

  // Approvals for ECO 5 (Rejected)
  await prisma.eCOApproval.createMany({
    data: [
      { ecoId: eco5.id, stageId: stageEngReview.id, approvedBy: engineer3.id, approvedAt: new Date('2026-01-05'), status: ApprovalStatus.APPROVED, comments: 'Technically feasible' },
      { ecoId: eco5.id, stageId: stageApproval.id, approvedBy: approver1.id, approvedAt: new Date('2026-01-07'), status: ApprovalStatus.REJECTED, comments: 'Cost increase not justified' },
    ],
  });

  console.log('   ✅ Created ECO approvals');

  // ========================================
  // 7. CREATE AUDIT LOGS
  // ========================================
  console.log('📜 Creating audit logs...');

  await prisma.auditLog.createMany({
    data: [
      // Product creation logs
      { action: AuditAction.CREATE, entityType: EntityType.PRODUCT, entityId: industrialPump.id, userId: admin.id, newValue: JSON.stringify({ name: 'Industrial Water Pump IP-3000' }), createdAt: new Date('2026-01-01') },
      { action: AuditAction.CREATE, entityType: EntityType.PRODUCT, entityId: conveyorMotor.id, userId: admin.id, newValue: JSON.stringify({ name: 'Conveyor Drive Unit CDU-500' }), createdAt: new Date('2026-01-01') },
      { action: AuditAction.CREATE, entityType: EntityType.PRODUCT, entityId: compressorUnit.id, userId: admin.id, newValue: JSON.stringify({ name: 'Air Compressor AC-750' }), createdAt: new Date('2026-01-01') },
      
      // ECO creation and stage transitions
      { action: AuditAction.CREATE, entityType: EntityType.ECO, entityId: eco1.id, userId: engineer1.id, ecoId: eco1.id, newValue: JSON.stringify({ title: eco1.title }), createdAt: new Date('2026-01-05') },
      { action: AuditAction.STAGE_TRANSITION, entityType: EntityType.ECO, entityId: eco1.id, userId: engineer1.id, ecoId: eco1.id, stage: 'Engineering Review', createdAt: new Date('2026-01-06') },
      { action: AuditAction.APPROVE, entityType: EntityType.ECO_APPROVAL, entityId: eco1.id, userId: engineer3.id, ecoId: eco1.id, stage: 'Engineering Review', createdAt: new Date('2026-01-08') },
      { action: AuditAction.STAGE_TRANSITION, entityType: EntityType.ECO, entityId: eco1.id, userId: approver1.id, ecoId: eco1.id, stage: 'Manager Approval', createdAt: new Date('2026-01-09') },
      { action: AuditAction.APPROVE, entityType: EntityType.ECO_APPROVAL, entityId: eco1.id, userId: approver1.id, ecoId: eco1.id, stage: 'Manager Approval', createdAt: new Date('2026-01-10') },
      
      // User login logs
      { action: AuditAction.UPDATE, entityType: EntityType.USER, entityId: admin.id, userId: admin.id, comments: 'User logged in', createdAt: new Date('2026-01-24T08:00:00') },
      { action: AuditAction.UPDATE, entityType: EntityType.USER, entityId: engineer1.id, userId: engineer1.id, comments: 'User logged in', createdAt: new Date('2026-01-24T08:15:00') },
    ],
  });

  console.log('   ✅ Created audit logs');

  // ========================================
  // 8. CREATE NOTIFICATIONS
  // ========================================
  console.log('🔔 Creating notifications...');

  await prisma.notification.createMany({
    data: [
      // Notifications for approvers
      { type: NotificationType.APPROVAL_REQUIRED, title: 'Approval Required', message: 'ECO "Reduce Compressor Tank Weight" requires your review', userId: approver1.id, data: JSON.stringify({ ecoId: eco3.id }), read: false },
      { type: NotificationType.APPROVAL_REQUIRED, title: 'Approval Required', message: 'ECO "Reduce Compressor Tank Weight" requires engineering review', userId: engineer1.id, data: JSON.stringify({ ecoId: eco3.id }), read: false },
      
      // ECO status notifications
      { type: NotificationType.ECO_APPROVED, title: 'ECO Approved', message: 'Your ECO "Add Safety Guard to Conveyor Drive Unit" has been approved', userId: engineer2.id, data: JSON.stringify({ ecoId: eco2.id }), read: true },
      { type: NotificationType.ECO_REJECTED, title: 'ECO Rejected', message: 'Your ECO "Change Rubber Seal Material" has been rejected', userId: engineer2.id, data: JSON.stringify({ ecoId: eco5.id }), read: true },
      { type: NotificationType.ECO_APPLIED, title: 'ECO Applied', message: 'ECO "Upgrade Motor Bearings for Industrial Pump" has been applied to production', userId: engineer1.id, data: JSON.stringify({ ecoId: eco1.id }), read: true },
      
      // Broadcast notifications
      { type: NotificationType.VERSION_CREATED, title: 'New Product Version', message: 'Industrial Water Pump IP-3000 v1.1 has been created', userId: null, data: JSON.stringify({ productId: industrialPump.id }), read: false },
    ],
  });

  console.log('   ✅ Created notifications');

  // ========================================
  // SUMMARY
  // ========================================
  console.log('\n✨ Seed completed successfully!\n');
  console.log('📊 Summary:');
  console.log('   • 10 Users (1 Admin, 3 Engineers, 2 Approvers, 3 Ops, 1 Pending)');
  console.log('   • 5 Approval Stages');
  console.log('   • 12 Products (8 Components + 3 Finished + 1 Prototype)');
  console.log('   • 4 BOMs with Components and Operations');
  console.log('   • 5 ECOs (1 Applied, 1 Approved, 1 In Progress, 1 Draft, 1 Rejected)');
  console.log('   • ECO Approvals for workflow demonstration');
  console.log('   • Audit Logs for traceability');
  console.log('   • Notifications for all user types\n');
  console.log('🔐 Login Credentials (all use password: password123):');
  console.log('   • Admin: admin@ecoflow.com');
  console.log('   • Engineer: john.smith@ecoflow.com');
  console.log('   • Approver: david.wilson@ecoflow.com');
  console.log('   • Operations: james.taylor@ecoflow.com\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
