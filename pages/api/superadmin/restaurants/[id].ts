import type { Prisma } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getSuperAdminSessionFromApiRequest } from '../../../../lib/auth';
import { db } from '../../../../lib/db';
import { normalizeRestaurantLogoUrl, normalizeRestaurantName, normalizeRestaurantSlug } from '../../../../lib/restaurants';

type RestaurantWithCounts = Prisma.RestaurantGetPayload<{
  include: {
    _count: {
      select: {
        admins: true;
        products: true;
        diningTables: true;
        orders: true;
      };
    };
  };
}>;

function mapRestaurant(record: RestaurantWithCounts) {
  return {
    id: record.id,
    name: record.name,
    slug: record.slug,
    logoUrl: record.logoUrl,
    isActive: record.isActive,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    counts: {
      admins: record._count.admins,
      products: record._count.products,
      tables: record._count.diningTables,
      orders: record._count.orders,
    },
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!getSuperAdminSessionFromApiRequest(req)) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const id = Number(req.query.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ message: 'Invalid restaurant id' });
  }

  if (req.method !== 'PATCH') {
    res.setHeader('Allow', ['PATCH']);
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const name = normalizeRestaurantName(req.body?.name);
  const slug = normalizeRestaurantSlug(req.body?.slug || req.body?.name);
  const logoUrl = normalizeRestaurantLogoUrl(req.body?.logoUrl);
  const isActive = typeof req.body?.isActive === 'boolean' ? req.body.isActive : null;

  if (!name || !slug || isActive === null) {
    return res.status(400).json({ message: 'Datos de restaurante inválidos.' });
  }

  try {
    const existing = await db.restaurant.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Restaurante no encontrado.' });
    }

    const restaurant = await db.restaurant.update({
      where: { id },
      data: {
        name,
        slug,
        logoUrl,
        isActive,
      },
      include: {
        _count: {
          select: {
            admins: true,
            products: true,
            diningTables: true,
            orders: true,
          },
        },
      },
    });

    return res.status(200).json(mapRestaurant(restaurant));
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      return res.status(409).json({ message: 'El slug ya está en uso por otro restaurante.' });
    }

    console.error('superadmin restaurant update error', error);
    return res.status(500).json({ message: 'No se pudo actualizar el restaurante.' });
  }
}