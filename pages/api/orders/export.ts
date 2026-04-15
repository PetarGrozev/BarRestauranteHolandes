import { NextApiRequest, NextApiResponse } from 'next';
import { getAdminSessionFromApiRequest } from '../../../lib/auth';
import { db } from '../../../lib/db';

type ExportPeriod = 'daily' | 'weekly' | 'monthly';

function toCsv(rows: any[]) {
  const headers =
    rows.length > 0
      ? Object.keys(rows[0])
      : ['Product', 'Hoeveelheid', 'Eenheidsprijs', 'Totaal verkocht'];

  const escape = (value: any) => {
    if (value == null) return '';
    const text = String(value);
    if (text.includes(',') || text.includes('"') || text.includes('\n')) {
      return '"' + text.replace(/"/g, '""') + '"';
    }
    return text;
  };

  const headerRow = headers.join(',');
  const dataRows = rows.map((r) => headers.map((h) => escape(r[h])).join(','));
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

  const periodMap: Record<ExportPeriod, string> = {
    daily: 'dagelijks',
    weekly: 'wekelijks',
    monthly: 'maandelijks',
  };

  return `verkopen-${periodMap[period]}-${stamp}.csv`;
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

    const grouped = new Map<
      string,
      {
        Product: string;
        Hoeveelheid: number;
        Eenheidsprijs: number;
        'Totaal verkocht': number;
      }
    >();

    for (const order of orders) {
      for (const item of order.orderItems) {
        const productName = item.product?.name ?? `Product #${item.productId}`;
        const key = `${productName}:${item.price}`;

        const current = grouped.get(key) ?? {
          Product: productName,
          Hoeveelheid: 0,
          Eenheidsprijs: item.price,
          'Totaal verkocht': 0,
        };

        current.Hoeveelheid += item.quantity;
        current['Totaal verkocht'] += item.quantity * item.price;

        grouped.set(key, current);
      }
    }

    const rows = Array.from(grouped.values())
      .sort((left, right) => {
        const byName = left.Product.localeCompare(right.Product, 'nl-NL', {
          sensitivity: 'base',
        });

        if (byName !== 0) {
          return byName;
        }

        return left.Eenheidsprijs - right.Eenheidsprijs;
      })
      .map((row) => ({
        Product: row.Product,
        Hoeveelheid: row.Hoeveelheid,
        Eenheidsprijs: row.Eenheidsprijs.toFixed(2),
        'Totaal verkocht': row['Totaal verkocht'].toFixed(2),
      }));

    const csvData = toCsv(rows);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${getFilename(period)}`);
    res.status(200).send(csvData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to export orders' });
  }
}