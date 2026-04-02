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

/* ───────────────────────────────────────────────
   Customer menu categories (finer-grained)
   ─────────────────────────────────────────────── */

export type MenuCategory =
  | 'HAMBURGUESAS'
  | 'SANDWICHES'
  | 'PASTAS'
  | 'BEBIDAS'
  | 'VINOS'
  | 'OTROS';

export const MENU_CATEGORIES: MenuCategory[] = [
  'HAMBURGUESAS',
  'SANDWICHES',
  'PASTAS',
  'BEBIDAS',
  'VINOS',
  'OTROS',
];

export const MENU_CATEGORY_META: Record<MenuCategory, { label: string; icon: string; tagline: string }> = {
  HAMBURGUESAS: { label: 'Hamburguesas', icon: '🍔', tagline: 'Artesanales y jugosas' },
  SANDWICHES:   { label: 'Sándwiches',   icon: '🥪', tagline: 'Crujientes y sabrosos' },
  PASTAS:       { label: 'Pastas',        icon: '🍝', tagline: 'Frescas del día' },
  BEBIDAS:      { label: 'Bebidas',       icon: '🥤', tagline: 'Refrescos y cervezas' },
  VINOS:        { label: 'Vinos',         icon: '🍷', tagline: 'Selección de bodega' },
  OTROS:        { label: 'Especialidades', icon: '🍽️', tagline: 'Más delicias' },
};

const MENU_KEYWORDS: Record<Exclude<MenuCategory, 'OTROS'>, string[]> = {
  HAMBURGUESAS: ['hamburguesa', 'burger', 'smash', 'doble queso', 'triple'],
  SANDWICHES:   ['sandwich', 'sándwich', 'bocadillo', 'bocata', 'tostada', 'wrap', 'club sandwich'],
  PASTAS:       ['pasta', 'spaghetti', 'espagueti', 'carbonara', 'bolognesa', 'boloñesa', 'penne', 'tagliatelle', 'lasagna', 'lasaña', 'ravioli', 'fettuccine', 'macarrones', 'gnocchi', 'ñoqui'],
  VINOS:        ['vino', 'wine', 'rioja', 'ribera', 'tempranillo', 'verdejo', 'albariño', 'cava', 'champagne', 'prosecco', 'tinto de', 'blanco de', 'rosado'],
  BEBIDAS:      ['agua', 'cola', 'coca', 'cerveza', 'zumo', 'jugo', 'refresco', 'cafe', 'café', 'te ', 'té ', 'beer', 'water', 'fanta', 'sprite', 'limonada', 'naranjada', 'batido', 'caña', 'copa'],
};

const MENU_KEYWORD_ORDER: (Exclude<MenuCategory, 'OTROS'>)[] = [
  'HAMBURGUESAS', 'SANDWICHES', 'PASTAS', 'VINOS', 'BEBIDAS',
];

export function getMenuCategory(product: Product): MenuCategory {
  const text = normalizeProductText(product);

  for (const cat of MENU_KEYWORD_ORDER) {
    if (MENU_KEYWORDS[cat].some(kw => text.includes(kw))) {
      return cat;
    }
  }

  if (product.category === 'DRINK') return 'BEBIDAS';

  return 'OTROS';
}

export function groupProductsByMenuCategory(products: Product[]): Record<MenuCategory, Product[]> {
  const groups: Record<MenuCategory, Product[]> = {
    HAMBURGUESAS: [],
    SANDWICHES: [],
    PASTAS: [],
    BEBIDAS: [],
    VINOS: [],
    OTROS: [],
  };

  for (const product of products) {
    groups[getMenuCategory(product)].push(product);
  }

  return groups;
}