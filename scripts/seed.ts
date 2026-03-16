import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // Seed admins
    const admin1 = await prisma.admin.create({
        data: {
            email: 'admin1@example.com',
            name: 'Admin One',
        },
    });

    const admin2 = await prisma.admin.create({
        data: {
            email: 'admin2@example.com',
            name: 'Admin Two',
        },
    });

    // Seed products
    const product1 = await prisma.product.create({
        data: {
            name: 'Pizza Margherita',
            price: 10.99,
            category: 'food',
            orderDestination: 'kitchen',
        },
    });

    const product2 = await prisma.product.create({
        data: {
            name: 'Coca Cola',
            price: 2.50,
            category: 'drinks',
            orderDestination: 'staff',
        },
    });

    const product3 = await prisma.product.create({
        data: {
            name: 'Pasta Carbonara',
            price: 12.99,
            category: 'food',
            orderDestination: 'kitchen',
        },
    });

    console.log({ admin1, admin2, product1, product2, product3 });
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });