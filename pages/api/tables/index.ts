import type { NextApiRequest, NextApiResponse } from 'next';
import { configureTables, getTables } from '../../../lib/db';

function summarizeTables(tables: Awaited<ReturnType<typeof getTables>>) {
  return {
    interiorCount: tables.filter(table => table.area === 'INTERIOR').length,
    terraceCount: tables.filter(table => table.area === 'TERRACE').length,
    interiorNumbers: tables.filter(table => table.area === 'INTERIOR').map(table => table.number),
    terraceNumbers: tables.filter(table => table.area === 'TERRACE').map(table => table.number),
  };
}

function normalizeNumbers(value: unknown) {
  if (!Array.isArray(value)) {
    return null;
  }

  const numbers = value.map(item => Number(item));
  const uniqueNumbers = new Set(numbers);
  const isValid = numbers.every(number => Number.isInteger(number) && number > 0) && uniqueNumbers.size === numbers.length;

  return isValid ? numbers.sort((left, right) => left - right) : null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const tables = await getTables();
      return res.status(200).json({ tables, ...summarizeTables(tables) });
    } catch (error) {
      console.error('tables fetch error', error);
      return res.status(500).json({ error: 'Failed to fetch tables' });
    }
  }

  if (req.method === 'POST') {
    const interiorNumbers = normalizeNumbers(req.body?.interiorNumbers);
    const terraceNumbers = normalizeNumbers(req.body?.terraceNumbers);

    if (
      !interiorNumbers ||
      !terraceNumbers ||
      interiorNumbers.length + terraceNumbers.length === 0
    ) {
      return res.status(400).json({ error: 'Invalid table configuration' });
    }

    try {
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