import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../lib/db';

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
    const { name, price, image, orderDestination } = req.body;
    try {
      const product = await db.product.update({
        where: { id },
        data: {
          name,
          price: Number(price),
          imageUrl: image || null,
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
