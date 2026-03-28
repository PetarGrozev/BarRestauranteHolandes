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
  if (req.method === 'GET') {
    try {
      const products = await db.product.findMany({
        orderBy: { createdAt: 'desc' },
      });
      return res.status(200).json(products);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to fetch products' });
    }
  }

  if (req.method === 'POST') {
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
      const product = await db.product.create({
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
      return res.status(201).json(product);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Could not create product' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
