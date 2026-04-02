import type { NextApiRequest, NextApiResponse } from 'next';
import { getAdminSessionFromApiRequest, isCustomerTableRequestAllowed } from '../../../lib/auth';
import { getOrders } from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const tableId = Number(req.query.tableId);
    const scopedTableId = Number.isInteger(tableId) && tableId > 0 ? tableId : undefined;

    if (!scopedTableId && !getAdminSessionFromApiRequest(req)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (scopedTableId && !getAdminSessionFromApiRequest(req) && !isCustomerTableRequestAllowed(req, scopedTableId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const orders = await getOrders(scopedTableId);
    return res.status(200).json(orders);
  } catch (error) {
    console.error('orders fetch error', error);
    return res.status(500).json({ error: 'Failed to fetch orders' });
  }
}
