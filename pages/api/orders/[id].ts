import type { NextApiRequest, NextApiResponse } from 'next';
import { getAdminSessionFromApiRequest } from '../../../lib/auth';
import { getRestaurantContextFromRequest } from '../../../lib/restaurant-context';
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

  if (!getAdminSessionFromApiRequest(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const context = await getRestaurantContextFromRequest(req);
    if (!context) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const order = await deleteOrder(context.restaurantId, orderId);
    return res.status(200).json({ order });
  } catch (error) {
    console.error('delete order error', error);

    if (error instanceof Error && error.message === 'ORDER_NOT_FOUND') {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (error instanceof Error && error.message === 'ORDER_ALREADY_DELIVERED') {
      return res.status(409).json({ error: 'No puedes borrar un pedido ya entregado.' });
    }

    if (error instanceof Error && error.message === 'ORDER_TABLE_CLOSED') {
      return res.status(409).json({ error: 'No puedes borrar pedidos de una mesa cerrada.' });
    }

    return res.status(500).json({ error: 'Failed to delete order' });
  }
}