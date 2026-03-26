import type { NextApiRequest, NextApiResponse } from 'next';
import { deleteOrder } from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const orderId = Number(req.query.id);

  if (!Number.isInteger(orderId) || orderId <= 0) {
    return res.status(400).json({ error: 'Invalid order id' });
  }

  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const order = await deleteOrder(orderId);
    return res.status(200).json({ order });
  } catch (error) {
    console.error('delete order error', error);

    if (error instanceof Error && error.message === 'ORDER_NOT_FOUND') {
      return res.status(404).json({ error: 'Order not found' });
    }

    return res.status(500).json({ error: 'Failed to delete order' });
  }
}