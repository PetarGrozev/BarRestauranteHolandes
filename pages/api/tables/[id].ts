import type { NextApiRequest, NextApiResponse } from 'next';
import { closeTableSession, getTableById, reopenTableSession } from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const tableId = Number(req.query.id);

  if (!Number.isInteger(tableId) || tableId <= 0) {
    return res.status(400).json({ error: 'Invalid table id' });
  }

  if (req.method === 'GET') {
    try {
      const table = await getTableById(tableId);

      if (!table) {
        return res.status(404).json({ error: 'Table not found' });
      }

      return res.status(200).json({ table });
    } catch (error) {
      console.error('table fetch error', error);
      return res.status(500).json({ error: 'Failed to fetch table' });
    }
  }

  if (req.method === 'POST') {
    const action = String(req.body?.action ?? '').toLowerCase();

    try {
      if (action === 'close') {
        const result = await closeTableSession(tableId);
        return res.status(200).json(result);
      }

      if (action === 'reopen') {
        const table = await reopenTableSession(tableId);
        return res.status(200).json({ table });
      }

      return res.status(400).json({ error: 'Invalid action' });
    } catch (error) {
      console.error('table session error', error);

      if (error instanceof Error) {
        if (error.message === 'TABLE_NOT_FOUND') {
          return res.status(404).json({ error: 'Table not found' });
        }

        if (error.message === 'TABLE_ALREADY_CLOSED') {
          return res.status(409).json({ error: 'Table is already closed' });
        }

          if (error.message === 'TABLE_HAS_ACTIVE_ORDERS') {
            return res.status(409).json({ error: 'No puedes cerrar la mesa mientras tenga pedidos activos.' });
          }
      }

      return res.status(500).json({ error: 'Failed to update table state' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}