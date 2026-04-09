import type { NextApiRequest, NextApiResponse } from 'next';
import { getAdminSessionFromApiRequest } from '../../../lib/auth';
import { db } from '../../../lib/db';
import { getRestaurantContextFromRequest } from '../../../lib/restaurant-context';
import { formatMenu, normalizeMenuPayload } from '../../../src/lib/menuApi';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const context = await getRestaurantContextFromRequest(req);
      if (!context) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const menus = await db.menu.findMany({
        where: { restaurantId: context.restaurantId },
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
    const adminSession = getAdminSessionFromApiRequest(req);
    if (!adminSession) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const payload = normalizeMenuPayload(req.body);
    if (!payload) {
      return res.status(400).json({ error: 'Invalid menu data' });
    }

    try {
      const productCount = await db.product.count({
        where: {
          restaurantId: adminSession.restaurantId,
          id: {
            in: payload.courses.flatMap(course => course.productIds),
          },
        },
      });

      const expectedProductCount = new Set(payload.courses.flatMap(course => course.productIds)).size;
      if (productCount !== expectedProductCount) {
        return res.status(400).json({ error: 'Menu contains products from another restaurant or missing products.' });
      }

      const menu = await db.menu.create({
        data: {
          restaurantId: adminSession.restaurantId,
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
