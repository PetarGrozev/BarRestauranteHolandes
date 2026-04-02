import type { NextApiRequest, NextApiResponse } from 'next';
import { CUSTOMER_TABLE_COOKIE, getAdminSessionFromApiRequest } from '../../../lib/auth';
import { configureTables, getTables } from '../../../lib/db';

function summarizeTables(tables: Awaited<ReturnType<typeof getTables>>) {
  return {
    interiorCount: tables.filter(table => table.area === 'INTERIOR').length,
    terraceCount: tables.filter(table => table.area === 'TERRACE').length,
    interiorNumbers: tables.filter(table => table.area === 'INTERIOR').map(table => table.number),
    terraceNumbers: tables.filter(table => table.area === 'TERRACE').map(table => table.number),
  };
}

function normalizeCount(value: unknown) {
  const count = Number(value);

  if (!Number.isInteger(count) || count < 0) {
    return null;
  }

  return count;
}

function buildTableNumbers(count: number) {
  return Array.from({ length: count }, (_, index) => index + 1);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const tables = await getTables();
      const adminSession = getAdminSessionFromApiRequest(req);
      const customerTableId = Number(req.cookies[CUSTOMER_TABLE_COOKIE]);
      const scopedTables = !adminSession && Number.isInteger(customerTableId) && customerTableId > 0
        ? tables.filter(table => table.id === customerTableId)
        : tables;

      return res.status(200).json({ tables: scopedTables, ...summarizeTables(scopedTables) });
    } catch (error) {
      console.error('tables fetch error', error);
      return res.status(500).json({ error: 'Failed to fetch tables' });
    }
  }

  if (req.method === 'POST') {
    if (!getAdminSessionFromApiRequest(req)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const interiorCount = normalizeCount(req.body?.interiorCount);
    const terraceCount = normalizeCount(req.body?.terraceCount);

    if (
      interiorCount === null ||
      terraceCount === null ||
      interiorCount + terraceCount === 0
    ) {
      return res.status(400).json({ error: 'Invalid table configuration' });
    }

    try {
      const interiorNumbers = buildTableNumbers(interiorCount);
      const terraceNumbers = buildTableNumbers(terraceCount);
      const tables = await configureTables(interiorNumbers, terraceNumbers);
      return res.status(200).json({ tables, ...summarizeTables(tables) });
    } catch (error) {
      console.error('tables config error', error);
      return res.status(500).json({ error: 'Failed to save tables' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}