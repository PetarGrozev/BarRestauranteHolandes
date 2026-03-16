import { prisma } from './prisma';

export const db = prisma;

export async function getOrders() {
  return db.order.findMany({
    include: {
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

export async function createOrder(data) {
  return db.order.create({
    data: {
      status: 'RECEIVED',
      orderItems: {
        create: data.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price || 0,
        })),
      },
    },
    include: {
      orderItems: true,
    },
  });
}

export async function updateOrderStatus(orderId, status) {
  return db.order.update({
    where: { id: orderId },
    data: { status: status.toUpperCase() },
  });
}
