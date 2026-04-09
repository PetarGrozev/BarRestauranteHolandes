import type { Prisma } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';
import { ADMIN_PASSWORD_MIN_LENGTH, getSuperAdminSessionFromApiRequest, hashAdminPassword, isAdminPasswordFormatValid } from '../../../../lib/auth';
import { db } from '../../../../lib/db';
import { isPlausibleEmail, normalizeRestaurantAdminEmail, normalizeRestaurantLogoUrl, normalizeRestaurantName, normalizeRestaurantSlug } from '../../../../lib/restaurants';

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

  if (req.method === 'GET') {
    try {
      const restaurants = await db.restaurant.findMany({
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
        orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
      });

      return res.status(200).json(restaurants.map(mapRestaurant));
    } catch (error) {
      console.error('superadmin restaurants fetch error', error);
      return res.status(500).json({ message: 'No se pudieron cargar los restaurantes.' });
    }
  }

  if (req.method === 'POST') {
    const name = normalizeRestaurantName(req.body?.name);
    const slug = normalizeRestaurantSlug(req.body?.slug || req.body?.name);
    const logoUrl = normalizeRestaurantLogoUrl(req.body?.logoUrl);
    const adminEmail = normalizeRestaurantAdminEmail(req.body?.adminEmail);
    const adminPassword = String(req.body?.adminPassword ?? '');

    if (!name || !slug || !adminEmail || !isPlausibleEmail(adminEmail)) {
      return res.status(400).json({ message: 'Introduce nombre, slug y email inicial válidos.' });
    }

    if (!isAdminPasswordFormatValid(adminPassword)) {
      return res.status(400).json({ message: `La contraseña inicial debe tener al menos ${ADMIN_PASSWORD_MIN_LENGTH} caracteres.` });
    }

    try {
      const restaurant = await db.$transaction(async transaction => {
        const createdRestaurant = await transaction.restaurant.create({
          data: {
            name,
            slug,
            logoUrl,
            isActive: true,
          },
        });

        await transaction.admin.create({
          data: {
            email: adminEmail,
            passwordHash: hashAdminPassword(adminPassword),
            restaurantId: createdRestaurant.id,
          },
        });

        return transaction.restaurant.findUniqueOrThrow({
          where: { id: createdRestaurant.id },
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
      });

      return res.status(201).json(mapRestaurant(restaurant));
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
        return res.status(409).json({ message: 'Ya existe un restaurante o admin con esos datos.' });
      }

      console.error('superadmin restaurant create error', error);
      return res.status(500).json({ message: 'No se pudo crear el restaurante.' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ message: 'Method not allowed' });
}