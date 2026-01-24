import { Request, Response } from 'express';
import prisma from '../config/database';
import { ECOStatus, ECOType } from '@prisma/client';
// import { sendNotificationToUser, broadcastNotification } from './notification.controller'; // For future use

// Create ECO
export const createECO = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, type, productId, bomId, draftData } = req.body;
    const userId = (req as any).user.userId;

    if (!title || !type || !productId) {
      res.status(400).json({ status: 'error', message: 'Title, type, and product ID are required' });
      return;
    }

    const eco = await prisma.eCO.create({
      data: {
        title,
        type: type as ECOType,
        status: ECOStatus.DRAFT,
        productId,
        bomId,
        createdBy: userId,
        currentStage: 'New',
        draftData: draftData || {},
      },
      include: {
        product: true,
        creator: { select: { id: true, name: true, email: true } },
      },
    });

    res.status(201).json({
      status: 'success',
      message: 'ECO created successfully',
      data: { eco },
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: 'Failed to create ECO' });
  }
};

// Get all ECOs
export const getAllECOs = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, type, productId, page = '1', limit = '10' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    const where: any = {};
    if (status) where.status = status;
    if (type) where.type = type;
    if (productId) where.productId = productId;

    const [ecos, total] = await Promise.all([
      prisma.eCO.findMany({
        where,
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        include: {
          product: { select: { id: true, name: true } },
          creator: { select: { id: true, name: true, email: true } },
          _count: { select: { approvals: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.eCO.count({ where }),
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        ecos,
        pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
      },
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: 'Failed to fetch ECOs' });
  }
};

// Get ECO by ID
export const getECOById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const eco = await prisma.eCO.findUnique({
      where: { id },
      include: {
        product: true,
        bom: true,
        creator: { select: { id: true, name: true, email: true } },
        approvals: {
          include: {
            approver: { select: { id: true, name: true, email: true } },
            stage: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!eco) {
      res.status(404).json({ status: 'error', message: 'ECO not found' });
      return;
    }

    res.status(200).json({ status: 'success', data: { eco } });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: 'Failed to fetch ECO' });
  }
};

// Update ECO
export const updateECO = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, draftData } = req.body;

    const eco = await prisma.eCO.findUnique({ where: { id } });
    if (!eco) {
      res.status(404).json({ status: 'error', message: 'ECO not found' });
      return;
    }

    if (eco.status !== ECOStatus.DRAFT) {
      res.status(400).json({ status: 'error', message: 'Can only update ECOs in DRAFT status' });
      return;
    }

    const updated = await prisma.eCO.update({
      where: { id },
      data: { title, draftData },
    });

    res.status(200).json({
      status: 'success',
      message: 'ECO updated successfully',
      data: { eco: updated },
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: 'Failed to update ECO' });
  }
};

// Submit ECO for approval
export const submitECO = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const eco = await prisma.eCO.findUnique({ where: { id } });
    if (!eco) {
      res.status(404).json({ status: 'error', message: 'ECO not found' });
      return;
    }

    if (eco.status !== ECOStatus.DRAFT) {
      res.status(400).json({ status: 'error', message: 'ECO already submitted' });
      return;
    }

    const updated = await prisma.eCO.update({
      where: { id },
      data: { status: ECOStatus.IN_PROGRESS },
    });

    res.status(200).json({
      status: 'success',
      message: 'ECO submitted for approval',
      data: { eco: updated },
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: 'Failed to submit ECO' });
  }
};

// Approve/Reject ECO
export const reviewECO = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { approved, comments } = req.body;
    const userId = (req as any).user.userId;

    const eco = await prisma.eCO.findUnique({ where: { id } });

    if (!eco) {
      res.status(404).json({ status: 'error', message: 'ECO not found' });
      return;
    }

    if (eco.status !== ECOStatus.IN_PROGRESS) {
      res.status(400).json({ status: 'error', message: 'ECO is not pending approval' });
      return;
    }

    // Get current stage
    const currentStage = await prisma.approvalStage.findFirst({
      where: { name: eco.currentStage },
    });

    if (!currentStage) {
      res.status(400).json({ status: 'error', message: 'Invalid approval stage' });
      return;
    }

    // Create approval record
    await prisma.eCOApproval.create({
      data: {
        ecoId: id,
        stageId: currentStage.id,
        approvedBy: userId,
        approvedAt: new Date(),
        status: approved ? 'APPROVED' : 'REJECTED',
        comments,
      },
    });

    // Update ECO status
    let newStatus: string = eco.status;
    if (approved) {
      // Check if this is the last stage
      const stages = await prisma.approvalStage.findMany({ orderBy: { order: 'asc' } });
      const currentStageIndex = stages.findIndex((s) => s.id === currentStage.id);
      if (currentStageIndex < stages.length - 1) {
        // Move to next stage
        await prisma.eCO.update({
          where: { id },
          data: {
            currentStage: stages[currentStageIndex + 1].name,
          },
        });
        newStatus = ECOStatus.IN_PROGRESS;
      } else {
        // All stages complete
        await prisma.eCO.update({
          where: { id },
          data: { status: ECOStatus.APPROVED },
        });
        newStatus = ECOStatus.APPROVED;
      }
    } else {
      await prisma.eCO.update({
        where: { id },
        data: { status: ECOStatus.REJECTED },
      });
      newStatus = ECOStatus.REJECTED;
    }

    res.status(200).json({
      status: 'success',
      message: approved ? 'ECO approved' : 'ECO rejected',
      data: { newStatus },
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: 'Failed to review ECO' });
  }
};

// Apply approved ECO with version auto-increment and archiving
export const applyECO = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.userId;

    const eco = await prisma.eCO.findUnique({
      where: { id },
      include: { 
        product: {
          include: {
            currentVersion: true,
          },
        },
        bom: {
          include: {
            components: true,
            operations: true,
            productVersion: true,
          },
        },
      },
    });

    if (!eco) {
      res.status(404).json({ status: 'error', message: 'ECO not found' });
      return;
    }

    if (eco.status !== ECOStatus.APPROVED) {
      res.status(400).json({ status: 'error', message: 'Can only apply approved ECOs' });
      return;
    }

    const draftData = eco.draftData as any || {};
    const createNewVersion = eco.versionUpdate; // Use versionUpdate field from ECO
    let result: any = {};

    // Transaction: Apply ECO changes
    await prisma.$transaction(async (tx) => {
      if (eco.type === 'PRODUCT') {
        const currentVersion = eco.product.currentVersion;
        
        if (!currentVersion) {
          throw new Error('Product has no current version');
        }
        
        if (createNewVersion) {
          // Auto-increment version (v1.0 -> v2.0)
          const versionNumber = parseFloat(currentVersion.version.replace('v', ''));
          const newVersionNumber = `v${(versionNumber + 1.0).toFixed(1)}`;

          // Archive old product version
          await tx.productVersion.update({
            where: { id: currentVersion.id },
            data: { status: 'ARCHIVED' },
          });

          // Create new product version (ACTIVE)
          const newVersion = await tx.productVersion.create({
            data: {
              productId: eco.productId,
              version: newVersionNumber,
              salePrice: draftData.product?.salePrice !== undefined 
                ? draftData.product.salePrice 
                : currentVersion.salePrice,
              costPrice: draftData.product?.costPrice !== undefined 
                ? draftData.product.costPrice 
                : currentVersion.costPrice,
              attachments: draftData.product?.attachments || currentVersion.attachments,
              status: 'ACTIVE',
            },
          });

          // Update product to point to new version
          await tx.product.update({
            where: { id: eco.productId },
            data: { 
              currentVersionId: newVersion.id,
              status: 'ACTIVE',
            },
          });

          result = { 
            action: 'VERSION_CREATED',
            oldVersion: currentVersion.version,
            newVersion: newVersionNumber,
            archivedVersionId: currentVersion.id,
            newVersionId: newVersion.id,
          };

          // Create audit log
          await tx.auditLog.create({
            data: {
              userId,
              action: 'VERSION_CREATE',
              entityType: 'PRODUCT',
              entityId: newVersion.id,
              oldValue: { versionId: currentVersion.id, version: currentVersion.version },
              newValue: { versionId: newVersion.id, version: newVersionNumber },
            },
          });
        } else {
          // Update current version (no new version created)
          await tx.productVersion.update({
            where: { id: currentVersion.id },
            data: {
              salePrice: draftData.product?.salePrice !== undefined 
                ? draftData.product.salePrice 
                : currentVersion.salePrice,
              costPrice: draftData.product?.costPrice !== undefined 
                ? draftData.product.costPrice 
                : currentVersion.costPrice,
              attachments: draftData.product?.attachments || currentVersion.attachments,
            },
          });

          result = { 
            action: 'VERSION_UPDATED',
            version: currentVersion.version,
            versionId: currentVersion.id,
          };
        }
      }

      if (eco.type === 'BOM' && eco.bomId) {
        const currentBom = eco.bom!;
        const currentVersion = currentBom.version;
        
        if (createNewVersion) {
          // Auto-increment BoM version (v1.0 -> v2.0)
          const versionNumber = parseFloat(currentVersion.replace('v', ''));
          const newVersionNumber = `v${(versionNumber + 1.0).toFixed(1)}`;

          // Archive old BoM version
          await tx.bOM.update({
            where: { id: eco.bomId },
            data: { status: 'ARCHIVED' },
          });

          // Create new BoM with incremented version (ACTIVE)
          const newBom = await tx.bOM.create({
            data: {
              productVersionId: currentBom.productVersionId,
              version: newVersionNumber,
              status: 'ACTIVE',
            },
          });

          // Copy or update components
          const newComponents = draftData.bom?.components || currentBom.components;
          for (const comp of newComponents) {
            await tx.bOMComponent.create({
              data: {
                bomId: newBom.id,
                productId: comp.productId,
                quantity: comp.quantity,
              },
            });
          }

          // Copy or update operations
          const newOperations = draftData.bom?.operations || currentBom.operations;
          for (const op of newOperations) {
            await tx.bOMOperation.create({
              data: {
                bomId: newBom.id,
                name: op.name,
                workCenter: op.workCenter,
                time: op.time,
                sequence: op.sequence || 0,
              },
            });
          }

          result = { 
            action: 'VERSION_CREATED',
            oldVersion: currentVersion,
            newVersion: newVersionNumber,
            archivedBomId: eco.bomId,
            newBomId: newBom.id,
          };

          // Create audit log
          await tx.auditLog.create({
            data: {
              userId,
              action: 'VERSION_CREATE',
              entityType: 'BOM',
              entityId: newBom.id,
              oldValue: { bomId: eco.bomId, version: currentVersion },
              newValue: { bomId: newBom.id, version: newVersionNumber },
            },
          });
        } else {
          // Update same version
          // Delete existing components and operations
          await tx.bOMComponent.deleteMany({ where: { bomId: eco.bomId } });
          await tx.bOMOperation.deleteMany({ where: { bomId: eco.bomId } });

          // Add updated components
          const newComponents = draftData.bom?.components || currentBom.components;
          for (const comp of newComponents) {
            await tx.bOMComponent.create({
              data: {
                bomId: eco.bomId,
                productId: comp.productId,
                quantity: comp.quantity,
              },
            });
          }

          // Add updated operations
          const newOperations = draftData.bom?.operations || currentBom.operations;
          for (const op of newOperations) {
            await tx.bOMOperation.create({
              data: {
                bomId: eco.bomId,
                name: op.name,
                workCenter: op.workCenter,
                time: op.time,
                sequence: op.sequence || 0,
              },
            });
          }

          result = { 
            action: 'VERSION_UPDATED',
            version: currentVersion,
            bomId: eco.bomId,
          };
        }
      }

      // Update ECO status to APPLIED
      await tx.eCO.update({
        where: { id },
        data: {
          status: ECOStatus.APPLIED,
        },
      });

      // Create final audit log for ECO
      await tx.auditLog.create({
        data: {
          userId,
          action: 'UPDATE',
          entityType: 'ECO',
          entityId: eco.id,
          newValue: result,
        },
      });
    });

    res.status(200).json({
      status: 'success',
      message: 'ECO applied successfully',
      data: result,
    });
  } catch (error: any) {
    console.error('Apply ECO error:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Failed to apply ECO' });
  }
};
