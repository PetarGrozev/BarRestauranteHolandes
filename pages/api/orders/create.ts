import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../lib/db';

export default async function createOrder(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { items } = req.body;

    if (!items || !Array.isArray(items)) {
        return res.status(400).json({ message: 'Invalid order data' });
    }

    try {
        const newOrder = await db.order.create({
            data: {
                items: {
                    create: items.map(item => ({
                        productId: item.productId,
                        quantity: item.quantity,
                    })),
                },
            },
        });

        return res.status(201).json(newOrder);
    } catch (error) {
        return res.status(500).json({ message: 'Error creating order', error });
    }
}