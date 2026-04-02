export type OrderTarget = 'KITCHEN' | 'STAFF' | 'BOTH';
export type OrderStatus = 'RECEIVED' | 'PREPARING' | 'READY' | 'DELIVERED';
export type ProductCategory = 'FOOD' | 'DRINK';
export type TableArea = 'INTERIOR' | 'TERRACE';
export type MenuCourseType = 'STARTER' | 'MAIN' | 'DESSERT' | 'DRINK';

export interface TableCheckoutLine {
  productId: number | null;
  name: string;
  quantity: number;
  total: number;
}

export interface TableCheckoutSummary {
  tableId: number;
  tableNumber: number;
  area: TableArea;
  sessionNumber: number;
  orderCount: number;
  itemCount: number;
  total: number;
  closedAt?: string;
  items: TableCheckoutLine[];
}

export interface Product {
  id: number;
  name: string;
  description?: string | null;
  price: number;
  stock: number;
  isEnabled: boolean;
  imageUrl?: string | null;
  category: ProductCategory;
  orderTarget: OrderTarget;
  createdAt: string;
  updatedAt: string;
}

export interface MenuCourse {
  id: number;
  menuId: number;
  courseType: MenuCourseType;
  label: string;
  sortOrder: number;
  options: Product[];
}

export interface Menu {
  id: number;
  name: string;
  description?: string | null;
  isActive: boolean;
  courses: MenuCourse[];
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  quantity: number;
  price: number;
  note?: string | null;
  product: Product;
}

export interface Order {
  id: number;
  tableId?: number | null;
  tableSession: number;
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
  isOpen: boolean;
  currentSession: number;
  openedAt?: string | null;
  lastClosedAt?: string | null;
  lastClosedTotal?: number | null;
  lastClosedOrderCount?: number | null;
  lastClosedItemCount?: number | null;
  currentTotal?: number;
  currentOrderCount?: number;
  currentItemCount?: number;
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
  cartLineId: string;
  productId: number;
  product: Product;
  quantity: number;
  note?: string | null;
}