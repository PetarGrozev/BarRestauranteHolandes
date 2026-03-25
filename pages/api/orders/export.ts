import { NextApiRequest, NextApiResponse } from 'next';
import { getOrders } from '../../../lib/db';

function toCsv(rows: any[]) {
  if (!rows || rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (value: any) => {
    if (value == null) return '';
    const text = String(value);
    if (text.includes(',') || text.includes('"') || text.includes('\n')) {
      return '"' + text.replace(/"/g, '""') + '"';
    }
    return text;
  };
  const headerRow = headers.join(',');
  const dataRows = rows.map(r => headers.map(h => escape(r[h])).join(','));
  return [headerRow, ...dataRows].join('\n');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const orders = await getOrders();
    const flatOrders = orders.map(order => ({
      id: order.id,
      table: order.table ? `Mesa ${order.table.number} ${order.table.area === 'TERRACE' ? 'Terraza' : 'Interior'}` : '',
      status: order.status,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      items: order.orderItems
        .map(item => `${item.product.name} x${item.quantity}`)
        .join(' | '),
    }));

    const csvData = toCsv(flatOrders);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=orders.csv');
    res.status(200).send(csvData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to export orders' });
  }
}
