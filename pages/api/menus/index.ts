import type { NextApiRequest, NextApiResponse } from 'next';
import { getAdminSessionFromApiRequest } from '../../../lib/auth';
import { db } from '../../../lib/db';
import { formatMenu, normalizeMenuPayload } from '../../../src/lib/menuApi';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const menus = await db.menu.findMany({
        include: {
          courses: {
            include: {
              products: {
                include: {
                  product: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return res.status(200).json(menus.map(formatMenu));
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to fetch menus' });
    }
  }

  if (req.method === 'POST') {
    if (!getAdminSessionFromApiRequest(req)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const payload = normalizeMenuPayload(req.body);
    if (!payload) {
      return res.status(400).json({ error: 'Invalid menu data' });
    }

    try {
      const menu = await db.menu.create({
        data: {
          name: payload.name,
          description: payload.description,
          isActive: payload.isActive,
          courses: {
            create: payload.courses.map(course => ({
              courseType: course.courseType,
              label: course.label,
              sortOrder: course.sortOrder,
              products: {
                create: course.productIds.map(productId => ({ productId })),
              },
            })),
          },
        },
        include: {
          courses: {
            include: {
              products: {
                include: {
                  product: true,
                },
              },
            },
          },
        },
      });

      return res.status(201).json(formatMenu(menu));
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Could not create menu' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
