import { Request, Response } from 'express';
import prisma from '../config/database';

// Create product
export const createProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.body;

    if (!name) {
      res.status(400).json({ status: 'error', message: 'Product name is required' });
      return;
    }

    const product = await prisma.product.create({
      data: {
        name,
        status: 'DRAFT',
        versions: {
          create: {
            version: 'v1.0',
            salePrice: 0,
            costPrice: 0,
            status: 'DRAFT',
          },
        },
      },
      include: { versions: true },
    });

    res.status(201).json({
      status: 'success',
      message: 'Product created successfully',
      data: { product },
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: 'Failed to create product' });
  }
};

// Get all products
export const getAllProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '10', search, archived } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (search) {
      where.name = { contains: search as string, mode: 'insensitive' };
    }
    if (archived !== undefined) where.status = archived === 'true' ? 'ARCHIVED' : { not: 'ARCHIVED' };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limitNum,
        include: {
          currentVersion: true,
          _count: { select: { versions: true, ecos: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.product.count({ where }),
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        products,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: 'Failed to fetch products' });
  }
};

// Get product by ID
export const getProductById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        versions: { orderBy: { createdAt: 'desc' } },
        currentVersion: true,
      },
    });

    if (!product) {
      res.status(404).json({ status: 'error', message: 'Product not found' });
      return;
    }

    res.status(200).json({ status: 'success', data: { product } });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: 'Failed to fetch product' });
  }
};

// Update product
export const updateProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const product = await prisma.product.update({
      where: { id },
      data: { name },
    });

    res.status(200).json({
      status: 'success',
      message: 'Product updated successfully',
      data: { product },
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: 'Failed to update product' });
  }
};

// Archive product
export const archiveProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.product.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });

    res.status(200).json({
      status: 'success',
      message: 'Product archived successfully',
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: 'Failed to archive product' });
  }
};

// Create new version
export const createProductVersion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Get latest version
    const latestVersion = await prisma.productVersion.findFirst({
      where: { productId: id },
      orderBy: { createdAt: 'desc' },
    });

    // Parse version number
    const currentVersionNum = latestVersion?.version.replace('v', '') || '1.0';
    const nextVersion = `v${parseFloat(currentVersionNum) + 0.1}`;

    // Create new version
    const newVersion = await prisma.productVersion.create({
      data: {
        productId: id,
        version: nextVersion,
        salePrice: latestVersion?.salePrice || 0,
        costPrice: latestVersion?.costPrice || 0,
        status: 'ACTIVE',
      },
    });

    // Set as current version
    await prisma.product.update({
      where: { id },
      data: { currentVersionId: newVersion.id, status: 'ACTIVE' },
    });

    res.status(201).json({
      status: 'success',
      message: 'New version created successfully',
      data: { version: newVersion },
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: 'Failed to create version' });
  }
};
