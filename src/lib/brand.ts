import type { RestaurantBranding } from '../../lib/restaurants';

export const defaultRestaurantBrand = {
  name: 'Jouw Restaurant',
  logoSrc: '',
  logoAlt: 'Logo van het restaurant',
};

export const internalAppLabel = 'Intern portaal';

type BrandInput = RestaurantBranding | { name?: string | null; logoSrc?: string | null; logoAlt?: string | null } | null | undefined;

function resolveBrandName(brand?: BrandInput) {
  const value = brand?.name;
  return String(value ?? '').trim() || defaultRestaurantBrand.name;
}

function hasStaticLogoSource(brand?: BrandInput): brand is { name?: string | null; logoSrc?: string | null; logoAlt?: string | null } {
  return typeof brand === 'object' && brand !== null && 'logoSrc' in brand;
}

export function getBrandName(brand?: BrandInput) {
  return resolveBrandName(brand) || 'Bar/Restaurant-app';
}

export function getBrandInitials(brand?: BrandInput) {
  const parts = getBrandName(brand)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return 'BR';
  }

  return parts.map(part => part.charAt(0).toUpperCase()).join('');
}

export function getBrandLogoSrc(brand?: BrandInput) {
  const value = hasStaticLogoSource(brand)
    ? brand?.logoSrc
    : brand?.logoUrl;

  return String(value ?? '').trim();
}