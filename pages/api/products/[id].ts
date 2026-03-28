import type { NextApiRequest, NextApiResponse } from 'next';
import type { ProductCategory } from '@prisma/client';
import { db } from '../../../lib/db';
import { isValidProductImageValue } from '../../../src/lib/productImages';

function normalizeStock(value: unknown) {
  const stock = Number(value);
  return Number.isInteger(stock) && stock >= 0 ? stock : null;
}

function normalizeEnabled(value: unknown) {
  if (typeof value === 'boolean') {
    return value;
  }

  return null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const id = Number(req.query.id);
  if (!id) {
    return res.status(400).json({ error: 'Invalid product id' });
  }

  if (req.method === 'GET') {
    try {
      const product = await db.product.findUnique({ where: { id } });
      if (!product) return res.status(404).json({ error: 'Product not found' });
      return res.status(200).json(product);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to fetch product' });
    }
  }

  if (req.method === 'PATCH') {
    const { name, description, price, image, orderDestination, category, stock, isEnabled } = req.body;
    const normalizedCategory = String(category).toUpperCase() as ProductCategory;
    const normalizedStock = normalizeStock(stock);
    const normalizedEnabled = normalizeEnabled(isEnabled);

    if (!name || !Number.isFinite(Number(price)) || normalizedStock === null || normalizedEnabled === null || !['FOOD', 'DRINK'].includes(normalizedCategory)) {
      return res.status(400).json({ error: 'Invalid product data' });
    }

    if (image && !isValidProductImageValue(String(image))) {
      return res.status(400).json({ error: 'Invalid product image' });
    }

    try {
      const product = await db.product.update({
        where: { id },
        data: {
          name,
          description: description || null,
          price: Number(price),
          stock: normalizedStock,
          isEnabled: normalizedEnabled,
          imageUrl: image || null,
          category: normalizedCategory,
          orderTarget: orderDestination?.toUpperCase() ?? 'BOTH',
        },
      });
      return res.status(200).json(product);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to update product' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      await db.product.delete({ where: { id } });
      return res.status(204).end();
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to delete product' });
    }
  }

  res.setHeader('Allow', ['GET', 'PATCH', 'DELETE']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
