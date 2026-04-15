import { NextApiRequest, NextApiResponse } from 'next';
import { getAdminSessionFromApiRequest } from '../../../lib/auth';
import { db } from '../../../lib/db';

type ExportPeriod = 'daily' | 'weekly' | 'monthly';

function toCsv(rows: any[]) {
  const headers = rows.length > 0
    ? Object.keys(rows[0])
    : ['product', 'hoeveelheid', 'Eenheidsprijs', 'totaalVerkocht'];
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

function normalizePeriod(value: unknown): ExportPeriod {
  return value === 'daily' || value === 'weekly' || value === 'monthly' ? value : 'daily';
}

function getPeriodRange(period: ExportPeriod, now = new Date()) {
  const start = new Date(now);

  if (period === 'daily') {
    start.setHours(0, 0, 0, 0);
  }

  if (period === 'weekly') {
    const day = start.getDay();
    const diff = day === 0 ? 6 : day - 1;
    start.setDate(start.getDate() - diff);
    start.setHours(0, 0, 0, 0);
  }

  if (period === 'monthly') {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  }

  return { start, end: now };
}

function getFilename(period: ExportPeriod, date = new Date()) {
  const stamp = date.toISOString().slice(0, 10);
  return `ventas-${period}-${stamp}.csv`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const adminSession = getAdminSessionFromApiRequest(req);
  if (!adminSession) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const period = normalizePeriod(req.query.period);
    const { start, end } = getPeriodRange(period);

    const orders = await db.order.findMany({
      where: {
        restaurantId: adminSession.restaurantId,
        status: 'DELIVERED',
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      include: {
        orderItems: {
          include: {
            product: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const grouped = new Map<string, { producto: string; cantidad: number; precioUnitario: number; totalVendido: number }>();

    for (const order of orders) {
      for (const item of order.orderItems) {
        const productName = item.product?.name ?? `Producto #${item.productId}`;
        const key = `${productName}:${item.price}`;
        const current = grouped.get(key) ?? {
          producto: productName,
          cantidad: 0,
          precioUnitario: item.price,
          totalVendido: 0,
        };

        current.cantidad += item.quantity;
        current.totalVendido += item.quantity * item.price;
        grouped.set(key, current);
      }
    }

    const rows = Array.from(grouped.values())
      .sort((left, right) => {
        const byName = left.producto.localeCompare(right.producto, 'es-ES', { sensitivity: 'base' });
        if (byName !== 0) {
          return byName;
        }

        return left.precioUnitario - right.precioUnitario;
      })
      .map(row => ({
        producto: row.producto,
        cantidad: row.cantidad,
        precioUnitario: row.precioUnitario.toFixed(2),
        totalVendido: row.totalVendido.toFixed(2),
      }));

    const csvData = toCsv(rows);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${getFilename(period)}`);
    res.status(200).send(csvData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to export orders' });
  }
}
