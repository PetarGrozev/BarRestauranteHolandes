import type { NextApiRequest, NextApiResponse } from 'next';
import { getAdminSessionFromApiRequest, isCustomerTableRequestAllowed } from '../../../lib/auth';
import { createOrder } from '../../../lib/db';

function normalizeItems(items: unknown) {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  const normalized = items.map((item) => {
    const payload = item as { productId?: unknown; quantity?: unknown; note?: unknown };
    const note = typeof payload.note === 'string' ? payload.note.trim() : '';

    return {
      productId: Number(payload.productId),
      quantity: Number(payload.quantity),
      note: note.length > 0 ? note : null,
    };
  });

  const isValid = normalized.every(
    (item) =>
      Number.isInteger(item.productId) &&
      item.productId > 0 &&
      Number.isInteger(item.quantity) &&
      item.quantity > 0 &&
      (!item.note || item.note.length <= 280),
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

  if (!getAdminSessionFromApiRequest(req) && !isCustomerTableRequestAllowed(req, tableId)) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  try {
    const newOrder = await createOrder(tableId, normalizedItems);
    return res.status(201).json(newOrder);
  } catch (error) {
    console.error('create order error', error);

    if (error instanceof Error && error.message === 'TABLE_CLOSED') {
      return res.status(409).json({ message: 'La mesa está cerrada. Ábrela antes de crear nuevos pedidos.' });
    }

    if (error instanceof Error && error.message === 'PRODUCT_NOT_FOUND') {
      return res.status(404).json({ message: 'Uno de los productos ya no existe.' });
    }

    if (error instanceof Error && error.message.startsWith('PRODUCT_DISABLED:')) {
      const [, productName] = error.message.split(':');
      return res.status(409).json({ message: `${productName} está deshabilitado y no se puede pedir ahora.` });
    }

    if (error instanceof Error && error.message.startsWith('OUT_OF_STOCK:')) {
      const [, productName] = error.message.split(':');
      return res.status(409).json({ message: `${productName} se ha quedado sin stock.` });
    }

    return res.status(500).json({ message: 'Error creating order' });
  }
}