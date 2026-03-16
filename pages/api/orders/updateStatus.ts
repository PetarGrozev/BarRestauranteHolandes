import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../lib/db';

export default async function updateStatus(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { orderId, status } = req.body;

    if (!orderId || !status) {
        return res.status(400).json({ message: 'Order ID and status are required' });
    }

    try {
        const updatedOrder = await db.order.update({
            where: { id: orderId },
            data: { status },
        });

        return res.status(200).json(updatedOrder);
    } catch (error) {
        return res.status(500).json({ message: 'Error updating order status', error });
    }
}