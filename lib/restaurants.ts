import { prisma } from './prisma';

export type RestaurantBranding = {
  id?: number;
  name?: string | null;
  slug?: string | null;
  logoUrl?: string | null;
};

export function normalizeRestaurantSlug(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function getRestaurantBySlug(slug: string) {
  if (!slug) {
    return null;
  }

  return prisma.restaurant.findUnique({
    where: { slug },
  });
}

export async function getRestaurantBrandingById(restaurantId: number) {
  if (!Number.isInteger(restaurantId) || restaurantId <= 0) {
    return null;
  }

  return prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
    },
  });
}

export function normalizeRestaurantName(value: unknown) {
  return String(value ?? '').trim();
}

export function normalizeRestaurantLogoUrl(value: unknown) {
  const normalized = String(value ?? '').trim();
  return normalized.length > 0 ? normalized : null;
}

export function normalizeRestaurantAdminEmail(value: unknown) {
  return String(value ?? '').trim().toLowerCase();
}

export function isPlausibleEmail(value: string) {
  return /.+@.+\..+/.test(value);
}