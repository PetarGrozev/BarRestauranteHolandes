import { PrismaClient } from '@prisma/client';

const databaseUrl = process.env.DATABASE_URL || 'file:./dev.db';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    adapter: {
      type: 'sqlite',
      url: databaseUrl,
    },
    log: ['query', 'error', 'warn', 'info'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}
