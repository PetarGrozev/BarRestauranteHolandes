"use client";

import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import useOrders from '@/hooks/useOrders';
import OrderTile from '@/components/OrderTile';
import ProductCard from '@/components/ProductCard';
import type { Product, CartItem, DiningTable, TableArea } from '@/types';
import { getProductSection, productMatchesSearch, type ProductSection } from '@/lib/productCategories';

const TABLE_AREA_LABELS: Record<TableArea, string> = {
  INTERIOR: 'Interior',
  TERRACE: 'Terraza',
};

const SECTION_COPY: Record<ProductSection, { title: string; placeholder: string; empty: string }> = {
  DRINKS: {
    title: 'Bebidas',
    placeholder: 'Buscar bebida, por ejemplo agua',
    empty: 'No hay bebidas que coincidan',
  },
  FOOD: {
    title: 'Comida',
    placeholder: 'Buscar comida',
    empty: 'No hay platos que coincidan',
  },
};

type OrderPageClientProps = {
  initialTableId: number | null;
};

export default function OrderPageClient({ initialTableId }: OrderPageClientProps) {
  const { orders, loading, createOrder } = useOrders();
  const [products, setProducts] = useState<Product[]>([]);
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [activeSection, setActiveSection] = useState<ProductSection>('DRINKS');
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    fetch('/api/products')
      .then(r => r.json())
      .then(setProducts)
      .catch(() => {});

    fetch('/api/tables')
      .then(r => r.json())
      .then(data => {
        const nextTables = (data.tables ?? []) as DiningTable[];
        setTables(nextTables);
      })
      .catch(() => {});
  }, []);

  const selectedTable = useMemo(() => {
    return tables.find(table => table.id === initialTableId) ?? null;
  }, [initialTableId, tables]);

  const groupedProducts = useMemo(() => {
    return products.reduce(
      (acc, product) => {
        acc[getProductSection(product)].push(product);
        return acc;
      },
      { DRINKS: [] as Product[], FOOD: [] as Product[] },
    );
  }, [products]);

  const visibleProducts = useMemo(() => {
    return groupedProducts[activeSection].filter(product => productMatchesSearch(product, deferredSearch));
  }, [activeSection, deferredSearch, groupedProducts]);

  const addToCart = (product: Product) => {
    if (!initialTableId) {
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        return prev.map(item =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [...prev, { productId: product.id, product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: number) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  const updateQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      return removeFromCart(productId);
    }

    setCart(prev =>
      prev.map(item =>
        item.productId === productId ? { ...item, quantity } : item,
      ),
    );
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  const handleSubmit = async () => {
    if (cart.length === 0 || !initialTableId) return;
    setSubmitting(true);
    try {
      await createOrder(
        initialTableId,
        cart.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.product.price,
        })),
      );
      setCart([]);
    } catch {
      alert('Error al crear el pedido');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="order-page">
      <div className="order-page-header">
        <div>
          {selectedTable ? (
            <div className="order-cart-pill">Mesa {selectedTable.number} · {TABLE_AREA_LABELS[selectedTable.area]}</div>
          ) : (
            <div className="order-cart-pill order-cart-pill--muted">Mesa no seleccionada</div>
          )}
        </div>
        <Link className="btn-secondary" href="/tables">Cambiar Mesa</Link>
      </div>

      {!initialTableId && (
        <section className="table-selector-card">
          <div className="order-section-header">
            <h2>Selecciona una mesa antes de pedir</h2>
            <span className="order-section-count">Paso 1 de 2</span>
          </div>
          <p className="order-prompt">Esta pantalla ahora solo sirve para hacer pedidos. Primero elige una mesa y luego entrarás aquí automáticamente.</p>
          <Link className="btn-primary" href="/tables">Ir a Selección de Mesa</Link>
        </section>
      )}

      <section className="order-products">
        <div className="order-browser-card">
          <div className="order-browser-toolbar">
            <div className="order-section-tabs" role="tablist" aria-label="Secciones del menú">
              <button
                className={`order-section-tab${activeSection === 'DRINKS' ? ' is-active' : ''}`}
                type="button"
                onClick={() => setActiveSection('DRINKS')}
              >
                Bebidas
              </button>
              <button
                className={`order-section-tab${activeSection === 'FOOD' ? ' is-active' : ''}`}
                type="button"
                onClick={() => setActiveSection('FOOD')}
              >
                Comida
              </button>
            </div>

            <label className="order-search-field">
              <span className="order-search-label">Buscar</span>
              <input
                type="text"
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder={SECTION_COPY[activeSection].placeholder}
              />
            </label>
          </div>

          <div className="order-section-header">
            <h2>{SECTION_COPY[activeSection].title}</h2>
            <span className="order-section-count">{visibleProducts.length} productos</span>
          </div>

          <div className="product-grid product-grid--order">
            {visibleProducts.map(product => (
              <ProductCard key={product.id} product={product} onOrder={addToCart} mode="order" disabled={!initialTableId} />
            ))}
          </div>

          {!initialTableId && (
            <p className="order-prompt">Selecciona una mesa para empezar a añadir productos.</p>
          )}

          {initialTableId && visibleProducts.length === 0 && (
            <p className="empty-state order-empty-state">{SECTION_COPY[activeSection].empty}</p>
          )}
        </div>
      </section>

      {cart.length > 0 && (
        <section className="order-cart">
          <div className="order-cart-header">
            <h2>Tu Pedido</h2>
            <strong>Total: &euro;{cartTotal.toFixed(2)}</strong>
          </div>
          <ul className="cart-list">
            {cart.map(item => (
              <li key={item.productId} className="cart-item">
                <span>{item.product.name}</span>
                <div className="cart-item-controls">
                  <button onClick={() => updateQuantity(item.productId, item.quantity - 1)}>-</button>
                  <span>{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.productId, item.quantity + 1)}>+</button>
                </div>
                <span>&euro;{(item.product.price * item.quantity).toFixed(2)}</span>
                <button className="btn-ghost" onClick={() => removeFromCart(item.productId)}>✕</button>
              </li>
            ))}
          </ul>
          <div className="cart-total">
            <button className="btn-primary" onClick={handleSubmit} disabled={submitting || !initialTableId}>
              {submitting ? 'Enviando...' : 'Confirmar Pedido'}
            </button>
          </div>
        </section>
      )}

      <section className="order-history">
        <h2>Pedidos Recientes</h2>
        {loading ? (
          <p>Cargando...</p>
        ) : orders.length === 0 ? (
          <p className="empty-state">No hay pedidos aún</p>
        ) : (
          <div className="orders-grid">
            {orders.slice(0, 10).map(order => (
              <OrderTile key={order.id} order={order} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}