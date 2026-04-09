import type { NextApiRequest } from 'next';
import { CUSTOMER_TABLE_COOKIE, getAdminSessionFromApiRequest } from './auth';
import { prisma } from './prisma';

export type RequestRestaurantContext = {
  restaurantId: number;
  restaurantSlug: string;
  source: 'admin' | 'customer';
  customerTableId?: number;
};

export async function getRestaurantContextFromCustomerTableId(tableId: number) {
  if (!Number.isInteger(tableId) || tableId <= 0) {
    return null;
  }

  const table = await prisma.diningTable.findUnique({
    where: { id: tableId },
    select: {
      id: true,
      restaurantId: true,
      restaurant: {
        select: {
          slug: true,
          isActive: true,
        },
      },
    },
  });

  if (!table || !table.restaurant.isActive) {
    return null;
  }

  return {
    restaurantId: table.restaurantId,
    restaurantSlug: table.restaurant.slug,
    customerTableId: table.id,
    source: 'customer' as const,
  };
}

export async function getRestaurantContextFromRequest(req: NextApiRequest): Promise<RequestRestaurantContext | null> {
  const adminSession = getAdminSessionFromApiRequest(req);

  if (adminSession) {
    return {
      restaurantId: adminSession.restaurantId,
      restaurantSlug: adminSession.restaurantSlug,
      source: 'admin',
    };
  }

  const customerTableId = Number(req.cookies[CUSTOMER_TABLE_COOKIE]);
  return getRestaurantContextFromCustomerTableId(customerTableId);
}