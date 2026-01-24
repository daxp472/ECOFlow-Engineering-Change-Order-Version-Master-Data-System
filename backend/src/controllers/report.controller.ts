import { Request, Response } from 'express';
import prisma from '../config/database';

// Get audit logs
export const getAuditLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const { entityId, userId, action, page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    const where: any = {};
    if (entityId) where.entityId = entityId;
    if (userId) where.userId = userId;
    if (action) where.action = action;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        logs,
        pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
      },
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: 'Failed to fetch audit logs' });
  }
};

// Get ECO statistics
export const getECOStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const [total, byStatus, byType, recentECOs] = await Promise.all([
      prisma.eCO.count(),
      prisma.eCO.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
      prisma.eCO.groupBy({
        by: ['type'],
        _count: { type: true },
      }),
      prisma.eCO.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          product: { select: { name: true } },
          creator: { select: { name: true } },
        },
      }),
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        total,
        byStatus,
        byType,
        recentECOs,
      },
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: 'Failed to fetch statistics' });
  }
};
