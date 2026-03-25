import { prisma } from './prisma';

export const db = prisma;

export async function getOrders() {
  return db.order.findMany({
    include: {
      table: true,
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
}

export async function getProducts() {
  return db.product.findMany({
    orderBy: { createdAt: 'desc' },
  });
}

export async function getTables() {
  return db.diningTable.findMany({
    where: { isActive: true },
    orderBy: [{ area: 'asc' }, { number: 'asc' }],
  });
}

export async function configureTables(interiorNumbers: number[], terraceNumbers: number[]) {
  const desiredRows = [
    ...interiorNumbers.map(number => ({ number, area: 'INTERIOR' as const })),
    ...terraceNumbers.map(number => ({ number, area: 'TERRACE' as const })),
  ];

  await db.$transaction(async transaction => {
    const existingTables = await transaction.diningTable.findMany({
      orderBy: [{ area: 'asc' }, { number: 'asc' }],
    });
    const desiredKeys = new Set(desiredRows.map(table => `${table.area}:${table.number}`));
    const existingKeys = new Set(existingTables.map(table => `${table.area}:${table.number}`));
    const tablesToDelete = existingTables
      .filter(table => !desiredKeys.has(`${table.area}:${table.number}`))
      .map(table => table.id);
    const tablesToCreate = desiredRows.filter(table => !existingKeys.has(`${table.area}:${table.number}`));

    if (tablesToDelete.length > 0) {
      await transaction.diningTable.deleteMany({
        where: { id: { in: tablesToDelete } },
      });
    }

    if (tablesToCreate.length > 0) {
      await transaction.diningTable.createMany({
        data: tablesToCreate,
      });
    }
  });

  return getTables();
}

export async function createOrder(tableId: number, items: { productId: number; quantity: number; price: number }[]) {
  return db.order.create({
    data: {
      status: 'RECEIVED',
      table: {
        connect: { id: tableId },
      },
      orderItems: {
        create: items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
        })),
      },
    },
    include: {
      table: true,
      orderItems: {
        include: { product: true },
      },
    },
  });
}

export async function updateOrderStatus(orderId: number, status: string) {
  return db.order.update({
    where: { id: orderId },
    data: { status: status.toUpperCase() as any },
    include: {
      table: true,
      orderItems: {
        include: { product: true },
      },
    },
  });
}
