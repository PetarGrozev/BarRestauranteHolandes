import type { NextApiRequest, NextApiResponse } from 'next';
import { createOrder } from '../../../lib/db';

function normalizeItems(items: unknown) {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  const normalized = items.map((item) => {
    const payload = item as { productId?: unknown; quantity?: unknown; price?: unknown };
    return {
      productId: Number(payload.productId),
      quantity: Number(payload.quantity),
      price: Number(payload.price),
    };
  });

  const isValid = normalized.every(
    (item) =>
      Number.isInteger(item.productId) &&
      item.productId > 0 &&
      Number.isInteger(item.quantity) &&
      item.quantity > 0 &&
      Number.isFinite(item.price) &&
      item.price >= 0,
  );

  return isValid ? normalized : null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const normalizedItems = normalizeItems(req.body?.items);
  const tableId = Number(req.body?.tableId);

  if (!normalizedItems || !Number.isInteger(tableId) || tableId <= 0) {
    return res.status(400).json({ message: 'Invalid order data' });
  }

  try {
    const newOrder = await createOrder(tableId, normalizedItems);
    return res.status(201).json(newOrder);
  } catch (error) {
    console.error('create order error', error);
    return res.status(500).json({ message: 'Error creating order' });
  }
}