import { Request, Response } from 'express';
import prisma from '../config/database';
import { ECOStatus, ECOType, Prisma } from '@prisma/client';
import { sendNotificationToUser } from './notification.controller';

// Internal function to apply ECO (can be called from transaction)
async function applyECOInternal(ecoId: string, userId: string, tx: Prisma.TransactionClient): Promise<any> {
  const eco = await tx.eCO.findUnique({
    where: { id: ecoId },
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
    throw new Error('ECO not found');
  }

  const draftData = eco.draftData as any || {};
  const createNewVersion = eco.versionUpdate;
  let result: any = {};

  if (eco.type === 'PRODUCT') {
    const currentVersion = eco.product.currentVersion;

    if (!currentVersion) {
      throw new Error('Product has no current version');
    }

    if (createNewVersion) {
      const versionNumber = parseFloat(currentVersion.version.replace('v', ''));
      const newVersionNumber = `v${(versionNumber + 1.0).toFixed(1)}`;

      await tx.productVersion.update({
        where: { id: currentVersion.id },
        data: { status: 'ARCHIVED' },
      });

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

      await tx.auditLog.create({
        data: {
          userId,
          action: 'VERSION_CREATE',
          entityType: 'PRODUCT_VERSION',
          entityId: newVersion.id,
          ecoId: eco.id,
          oldValue: { versionId: currentVersion.id, version: currentVersion.version },
          newValue: { versionId: newVersion.id, version: newVersionNumber },
          comments: `Product version created via ECO: ${eco.title}`,
        },
      });
    } else {
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
      const versionNumber = parseFloat(currentVersion.replace('v', ''));
      const newVersionNumber = `v${(versionNumber + 1.0).toFixed(1)}`;

      await tx.bOM.update({
        where: { id: eco.bomId },
        data: { status: 'ARCHIVED' },
      });

      const newBom = await tx.bOM.create({
        data: {
          productVersionId: currentBom.productVersionId,
          version: newVersionNumber,
          status: 'ACTIVE',
        },
      });

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

      await tx.auditLog.create({
        data: {
          userId,
          action: 'VERSION_CREATE',
          entityType: 'BOM',
          entityId: newBom.id,
          ecoId: eco.id,
          oldValue: { bomId: eco.bomId, version: currentVersion },
          newValue: { bomId: newBom.id, version: newVersionNumber },
          comments: `BOM version created via ECO: ${eco.title}`,
        },
      });
    } else {
      await tx.bOMComponent.deleteMany({ where: { bomId: eco.bomId } });
      await tx.bOMOperation.deleteMany({ where: { bomId: eco.bomId } });

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

  await tx.eCO.update({
    where: { id: ecoId },
    data: {
      status: ECOStatus.APPLIED,
    },
  });

  await tx.auditLog.create({
    data: {
      userId,
      action: 'UPDATE',
      entityType: 'ECO',
      entityId: ecoId,
      ecoId: ecoId,
      oldValue: { status: 'APPROVED' },
      newValue: { status: 'APPLIED', appliedAt: new Date() },
      comments: `ECO applied: ${eco.title}`,
    },
  });

  return result;
}

// Create ECO
export const createECO = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, type, productId, bomId, draftData } = req.body;
    const userId = (req as any).user.userId;

    if (!title || !type || !productId) {
      res.status(400).json({ status: 'error', message: 'Title, type, and product ID are required' });
      return;
    }

    // CRITICAL FIX: Validate product is not archived
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { status: true, name: true }
    });

    if (!product) {
      res.status(404).json({ status: 'error', message: 'Product not found' });
      return;
    }

    if (product.status === 'ARCHIVED') {
      res.status(400).json({
        status: 'error',
        message: `Cannot create ECO for archived product "${product.name}". Archived products cannot be modified.`
      });
      return;
    }

    // CRITICAL FIX: Validate BOM is not archived (if BOM ECO)
    if (bomId) {
      const bom = await prisma.bOM.findUnique({
        where: { id: bomId },
        select: { status: true, version: true }
      });

      if (!bom) {
        res.status(404).json({ status: 'error', message: 'BOM not found' });
        return;
      }

      if (bom.status === 'ARCHIVED') {
        res.status(400).json({
          status: 'error',
          message: `Cannot create ECO for archived BOM (version ${bom.version}). Archived BOMs cannot be modified.`
        });
        return;
      }
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

    // CRITICAL FIX: Add audit log for ECO creation
    await prisma.auditLog.create({
      data: {
        action: 'CREATE',
        entityType: 'ECO',
        entityId: eco.id,
        userId,
        ecoId: eco.id,
        newValue: { title, type, productId, bomId, status: 'DRAFT' },
        comments: `ECO created: ${title}`,
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
    const userId = (req as any).user.userId;

    const eco = await prisma.eCO.findUnique({ where: { id } });
    if (!eco) {
      res.status(404).json({ status: 'error', message: 'ECO not found' });
      return;
    }

    if (eco.status !== ECOStatus.DRAFT) {
      res.status(400).json({ status: 'error', message: 'ECO already submitted' });
      return;
    }

    // CRITICAL FIX: Validate mandatory fields before submission
    if (!eco.title || eco.title.trim() === '') {
      res.status(400).json({
        status: 'error',
        message: 'Cannot submit ECO: Title is required'
      });
      return;
    }

    if (!eco.effectiveDate) {
      res.status(400).json({
        status: 'error',
        message: 'Cannot submit ECO: Effective date is required'
      });
      return;
    }

    if (!eco.draftData || Object.keys(eco.draftData).length === 0) {
      res.status(400).json({
        status: 'error',
        message: 'Cannot submit ECO: Draft changes are required. Please specify what changes to make.'
      });
      return;
    }

    // Validate draft data content based on ECO type
    const draft = eco.draftData as any;
    if (eco.type === 'PRODUCT' && !draft.product) {
      res.status(400).json({
        status: 'error',
        message: 'Product ECO must include product changes in draft data'
      });
      return;
    }

    if (eco.type === 'BOM' && !draft.bom) {
      res.status(400).json({
        status: 'error',
        message: 'BOM ECO must include BOM changes (components/operations) in draft data'
      });
      return;
    }

    const updated = await prisma.eCO.update({
      where: { id },
      data: { status: ECOStatus.IN_PROGRESS },
    });

    // CRITICAL FIX: Add audit log for ECO submission
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE',
        entityType: 'ECO',
        entityId: id,
        userId,
        ecoId: id,
        oldValue: { status: 'DRAFT' },
        newValue: { status: 'IN_PROGRESS' },
        comments: 'ECO submitted for approval',
      },
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

    // CRITICAL FIX: Wrap entire review process in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create approval record
      await tx.eCOApproval.create({
        data: {
          ecoId: id,
          stageId: currentStage.id,
          approvedBy: userId,
          approvedAt: new Date(),
          status: approved ? 'APPROVED' : 'REJECTED',
          comments,
        },
      });

      // CRITICAL FIX: Add audit log for approval/rejection
      await tx.auditLog.create({
        data: {
          action: approved ? 'APPROVE' : 'REJECT',
          entityType: 'ECO_APPROVAL',
          entityId: id,
          userId,
          ecoId: id,
          stage: eco.currentStage,
          oldValue: { stage: eco.currentStage, status: eco.status },
          newValue: { approved, comments, timestamp: new Date() },
          comments: approved ? `ECO approved at stage: ${eco.currentStage}` : `ECO rejected at stage: ${eco.currentStage}`,
        },
      });

      let newStatus: string = eco.status;
      let appliedEcoResult: any = null;

      if (approved) {
        // Check if this is the last stage
        const stages = await tx.approvalStage.findMany({ orderBy: { order: 'asc' } });
        const currentStageIndex = stages.findIndex((s) => s.id === currentStage.id);

        if (currentStageIndex < stages.length - 1) {
          // Move to next stage
          const nextStage = stages[currentStageIndex + 1];
          await tx.eCO.update({
            where: { id },
            data: {
              currentStage: nextStage.name,
            },
          });

          // CRITICAL FIX: Add audit log for stage transition
          await tx.auditLog.create({
            data: {
              action: 'STAGE_TRANSITION',
              entityType: 'ECO',
              entityId: id,
              userId,
              ecoId: id,
              stage: nextStage.name,
              oldValue: { stage: eco.currentStage },
              newValue: { stage: nextStage.name },
              comments: `ECO moved from "${eco.currentStage}" to "${nextStage.name}"`,
            },
          });

          newStatus = ECOStatus.IN_PROGRESS;
        } else {
          // CRITICAL FIX: Final stage reached - auto-apply ECO
          // First set status to APPROVED
          await tx.eCO.update({
            where: { id },
            data: { status: ECOStatus.APPROVED },
          });

          // CRITICAL FIX: Auto-apply the ECO if final stage is approved
          if (currentStage.isFinal) {
            appliedEcoResult = await applyECOInternal(id, userId, tx);
            newStatus = ECOStatus.APPLIED;

            await tx.auditLog.create({
              data: {
                action: 'UPDATE',
                entityType: 'ECO',
                entityId: id,
                userId,
                ecoId: id,
                oldValue: { status: 'APPROVED' },
                newValue: { status: 'APPLIED' },
                comments: 'ECO automatically applied after final stage approval',
              },
            });
          } else {
            newStatus = ECOStatus.APPROVED;
          }
        }
      } else {
        // Rejected
        await tx.eCO.update({
          where: { id },
          data: { status: ECOStatus.REJECTED },
        });
        newStatus = ECOStatus.REJECTED;
      }

      return { newStatus, appliedResult: appliedEcoResult };
    });

    res.status(200).json({
      status: 'success',
      message: approved
        ? (result.newStatus === ECOStatus.APPLIED ? 'ECO approved and applied successfully' : 'ECO approved')
        : 'ECO rejected',
      data: {
        newStatus: result.newStatus,
        appliedResult: result.appliedResult
      },
    });

    // Notify Creator
    if (eco.createdBy) {
      const message = approved
        ? `Your ECO "${eco.title}" has been APPROVED at stage: ${eco.currentStage}`
        : `Your ECO "${eco.title}" has been REJECTED at stage: ${eco.currentStage}`;

      await sendNotificationToUser(eco.createdBy, {
        type: approved ? 'SUCCESS' : 'error',
        title: `ECO ${approved ? 'Approved' : 'Rejected'}`,
        message,
        data: { ecoId: eco.id }
      });
    }
  } catch (error: any) {
    console.error('Review ECO error:', error);
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

    // CRITICAL FIX: Verify all approval stages are completed (stage bypass protection)
    const allStages = await prisma.approvalStage.findMany({ orderBy: { order: 'asc' } });
    const completedApprovals = await prisma.eCOApproval.count({
      where: {
        ecoId: id,
        status: 'APPROVED',
      },
    });

    if (allStages.length > 0 && completedApprovals < allStages.length) {
      res.status(400).json({
        status: 'error',
        message: `Cannot apply ECO: Only ${completedApprovals} of ${allStages.length} approval stages completed. All stages must be approved before applying.`,
      });
      return;
    }

    // Apply ECO within transaction
    const result = await prisma.$transaction(async (tx) => {
      return await applyECOInternal(id, userId, tx);
    });

    res.status(200).json({
      status: 'success',
      message: 'ECO applied successfully',
      data: { result },
    });
  } catch (error: any) {
    console.error('Apply ECO error:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Failed to apply ECO' });
  }
};
