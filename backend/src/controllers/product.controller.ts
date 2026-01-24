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

    // CRITICAL FIX: Prevent direct edits to ACTIVE products (must use ECO)
    const existingProduct = await prisma.product.findUnique({ 
      where: { id },
      select: { status: true, name: true }
    });

    if (!existingProduct) {
      res.status(404).json({ status: 'error', message: 'Product not found' });
      return;
    }

    if (existingProduct.status === 'ACTIVE') {
      res.status(400).json({ 
        status: 'error', 
        message: 'Cannot directly edit active products. Use ECO workflow to modify active products.' 
      });
      return;
    }

    // CRITICAL FIX: Prevent edits to ARCHIVED products
    if (existingProduct.status === 'ARCHIVED') {
      res.status(400).json({ 
        status: 'error', 
        message: 'Cannot edit archived products. Archived data is read-only for traceability.' 
      });
      return;
    }

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

// Archive product with cascading
export const archiveProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { cascadeArchive = true } = req.query; // Default to true for data consistency

    // CRITICAL FIX: Use transaction for cascading archive
    await prisma.$transaction(async (tx) => {
      // Archive the product
      await tx.product.update({
        where: { id },
        data: { status: 'ARCHIVED' },
      });

      // CASCADE: Archive all product versions if requested
      if (cascadeArchive === 'true' || cascadeArchive === true) {
        await tx.productVersion.updateMany({
          where: { 
            productId: id,
            status: { not: 'ARCHIVED' }
          },
          data: { status: 'ARCHIVED' },
        });

        // CASCADE: Archive all BOMs linked to this product's versions
        const versions = await tx.productVersion.findMany({
          where: { productId: id },
          select: { id: true }
        });

        const versionIds = versions.map(v => v.id);
        if (versionIds.length > 0) {
          await tx.bOM.updateMany({
            where: {
              productVersionId: { in: versionIds },
              status: { not: 'ARCHIVED' }
            },
            data: { status: 'ARCHIVED' },
          });
        }
      }
    });

    res.status(200).json({
      status: 'success',
      message: cascadeArchive === 'true' || cascadeArchive === true 
        ? 'Product and all related versions/BOMs archived successfully'
        : 'Product archived successfully',
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

// CRITICAL FIX: Update product version with immutability protection (Rule C2)
export const updateProductVersion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params; // version ID
    const { salePrice, costPrice, attachments } = req.body;

    // Check if version exists
    const existingVersion = await prisma.productVersion.findUnique({ 
      where: { id },
      select: { status: true, version: true, productId: true }
    });

    if (!existingVersion) {
      res.status(404).json({ status: 'error', message: 'Product version not found' });
      return;
    }

    // CRITICAL: Enforce version immutability for ACTIVE/ARCHIVED versions
    if (existingVersion.status === 'ACTIVE') {
      res.status(400).json({ 
        status: 'error', 
        message: 'Cannot modify active product versions. Create a new version via ECO workflow to maintain version history integrity.' 
      });
      return;
    }

    if (existingVersion.status === 'ARCHIVED') {
      res.status(400).json({ 
        status: 'error', 
        message: 'Cannot modify archived product versions. Archived versions are immutable for traceability.' 
      });
      return;
    }

    // Only allow updates to DRAFT versions
    const updated = await prisma.productVersion.update({
      where: { id },
      data: {
        salePrice: salePrice !== undefined ? salePrice : undefined,
        costPrice: costPrice !== undefined ? costPrice : undefined,
        attachments: attachments !== undefined ? attachments : undefined,
      },
    });

    res.status(200).json({
      status: 'success',
      message: 'Product version updated successfully',
      data: { version: updated },
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: 'Failed to update product version' });
  }
};

// CRITICAL FIX: Delete product with ACTIVE protection
export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Check product status before deletion
    const product = await prisma.product.findUnique({
      where: { id },
      select: { status: true, name: true }
    });

    if (!product) {
      res.status(404).json({ status: 'error', message: 'Product not found' });
      return;
    }

    // CRITICAL: Prevent deletion of ACTIVE products (must archive instead)
    if (product.status === 'ACTIVE') {
      res.status(400).json({ 
        status: 'error', 
        message: 'Cannot delete active products. Use archive endpoint to archive active products instead.' 
      });
      return;
    }

    // CRITICAL: Prevent deletion of ARCHIVED products (preserve history)
    if (product.status === 'ARCHIVED') {
      res.status(400).json({ 
        status: 'error', 
        message: 'Cannot delete archived products. Archived products must be retained for audit trail.' 
      });
      return;
    }

    // Only allow deletion of DRAFT products
    await prisma.product.delete({ where: { id } });

    res.status(200).json({
      status: 'success',
      message: 'Product deleted successfully',
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: 'Failed to delete product' });
  }
};
