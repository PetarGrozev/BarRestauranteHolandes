export type OrderTarget = 'KITCHEN' | 'STAFF' | 'BOTH';
export type OrderStatus = 'RECEIVED' | 'PREPARING' | 'READY' | 'DELIVERED';
export type ProductCategory = 'FOOD' | 'DRINK';
export type TableArea = 'INTERIOR' | 'TERRACE';

export interface Product {
  id: number;
  name: string;
  description?: string | null;
  price: number;
  imageUrl?: string | null;
  category: ProductCategory;
  orderTarget: OrderTarget;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  quantity: number;
  price: number;
  product: Product;
}

export interface Order {
  id: number;
  tableId?: number | null;
  table?: DiningTable | null;
  orderItems: OrderItem[];
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

export interface DiningTable {
  id: number;
  number: number;
  area: TableArea;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Admin {
  id: number;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  productId: number;
  product: Product;
  quantity: number;
}