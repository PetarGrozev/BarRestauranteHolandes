import type { Product } from '../types';

export type ProductSection = 'DRINKS' | 'FOOD';

const DRINK_KEYWORDS = [
  'agua',
  'cola',
  'coca',
  'cerveza',
  'vino',
  'zumo',
  'jugo',
  'refresco',
  'cafe',
  'café',
  'te',
  'té',
  'beer',
  'water',
  'juice',
  'drink',
  'soda',
];

function normalizeProductText(product: Product) {
  return `${product.name} ${product.description ?? ''}`.toLowerCase();
}

export function getProductSection(product: Product): ProductSection {
  if (product.category === 'DRINK') {
    return 'DRINKS';
  }

  if (product.category === 'FOOD') {
    return 'FOOD';
  }

  const text = normalizeProductText(product);

  if (DRINK_KEYWORDS.some(keyword => text.includes(keyword))) {
    return 'DRINKS';
  }

  if (product.orderTarget === 'STAFF') {
    return 'DRINKS';
  }

  return 'FOOD';
}

export function productMatchesSearch(product: Product, search: string) {
  if (!search) {
    return true;
  }

  return normalizeProductText(product).includes(search.trim().toLowerCase());
}