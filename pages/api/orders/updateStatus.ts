import type { NextApiRequest, NextApiResponse } from 'next';
import { getAdminSessionFromApiRequest } from '../../../lib/auth';
import { updateOrderStatus } from '../../../lib/db';

const VALID_STATUSES = ['RECEIVED', 'PREPARING', 'READY', 'DELIVERED'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!getAdminSessionFromApiRequest(req)) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { orderId, status } = req.body;
  const upperStatus = String(status).toUpperCase();
  const normalizedOrderId = Number(orderId);

  if (!status || !Number.isInteger(normalizedOrderId) || normalizedOrderId <= 0) {
    return res.status(400).json({ message: 'Order ID and status are required' });
  }

  if (!VALID_STATUSES.includes(upperStatus)) {
    return res.status(400).json({ message: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
  }

  try {
    const updatedOrder = await updateOrderStatus(normalizedOrderId, upperStatus);
    return res.status(200).json(updatedOrder);
  } catch (error) {
    console.error('update status error', error);
    return res.status(500).json({ message: 'Error updating order status' });
  }
}