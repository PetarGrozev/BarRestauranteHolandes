import 'dotenv/config';

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { hashAdminPassword } from '../lib/auth';

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
  await prisma.menuCourseProduct.deleteMany();
  await prisma.menuCourse.deleteMany();
  await prisma.menu.deleteMany();
  await prisma.product.deleteMany();
  await prisma.admin.deleteMany();
  await prisma.restaurant.deleteMany();

  const restaurants = await Promise.all([
    prisma.restaurant.create({
      data: {
        name: 'Casa Aurora',
        slug: 'casa-aurora',
      },
    }),
    prisma.restaurant.create({
      data: {
        name: 'Terraza Norte',
        slug: 'terraza-norte',
      },
    }),
  ]);

  const [primaryRestaurant, secondaryRestaurant] = restaurants;

  const tables = await Promise.all([
    prisma.diningTable.create({ data: { restaurantId: primaryRestaurant.id, number: 1, area: 'INTERIOR' } }),
    prisma.diningTable.create({ data: { restaurantId: primaryRestaurant.id, number: 2, area: 'INTERIOR' } }),
    prisma.diningTable.create({ data: { restaurantId: primaryRestaurant.id, number: 1, area: 'TERRACE' } }),
    prisma.diningTable.create({ data: { restaurantId: secondaryRestaurant.id, number: 1, area: 'INTERIOR' } }),
  ]);

  // Seed admins
  const admin1 = await prisma.admin.create({
    data: { email: 'admin@example.com', passwordHash: hashAdminPassword('Aurora123'), restaurantId: primaryRestaurant.id },
  });

  await prisma.admin.create({
    data: { email: 'manager@terraza.com', passwordHash: hashAdminPassword('Terraza123'), restaurantId: secondaryRestaurant.id },
  });

  // Seed products
  const products = await Promise.all([
    prisma.product.create({
      data: {
        name: 'Pizza Margherita',
        restaurantId: primaryRestaurant.id,
        description: 'Tomate, mozzarella y albahaca',
        price: 10.99,
        category: 'FOOD',
        orderTarget: 'KITCHEN',
      },
    }),
    prisma.product.create({
      data: {
        name: 'Coca Cola',
        restaurantId: primaryRestaurant.id,
        description: 'Refresco 330ml',
        price: 2.50,
        category: 'DRINK',
        orderTarget: 'STAFF',
      },
    }),
    prisma.product.create({
      data: {
        name: 'Pasta Carbonara',
        restaurantId: primaryRestaurant.id,
        description: 'Pasta con salsa carbonara',
        price: 12.99,
        category: 'FOOD',
        orderTarget: 'KITCHEN',
      },
    }),
    prisma.product.create({
      data: {
        name: 'Cerveza',
        restaurantId: primaryRestaurant.id,
        description: 'Caña de cerveza',
        price: 3.00,
        category: 'DRINK',
        orderTarget: 'STAFF',
      },
    }),
    prisma.product.create({
      data: {
        name: 'Hamburguesa Clásica',
        restaurantId: primaryRestaurant.id,
        description: 'Carne, lechuga, tomate y queso',
        price: 9.50,
        category: 'FOOD',
        orderTarget: 'KITCHEN',
      },
    }),
    prisma.product.create({
      data: {
        name: 'Agua Mineral',
        restaurantId: primaryRestaurant.id,
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
      restaurantId: primaryRestaurant.id,
      tableId: tables[0].id,
      orderItems: {
        create: [
          { productId: products[0].id, quantity: 2, price: products[0].price },
          { productId: products[1].id, quantity: 1, price: products[1].price },
        ],
      },
    },
  });

  await prisma.product.create({
    data: {
      restaurantId: secondaryRestaurant.id,
      name: 'Café Solo',
      description: 'Café espresso',
      price: 1.6,
      category: 'DRINK',
      orderTarget: 'STAFF',
    },
  });

  console.log('Seed completed:', { restaurants: restaurants.map(item => item.slug), admin1, products: products.length, order: order.id });
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });