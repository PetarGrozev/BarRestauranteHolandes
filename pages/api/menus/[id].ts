import type { NextApiRequest, NextApiResponse } from 'next';
import { getAdminSessionFromApiRequest } from '../../../lib/auth';
import { db } from '../../../lib/db';
import { formatMenu, normalizeMenuPayload } from '../../../src/lib/menuApi';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const id = Number(req.query.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid menu id' });
  }

  if (req.method === 'GET') {
    try {
      const menu = await db.menu.findUnique({
        where: { id },
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

      if (!menu) {
        return res.status(404).json({ error: 'Menu not found' });
      }

      return res.status(200).json(formatMenu(menu));
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to fetch menu' });
    }
  }

  if (req.method === 'PATCH') {
    if (!getAdminSessionFromApiRequest(req)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const payload = normalizeMenuPayload(req.body);
    if (!payload) {
      return res.status(400).json({ error: 'Invalid menu data' });
    }

    try {
      const menu = await db.$transaction(async transaction => {
        await transaction.menuCourseProduct.deleteMany({
          where: {
            course: {
              menuId: id,
            },
          },
        });

        await transaction.menuCourse.deleteMany({
          where: { menuId: id },
        });

        return transaction.menu.update({
          where: { id },
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
      });

      return res.status(200).json(formatMenu(menu));
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to update menu' });
    }
  }

  if (req.method === 'DELETE') {
    if (!getAdminSessionFromApiRequest(req)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      await db.menu.delete({ where: { id } });
      return res.status(204).end();
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to delete menu' });
    }
  }

  res.setHeader('Allow', ['GET', 'PATCH', 'DELETE']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
