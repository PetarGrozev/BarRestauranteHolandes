import 'dotenv/config';

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

console.log('Using database URL:', process.env.DATABASE_URL ? 'configured' : 'missing');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Clean up
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.diningTable.deleteMany();
  await prisma.product.deleteMany();
  await prisma.admin.deleteMany();

  const tables = await Promise.all([
    prisma.diningTable.create({ data: { number: 1, area: 'INTERIOR' } }),
    prisma.diningTable.create({ data: { number: 2, area: 'INTERIOR' } }),
    prisma.diningTable.create({ data: { number: 1, area: 'TERRACE' } }),
  ]);

  // Seed admins
  const admin1 = await prisma.admin.create({
    data: { email: 'admin@example.com' },
  });

  // Seed products
  const products = await Promise.all([
    prisma.product.create({
      data: {
        name: 'Pizza Margherita',
        description: 'Tomate, mozzarella y albahaca',
        price: 10.99,
        category: 'FOOD',
        orderTarget: 'KITCHEN',
      },
    }),
    prisma.product.create({
      data: {
        name: 'Coca Cola',
        description: 'Refresco 330ml',
        price: 2.50,
        category: 'DRINK',
        orderTarget: 'STAFF',
      },
    }),
    prisma.product.create({
      data: {
        name: 'Pasta Carbonara',
        description: 'Pasta con salsa carbonara',
        price: 12.99,
        category: 'FOOD',
        orderTarget: 'KITCHEN',
      },
    }),
    prisma.product.create({
      data: {
        name: 'Cerveza',
        description: 'Caña de cerveza',
        price: 3.00,
        category: 'DRINK',
        orderTarget: 'STAFF',
      },
    }),
    prisma.product.create({
      data: {
        name: 'Hamburguesa Clásica',
        description: 'Carne, lechuga, tomate y queso',
        price: 9.50,
        category: 'FOOD',
        orderTarget: 'KITCHEN',
      },
    }),
    prisma.product.create({
      data: {
        name: 'Agua Mineral',
        description: 'Botella 500ml',
        price: 1.50,
        category: 'DRINK',
        orderTarget: 'BOTH',
      },
    }),
  ]);

  // Seed a sample order
  const order = await prisma.order.create({
    data: {
      status: 'RECEIVED',
      tableId: tables[0].id,
      orderItems: {
        create: [
          { productId: products[0].id, quantity: 2, price: products[0].price },
          { productId: products[1].id, quantity: 1, price: products[1].price },
        ],
      },
    },
  });

  console.log('Seed completed:', { admin1, products: products.length, order: order.id });
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });