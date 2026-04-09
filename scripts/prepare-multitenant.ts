import 'dotenv/config';

import { Pool, type PoolClient } from 'pg';

const DEFAULT_RESTAURANT_NAME = process.env.DEFAULT_RESTAURANT_NAME?.trim() || 'Restaurante principal';
const DEFAULT_RESTAURANT_SLUG = (process.env.DEFAULT_RESTAURANT_SLUG?.trim().toLowerCase() || 'default')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '') || 'default';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function ensureConstraint(client: PoolClient, constraintName: string, sql: string) {
  const result = await client.query<{ exists: boolean }>(
    'SELECT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = $1) AS exists',
    [constraintName],
  );

  if (!result.rows[0]?.exists) {
    await client.query(sql);
  }
}

async function main() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS "Restaurant" (
        "id" SERIAL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "slug" TEXT NOT NULL UNIQUE,
        "logoUrl" TEXT,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query('ALTER TABLE "Admin" ADD COLUMN IF NOT EXISTS "restaurantId" INTEGER');
    await client.query('ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "restaurantId" INTEGER');
    await client.query('ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "restaurantId" INTEGER');
    await client.query('ALTER TABLE "DiningTable" ADD COLUMN IF NOT EXISTS "restaurantId" INTEGER');
    await client.query('ALTER TABLE "Menu" ADD COLUMN IF NOT EXISTS "restaurantId" INTEGER');

    await client.query(
      `INSERT INTO "Restaurant" ("name", "slug", "isActive")
       VALUES ($1, $2, true)
       ON CONFLICT ("slug") DO NOTHING`,
      [DEFAULT_RESTAURANT_NAME, DEFAULT_RESTAURANT_SLUG],
    );

    const restaurantResult = await client.query<{ id: number }>('SELECT "id" FROM "Restaurant" WHERE "slug" = $1 LIMIT 1', [DEFAULT_RESTAURANT_SLUG]);
    const restaurantId = restaurantResult.rows[0]?.id;

    if (!restaurantId) {
      throw new Error('No se pudo crear el restaurante por defecto para la migracion multi-tenant.');
    }

    await client.query('UPDATE "Admin" SET "restaurantId" = $1 WHERE "restaurantId" IS NULL', [restaurantId]);
    await client.query('UPDATE "Product" SET "restaurantId" = $1 WHERE "restaurantId" IS NULL', [restaurantId]);
    await client.query('UPDATE "Order" SET "restaurantId" = $1 WHERE "restaurantId" IS NULL', [restaurantId]);
    await client.query('UPDATE "DiningTable" SET "restaurantId" = $1 WHERE "restaurantId" IS NULL', [restaurantId]);
    await client.query('UPDATE "Menu" SET "restaurantId" = $1 WHERE "restaurantId" IS NULL', [restaurantId]);

    await client.query('ALTER TABLE "Admin" DROP CONSTRAINT IF EXISTS "Admin_email_key"');
    await client.query('ALTER TABLE "DiningTable" DROP CONSTRAINT IF EXISTS "DiningTable_number_area_key"');

    await client.query('ALTER TABLE "Admin" ALTER COLUMN "restaurantId" SET NOT NULL');
    await client.query('ALTER TABLE "Product" ALTER COLUMN "restaurantId" SET NOT NULL');
    await client.query('ALTER TABLE "Order" ALTER COLUMN "restaurantId" SET NOT NULL');
    await client.query('ALTER TABLE "DiningTable" ALTER COLUMN "restaurantId" SET NOT NULL');
    await client.query('ALTER TABLE "Menu" ALTER COLUMN "restaurantId" SET NOT NULL');

    await ensureConstraint(
      client,
      'Admin_restaurantId_fkey',
      'ALTER TABLE "Admin" ADD CONSTRAINT "Admin_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await ensureConstraint(
      client,
      'Product_restaurantId_fkey',
      'ALTER TABLE "Product" ADD CONSTRAINT "Product_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await ensureConstraint(
      client,
      'Order_restaurantId_fkey',
      'ALTER TABLE "Order" ADD CONSTRAINT "Order_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await ensureConstraint(
      client,
      'DiningTable_restaurantId_fkey',
      'ALTER TABLE "DiningTable" ADD CONSTRAINT "DiningTable_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await ensureConstraint(
      client,
      'Menu_restaurantId_fkey',
      'ALTER TABLE "Menu" ADD CONSTRAINT "Menu_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await ensureConstraint(
      client,
      'Admin_restaurantId_email_key',
      'ALTER TABLE "Admin" ADD CONSTRAINT "Admin_restaurantId_email_key" UNIQUE ("restaurantId", "email")',
    );
    await ensureConstraint(
      client,
      'DiningTable_restaurantId_number_area_key',
      'ALTER TABLE "DiningTable" ADD CONSTRAINT "DiningTable_restaurantId_number_area_key" UNIQUE ("restaurantId", "number", "area")',
    );

    await client.query('COMMIT');
    console.log(`Multi-tenant preparation completed. Default restaurant: ${DEFAULT_RESTAURANT_SLUG}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});