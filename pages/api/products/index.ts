import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../lib/db';

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
    const { name, price, image, orderDestination } = req.body;
    try {
      const product = await db.product.create({
        data: {
          name,
          price: Number(price),
          imageUrl: image || null,
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
