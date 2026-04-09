import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';

export const db = prisma;

type RequestedOrderItem = {
  productId: number;
  quantity: number;
  note?: string | null;
};

const ORDER_ITEM_NOTE_MAX_LENGTH = 280;

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

async function getTableWithOrdersForRestaurant(restaurantId: number, tableId: number) {
  return db.diningTable.findFirst({
    where: { id: tableId, restaurantId },
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

export async function getTableById(restaurantId: number, tableId: number) {
  const table = await getTableWithOrdersForRestaurant(restaurantId, tableId);
  return table ? decorateTable(table) : null;
}

export async function getOrders(restaurantId: number, tableId?: number) {
  return db.order.findMany({
    where: {
      restaurantId,
      ...(tableId ? { tableId } : {}),
    },
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

export async function getProducts(restaurantId: number) {
  return db.product.findMany({
    where: { restaurantId },
    orderBy: { createdAt: 'desc' },
  });
}

function mergeRequestedOrderItems(items: RequestedOrderItem[]) {
  const itemsByKey = new Map<string, RequestedOrderItem>();

  for (const item of items) {
    const normalizedNote = typeof item.note === 'string' ? item.note.trim().slice(0, ORDER_ITEM_NOTE_MAX_LENGTH) : null;
    const key = `${item.productId}::${normalizedNote ?? ''}`;
    const existing = itemsByKey.get(key);

    if (existing) {
      existing.quantity += item.quantity;
      continue;
    }

    itemsByKey.set(key, {
      productId: item.productId,
      quantity: item.quantity,
      note: normalizedNote,
    });
  }

  return Array.from(itemsByKey.values());
}

export async function getTables(restaurantId: number) {
  const tables = await db.diningTable.findMany({
    where: { isActive: true, restaurantId },
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

export async function configureTables(restaurantId: number, interiorNumbers: number[], terraceNumbers: number[]) {
  const desiredRows = [
    ...interiorNumbers.map(number => ({ restaurantId, number, area: 'INTERIOR' as const })),
    ...terraceNumbers.map(number => ({ restaurantId, number, area: 'TERRACE' as const })),
  ];

  await db.$transaction(async transaction => {
    const existingTables = await transaction.diningTable.findMany({
      where: { restaurantId },
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

  return getTables(restaurantId);
}

export async function createOrder(restaurantId: number, tableId: number, items: RequestedOrderItem[]) {
  const mergedItems = mergeRequestedOrderItems(items);

  return db.$transaction(async transaction => {
    const table = await transaction.diningTable.findFirst({
      where: { id: tableId, restaurantId },
    });

    if (!table || !table.isActive) {
      throw new Error('TABLE_NOT_FOUND');
    }

    if (!table.isOpen) {
      throw new Error('TABLE_CLOSED');
    }

    const requestedProductIds = mergedItems.map(item => item.productId);
    const products = await transaction.product.findMany({
      where: {
        restaurantId,
        id: {
          in: requestedProductIds,
        },
      },
      select: {
        id: true,
        name: true,
        price: true,
        stock: true,
        isEnabled: true,
      },
    });

    if (products.length !== mergedItems.length) {
      throw new Error('PRODUCT_NOT_FOUND');
    }

    const productsById = new Map(products.map(product => [product.id, product]));

    for (const item of mergedItems) {
      const product = productsById.get(item.productId);

      if (!product) {
        throw new Error('PRODUCT_NOT_FOUND');
      }

      if (!product.isEnabled) {
        throw new Error(`PRODUCT_DISABLED:${product.name}`);
      }

      if (product.stock < item.quantity) {
        throw new Error(`OUT_OF_STOCK:${product.name}`);
      }
    }

    for (const item of mergedItems) {
      const updateResult = await transaction.product.updateMany({
        where: {
          id: item.productId,
          restaurantId,
          isEnabled: true,
          stock: {
            gte: item.quantity,
          },
        },
        data: {
          stock: {
            decrement: item.quantity,
          },
        },
      });

      if (updateResult.count !== 1) {
        const currentProduct = await transaction.product.findUnique({
          where: { id: item.productId },
          select: {
            name: true,
            stock: true,
            isEnabled: true,
            restaurantId: true,
          },
        });

        if (!currentProduct || currentProduct.restaurantId !== restaurantId) {
          throw new Error('PRODUCT_NOT_FOUND');
        }

        if (!currentProduct.isEnabled) {
          throw new Error(`PRODUCT_DISABLED:${currentProduct.name}`);
        }

        throw new Error(`OUT_OF_STOCK:${currentProduct.name}`);
      }
    }

    return transaction.order.create({
      data: {
        restaurantId,
        tableId,
        status: 'RECEIVED',
        tableSession: table.currentSession,
        orderItems: {
          create: mergedItems.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            price: productsById.get(item.productId)?.price ?? 0,
            note: item.note ?? null,
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

export async function closeTableSession(restaurantId: number, tableId: number) {
  return db.$transaction(async transaction => {
    const table = await transaction.diningTable.findFirst({
      where: { id: tableId, restaurantId },
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
      table: await getTableById(restaurantId, tableId),
      summary: {
        ...summary,
        closedAt: closedAt.toISOString(),
      },
    };
  });
}

export async function reopenTableSession(restaurantId: number, tableId: number) {
  return db.$transaction(async transaction => {
    const table = await transaction.diningTable.findFirst({
      where: { id: tableId, restaurantId },
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

    return getTableById(restaurantId, tableId);
  });
}

export async function deleteOrder(restaurantId: number, orderId: number) {
  return db.$transaction(async transaction => {
    const order = await transaction.order.findFirst({
      where: { id: orderId, restaurantId },
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

    if (order.status === 'DELIVERED') {
      throw new Error('ORDER_ALREADY_DELIVERED');
    }

    if (order.table && (!order.table.isOpen || order.table.currentSession !== order.tableSession)) {
      throw new Error('ORDER_TABLE_CLOSED');
    }

    for (const item of order.orderItems) {
      await transaction.product.updateMany({
        where: { id: item.productId, restaurantId },
        data: {
          stock: {
            increment: item.quantity,
          },
        },
      });
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

export async function updateOrderStatus(restaurantId: number, orderId: number, status: string) {
  const order = await db.order.findFirst({
    where: { id: orderId, restaurantId },
    select: { id: true },
  });

  if (!order) {
    throw new Error('ORDER_NOT_FOUND');
  }

  return db.order.update({
    where: { id: order.id },
    data: { status: status.toUpperCase() as any },
    include: {
      table: true,
      orderItems: {
        include: { product: true },
      },
    },
  });
}
