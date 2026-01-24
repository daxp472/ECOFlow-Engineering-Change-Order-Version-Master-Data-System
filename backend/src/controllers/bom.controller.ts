import { Request, Response } from 'express';
import prisma from '../config/database';

// Create BoM
export const createBOM = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productVersionId, version, components, operations } = req.body;

    if (!productVersionId || !version) {
      res.status(400).json({ status: 'error', message: 'Product version ID and version are required' });
      return;
    }

    const bom = await prisma.bOM.create({
      data: {
        productVersionId,
        version,
        status: 'DRAFT',
        components: {
          create: components?.map((c: any) => ({
            productId: c.productId,
            quantity: c.quantity,
          })) || [],
        },
        operations: {
          create: operations?.map((o: any, index: number) => ({
            name: o.name,
            time: o.time || 0,
            workCenter: o.workCenter || 'Default',
            sequence: index + 1,
          })) || [],
        },
      },
      include: {
        components: true,
        operations: { orderBy: { sequence: 'asc' } },
      },
    });

    res.status(201).json({
      status: 'success',
      message: 'BoM created successfully',
      data: { bom },
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: 'Failed to create BoM' });
  }
};

// Get all BoMs
export const getAllBOMs = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId, page = '1', limit = '10' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    const where: any = { status: { not: 'ARCHIVED' } };
    if (productId) where.productVersion = { productId: productId };

    const [boms, total] = await Promise.all([
      prisma.bOM.findMany({
        where,
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        include: {
          productVersion: { include: { product: { select: { id: true, name: true } } } },
          _count: { select: { components: true, operations: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.bOM.count({ where }),
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        boms,
        pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
      },
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: 'Failed to fetch BoMs' });
  }
};

// Get BoM by ID
export const getBOMById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const bom = await prisma.bOM.findUnique({
      where: { id },
      include: {
        productVersion: { include: { product: true } },
        components: { include: { product: true }, orderBy: { createdAt: 'asc' } },
        operations: { orderBy: { sequence: 'asc' } },
      },
    });

    if (!bom) {
      res.status(404).json({ status: 'error', message: 'BoM not found' });
      return;
    }

    res.status(200).json({ status: 'success', data: { bom } });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: 'Failed to fetch BoM' });
  }
};

// Update BoM
export const updateBOM = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { version, status } = req.body;

    const bom = await prisma.bOM.update({
      where: { id },
      data: { version, status },
    });

    res.status(200).json({
      status: 'success',
      message: 'BoM updated successfully',
      data: { bom },
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: 'Failed to update BoM' });
  }
};

// Add component to BoM
export const addComponent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { productId, quantity } = req.body;

    const component = await prisma.bOMComponent.create({
      data: {
        bomId: id,
        productId,
        quantity,
      },
    });

    res.status(201).json({
      status: 'success',
      message: 'Component added successfully',
      data: { component },
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: 'Failed to add component' });
  }
};

// Add operation to BoM
export const addOperation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, time, workCenter } = req.body;

    const lastOp = await prisma.bOMOperation.findFirst({
      where: { bomId: id },
      orderBy: { sequence: 'desc' },
    });

    const operation = await prisma.bOMOperation.create({
      data: {
        bomId: id,
        name,
        time: time || 0,
        workCenter: workCenter || 'Default',
        sequence: (lastOp?.sequence || 0) + 1,
      },
    });

    res.status(201).json({
      status: 'success',
      message: 'Operation added successfully',
      data: { operation },
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: 'Failed to add operation' });
  }
};
