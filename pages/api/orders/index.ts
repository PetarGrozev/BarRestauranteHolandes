import type { NextApiRequest, NextApiResponse } from 'next';
import { getOrders } from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const orders = await getOrders();
    return res.status(200).json(orders);
  } catch (error) {
    console.error('orders fetch error', error);
    return res.status(500).json({ error: 'Failed to fetch orders' });
  }
}
