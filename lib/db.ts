import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';

export const db = prisma;

type TableWithOrders = Prisma.DiningTableGetPayload<{
  include: {
    orders: {
      include: {
        orderItems: {
          include: {
            product: {
              select: {
                id: true;
                name: true;
              };
            };
          };
        };
      };
    };
  };
}>;

function buildSessionSummary(table: { id: number; number: number; area: 'INTERIOR' | 'TERRACE'; currentSession: number }, orders: TableWithOrders['orders']) {
  const itemsMap = new Map<number | null, { productId: number | null; name: string; quantity: number; total: number }>();
  let itemCount = 0;
  let total = 0;

  for (const order of orders) {
    for (const item of order.orderItems) {
      itemCount += item.quantity;
      total += item.price * item.quantity;
      const productId = item.product?.id ?? item.productId ?? null;
      const existing = itemsMap.get(productId) ?? {
        productId,
        name: item.product?.name ?? `Producto #${item.productId}`,
        quantity: 0,
        total: 0,
      };

      existing.quantity += item.quantity;
      existing.total += item.price * item.quantity;
      itemsMap.set(productId, existing);
    }
  }

  return {
    tableId: table.id,
    tableNumber: table.number,
    area: table.area,
    sessionNumber: table.currentSession,
    orderCount: orders.length,
    itemCount,
    total,
    items: Array.from(itemsMap.values()).sort((left, right) => left.name.localeCompare(right.name, 'es')),
  };
}

function decorateTable(table: TableWithOrders) {
  const currentOrders = table.orders.filter(order => order.tableSession === table.currentSession);
  const currentSummary = buildSessionSummary(table, currentOrders);
  const { orders, ...tableData } = table;

  return {
    ...tableData,
    currentTotal: currentSummary.total,
    currentOrderCount: currentSummary.orderCount,
    currentItemCount: currentSummary.itemCount,
  };
}

async function getTableWithOrders(tableId: number) {
  return db.diningTable.findUnique({
    where: { id: tableId },
    include: {
      orders: {
        include: {
          orderItems: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      },
    },
  }) as Promise<TableWithOrders | null>;
}

export async function getTableById(tableId: number) {
  const table = await getTableWithOrders(tableId);
  return table ? decorateTable(table) : null;
}

export async function getOrders(tableId?: number) {
  return db.order.findMany({
    where: tableId ? { tableId } : undefined,
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
  const tables = await db.diningTable.findMany({
    where: { isActive: true },
    include: {
      orders: {
        include: {
          orderItems: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      },
    },
    orderBy: [{ area: 'asc' }, { number: 'asc' }],
  });

  return tables.map(decorateTable);
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
  return db.$transaction(async transaction => {
    const table = await transaction.diningTable.findUnique({
      where: { id: tableId },
    });

    if (!table || !table.isActive) {
      throw new Error('TABLE_NOT_FOUND');
    }

    if (!table.isOpen) {
      throw new Error('TABLE_CLOSED');
    }

    return transaction.order.create({
      data: {
        status: 'RECEIVED',
        tableSession: table.currentSession,
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
  });
}

export async function closeTableSession(tableId: number) {
  return db.$transaction(async transaction => {
    const table = await transaction.diningTable.findUnique({
      where: { id: tableId },
      include: {
        orders: {
          include: {
            orderItems: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    }) as TableWithOrders | null;

    if (!table || !table.isActive) {
      throw new Error('TABLE_NOT_FOUND');
    }

    if (!table.isOpen) {
      throw new Error('TABLE_ALREADY_CLOSED');
    }

    const sessionOrders = table.orders.filter(order => order.tableSession === table.currentSession);
    const activeOrders = sessionOrders.filter(order => order.status !== 'DELIVERED');

    if (activeOrders.length > 0) {
      throw new Error('TABLE_HAS_ACTIVE_ORDERS');
    }

    const summary = buildSessionSummary(table, sessionOrders);
    const closedAt = new Date();

    await transaction.diningTable.update({
      where: { id: tableId },
      data: {
        isOpen: false,
        openedAt: null,
        lastClosedAt: closedAt,
        lastClosedTotal: summary.total,
        lastClosedOrderCount: summary.orderCount,
        lastClosedItemCount: summary.itemCount,
      },
    });

    return {
      table: await getTableById(tableId),
      summary: {
        ...summary,
        closedAt: closedAt.toISOString(),
      },
    };
  });
}

export async function reopenTableSession(tableId: number) {
  return db.$transaction(async transaction => {
    const table = await transaction.diningTable.findUnique({
      where: { id: tableId },
    });

    if (!table || !table.isActive) {
      throw new Error('TABLE_NOT_FOUND');
    }

    if (!table.isOpen) {
      await transaction.diningTable.update({
        where: { id: tableId },
        data: {
          isOpen: true,
          currentSession: table.currentSession + 1,
          openedAt: new Date(),
        },
      });
    }

    return getTableById(tableId);
  });
}

export async function deleteOrder(orderId: number) {
  return db.$transaction(async transaction => {
    const order = await transaction.order.findUnique({
      where: { id: orderId },
      include: {
        table: true,
        orderItems: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      throw new Error('ORDER_NOT_FOUND');
    }

    await transaction.orderItem.deleteMany({
      where: { orderId },
    });

    await transaction.order.delete({
      where: { id: orderId },
    });

    return order;
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
