"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import AppToastStack from '@/components/AppToast';
import ConfirmDialog from '@/components/ConfirmDialog';
import useAppToasts from '@/hooks/useAppToasts';
import useOrders from '@/hooks/useOrders';
import OrderTile from '@/components/OrderTile';
import ProductCard from '@/components/ProductCard';
import { ORDER_ALERT_DELAY_MS } from '@/lib/orderTimers';
import type { Product, CartItem, DiningTable, TableArea, TableCheckoutSummary } from '@/types';
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
  mode?: 'staff' | 'customer';
};

export default function OrderPageClient({ initialTableId, mode = 'staff' }: OrderPageClientProps) {
  const isCustomerMode = mode === 'customer';
  const { orders, loading, createOrder, deleteOrder, refreshOrders } = useOrders({
    tableId: isCustomerMode ? initialTableId : undefined,
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [closingTable, setClosingTable] = useState(false);
  const [reopeningTable, setReopeningTable] = useState(false);
  const [lastCheckoutSummary, setLastCheckoutSummary] = useState<TableCheckoutSummary | null>(null);
  const [orderPendingDeletion, setOrderPendingDeletion] = useState<(typeof orders)[number] | null>(null);
  const [deletingOrder, setDeletingOrder] = useState(false);
  const [expiredOrderAlertQueue, setExpiredOrderAlertQueue] = useState<number[]>([]);
  const [activeSection, setActiveSection] = useState<ProductSection>('DRINKS');
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const { toasts, pushToast, removeToast } = useAppToasts();
  const hasTableContext = initialTableId !== null;
  const notifiedExpiredOrdersRef = useRef<Set<number>>(new Set());

  const loadProducts = async () => {
    const response = await fetch('/api/products');
    if (!response.ok) {
      throw new Error('Failed to load products');
    }

    const data = (await response.json()) as Product[];
    setProducts(data);
  };

  const loadTables = async () => {
    const response = await fetch('/api/tables');
    if (!response.ok) {
      throw new Error('Failed to load tables');
    }

    const data = await response.json();
    const nextTables = (data.tables ?? []) as DiningTable[];
    setTables(nextTables);
  };

  useEffect(() => {
    loadProducts().catch(() => {});

    loadTables().catch(() => {});
  }, []);

  const selectedTable = useMemo(() => {
    return tables.find(table => table.id === initialTableId) ?? null;
  }, [initialTableId, tables]);

  const availableProducts = useMemo(() => {
    return products.filter(product => product.isEnabled && product.stock > 0);
  }, [products]);

  const groupedProducts = useMemo(() => {
    return availableProducts.reduce(
      (acc, product) => {
        acc[getProductSection(product)].push(product);
        return acc;
      },
      { DRINKS: [] as Product[], FOOD: [] as Product[] },
    );
  }, [availableProducts]);

  const visibleProducts = useMemo(() => {
    return groupedProducts[activeSection].filter(product => productMatchesSearch(product, deferredSearch));
  }, [activeSection, deferredSearch, groupedProducts]);

  const selectedTableOrders = useMemo(() => {
    if (!selectedTable) {
      return [];
    }

    return orders.filter(order => order.tableId === selectedTable.id && order.tableSession === selectedTable.currentSession);
  }, [orders, selectedTable]);

  const currentTableTotal = useMemo(() => {
    return selectedTableOrders.reduce(
      (sum, order) => sum + order.orderItems.reduce((orderSum, item) => orderSum + item.price * item.quantity, 0),
      0,
    );
  }, [selectedTableOrders]);

  const currentTableItemCount = useMemo(() => {
    return selectedTableOrders.reduce(
      (sum, order) => sum + order.orderItems.reduce((orderSum, item) => orderSum + item.quantity, 0),
      0,
    );
  }, [selectedTableOrders]);

  const activeExpiredOrderAlert = useMemo(() => {
    const nextOrderId = expiredOrderAlertQueue[0];
    if (!nextOrderId) {
      return null;
    }

    return selectedTableOrders.find(order => order.id === nextOrderId && order.status !== 'DELIVERED') ?? null;
  }, [expiredOrderAlertQueue, selectedTableOrders]);

  useEffect(() => {
    if (!isCustomerMode) {
      return;
    }

    const activeOrderIds = new Set(selectedTableOrders.filter(order => order.status !== 'DELIVERED').map(order => order.id));
    notifiedExpiredOrdersRef.current = new Set(
      Array.from(notifiedExpiredOrdersRef.current).filter(orderId => activeOrderIds.has(orderId)),
    );

    setExpiredOrderAlertQueue(prev => prev.filter(orderId => selectedTableOrders.some(order => order.id === orderId && order.status !== 'DELIVERED')));
  }, [isCustomerMode, selectedTableOrders]);

  useEffect(() => {
    setCart(prev =>
      prev.flatMap(item => {
        const currentProduct = products.find(product => product.id === item.productId);

        if (!currentProduct || !currentProduct.isEnabled || currentProduct.stock <= 0) {
          return [];
        }

        return [{
          ...item,
          product: currentProduct,
          quantity: Math.min(item.quantity, currentProduct.stock),
        }];
      }),
    );
  }, [products]);

  useEffect(() => {
    if (!isCustomerMode) {
      return;
    }

    const now = Date.now();

    for (const order of selectedTableOrders) {
      if (order.status === 'DELIVERED') {
        continue;
      }

      const createdAt = new Date(order.createdAt).getTime();
      const isExpired = now - createdAt >= ORDER_ALERT_DELAY_MS;

      if (isExpired && !notifiedExpiredOrdersRef.current.has(order.id)) {
        notifiedExpiredOrdersRef.current.add(order.id);
        setExpiredOrderAlertQueue(prev => [...prev, order.id]);
      }
    }
  }, [isCustomerMode, selectedTableOrders]);

  const handleDismissExpiredOrderAlert = () => {
    setExpiredOrderAlertQueue(prev => prev.slice(1));
  };

  const addToCart = (product: Product) => {
    if (!initialTableId || !selectedTable?.isOpen) {
      return;
    }

    const currentProduct = products.find(item => item.id === product.id);

    if (!currentProduct || !currentProduct.isEnabled || currentProduct.stock <= 0) {
      pushToast({ message: `${product.name} no está disponible ahora mismo.`, title: 'Producto', variant: 'error' });
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        if (existing.quantity >= currentProduct.stock) {
          pushToast({ message: `No queda más stock de ${product.name}.`, title: 'Stock', variant: 'error' });
          return prev;
        }

        return prev.map(item =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }

      return [...prev, { productId: product.id, product: currentProduct, quantity: 1 }];
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
    if (cart.length === 0 || !initialTableId || !selectedTable?.isOpen) return;
    setSubmitting(true);
    try {
      await createOrder(
        initialTableId,
        cart.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      );
      setCart([]);
      setLastCheckoutSummary(null);
      await Promise.all([refreshOrders(), loadTables(), loadProducts()]);
      pushToast({ message: 'Pedido enviado correctamente a la mesa.', title: 'Pedido', variant: 'success' });
    } catch (error) {
      await loadProducts().catch(() => {});
      const message = error instanceof Error ? error.message : 'No se pudo crear el pedido.';
      pushToast({ message, title: 'Pedido', variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseTable = async () => {
    if (!selectedTable) {
      return;
    }

    setClosingTable(true);

    try {
      const response = await fetch(`/api/tables/${selectedTable.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'close' }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        if (payload?.error) {
          pushToast({ message: payload.error, title: 'Mesa', variant: 'error' });
          return;
        }
        throw new Error('Failed to close table');
      }

      const data = await response.json();
      if (data.table) {
        setTables(prev => prev.map(table => (table.id === data.table.id ? data.table : table)));
      }
      setLastCheckoutSummary((data.summary ?? null) as TableCheckoutSummary | null);
      setCart([]);
      await Promise.all([refreshOrders(), loadTables()]);
      pushToast({ message: 'Mesa cerrada correctamente con el total actualizado.', title: 'Mesa', variant: 'success' });
    } catch {
      pushToast({ message: 'No se pudo cerrar la mesa.', title: 'Mesa', variant: 'error' });
    } finally {
      setClosingTable(false);
    }
  };

  const handleConfirmDeleteOrder = async () => {
    if (!orderPendingDeletion) {
      return;
    }

    setDeletingOrder(true);

    try {
      await deleteOrder(orderPendingDeletion.id);
      setOrderPendingDeletion(null);
      await Promise.all([refreshOrders(), loadTables()]);
      pushToast({ message: 'Pedido eliminado correctamente.', title: 'Pedido', variant: 'success' });
    } catch {
      pushToast({ message: 'No se pudo eliminar el pedido.', title: 'Pedido', variant: 'error' });
    } finally {
      setDeletingOrder(false);
    }
  };

  const handleReopenTable = async () => {
    if (!selectedTable) {
      return;
    }

    setReopeningTable(true);

    try {
      const response = await fetch(`/api/tables/${selectedTable.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reopen' }),
      });

      if (!response.ok) {
        throw new Error('Failed to reopen table');
      }

      const data = await response.json();
      if (data.table) {
        setTables(prev => prev.map(table => (table.id === data.table.id ? data.table : table)));
      }
      setLastCheckoutSummary(null);
      await loadTables();
      pushToast({ message: 'Mesa abierta para nuevos clientes.', title: 'Mesa', variant: 'success' });
    } catch {
      pushToast({ message: 'No se pudo abrir la mesa.', title: 'Mesa', variant: 'error' });
    } finally {
      setReopeningTable(false);
    }
  };

  return (
    <div className="order-page">
      {hasTableContext && (
        <div className="order-page-header">
          <div>
            {selectedTable ? (
              <div className={`order-cart-pill${selectedTable.isOpen ? '' : ' order-cart-pill--muted'}`}>
                Mesa {selectedTable.number} · {TABLE_AREA_LABELS[selectedTable.area]} · {selectedTable.isOpen ? 'Abierta' : 'Cerrada'}
              </div>
            ) : (
              <div className="order-cart-pill order-cart-pill--muted">Cargando mesa...</div>
            )}
          </div>
          {!isCustomerMode && <Link className="btn-secondary" href="/tables">Cambiar Mesa</Link>}
        </div>
      )}

      {hasTableContext && selectedTable && !isCustomerMode && (
        <section className="table-session-card">
          <div className="table-session-header">
            <div>
              <h2>Cuenta de la mesa</h2>
              <p className="table-session-subtitle">
                {selectedTable.isOpen
                  ? 'Controla la comanda activa y ciérrala cuando se marchen los clientes.'
                  : 'La mesa está cerrada. Puedes reabrirla para un nuevo grupo de clientes.'}
              </p>
            </div>
            {selectedTable.isOpen ? (
              <button className="btn-primary" type="button" onClick={handleCloseTable} disabled={closingTable}>
                {closingTable ? 'Cerrando mesa...' : 'Cerrar mesa y sacar total'}
              </button>
            ) : (
              <button className="btn-secondary" type="button" onClick={handleReopenTable} disabled={reopeningTable}>
                {reopeningTable ? 'Abriendo mesa...' : 'Abrir mesa para nuevos clientes'}
              </button>
            )}
          </div>

          <div className="table-session-metrics">
            <div className="table-session-metric">
              <strong>{selectedTableOrders.length}</strong>
              <span>Pedidos de esta mesa</span>
            </div>
            <div className="table-session-metric">
              <strong>{currentTableItemCount}</strong>
              <span>Artículos servidos</span>
            </div>
            <div className="table-session-metric">
              <strong>{currentTableTotal.toFixed(2)} €</strong>
              <span>Total acumulado</span>
            </div>
          </div>

          {selectedTable.lastClosedAt && !selectedTable.isOpen && (
            <p className="table-session-last-close">
              Último cierre: {Number(selectedTable.lastClosedTotal ?? 0).toFixed(2)} € · {selectedTable.lastClosedOrderCount ?? 0} pedidos · {new Date(selectedTable.lastClosedAt).toLocaleString('es-ES')}
            </p>
          )}
        </section>
      )}

      {hasTableContext && lastCheckoutSummary && !isCustomerMode && (
        <section className="table-checkout-card">
          <div className="table-session-header">
            <div>
              <h2>Resumen de cierre</h2>
              <p className="table-session-subtitle">
                Comanda final de la mesa {lastCheckoutSummary.tableNumber} con el importe total listo para cobrar.
              </p>
            </div>
          </div>

          <div className="table-session-metrics">
            <div className="table-session-metric">
              <strong>{lastCheckoutSummary.orderCount}</strong>
              <span>Pedidos cerrados</span>
            </div>
            <div className="table-session-metric">
              <strong>{lastCheckoutSummary.itemCount}</strong>
              <span>Artículos totales</span>
            </div>
            <div className="table-session-metric">
              <strong>{lastCheckoutSummary.total.toFixed(2)} €</strong>
              <span>Total a cobrar</span>
            </div>
          </div>

          <ul className="table-checkout-list">
            {lastCheckoutSummary.items.map(item => (
              <li key={`${item.productId ?? item.name}`}>
                <span>{item.name} x {item.quantity}</span>
                <strong>{item.total.toFixed(2)} €</strong>
              </li>
            ))}
          </ul>
        </section>
      )}

      {orderPendingDeletion && !isCustomerMode && (
        <ConfirmDialog
          open={Boolean(orderPendingDeletion)}
          title="Eliminar pedido"
          message={`¿Seguro que quieres borrar el pedido #${orderPendingDeletion.id}? Esta acción quitará el pedido de la comanda actual de la mesa.`}
          confirmLabel={deletingOrder ? 'Eliminando...' : 'Sí, borrar pedido'}
          cancelLabel="Cancelar"
          confirmVariant="danger"
          busy={deletingOrder}
          onConfirm={handleConfirmDeleteOrder}
          onCancel={() => setOrderPendingDeletion(null)}
        >
          <div className="confirm-dialog-summary">
            <strong>{orderPendingDeletion.orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)} €</strong>
            <span>{orderPendingDeletion.orderItems.length} líneas en el pedido</span>
          </div>
        </ConfirmDialog>
      )}

      {activeExpiredOrderAlert && isCustomerMode && (
        <ConfirmDialog
          open={Boolean(activeExpiredOrderAlert)}
          title="Pedido sin entregar"
          message={`El pedido #${activeExpiredOrderAlert.id} ya ha superado los 10 minutos y sigue sin entregarse.`}
          confirmLabel="Entendido"
          cancelLabel="Cerrar"
          confirmVariant="danger"
          onConfirm={handleDismissExpiredOrderAlert}
          onCancel={handleDismissExpiredOrderAlert}
        >
          <div className="confirm-dialog-summary">
            <strong>{activeExpiredOrderAlert.status === 'PREPARING' ? 'Sigue en preparación' : activeExpiredOrderAlert.status === 'READY' ? 'Está listo pero no entregado' : 'Sigue pendiente'}</strong>
            <span>La alerta solo desaparece cuando la cierres o cuando el pedido pase a entregado.</span>
          </div>
        </ConfirmDialog>
      )}

      <AppToastStack toasts={toasts} onClose={removeToast} />

      {hasTableContext && (
        <section className="order-products">
          <div className="order-browser-card">
            {isCustomerMode && selectedTable && (
              <div className="customer-order-intro">
                <h1>Haz tu pedido</h1>
                <p>
                  Estás pidiendo para la mesa {selectedTable.number} de {TABLE_AREA_LABELS[selectedTable.area].toLowerCase()}.
                </p>
                {!selectedTable.isOpen && (
                  <button className="btn-secondary" type="button" onClick={handleReopenTable} disabled={reopeningTable}>
                    {reopeningTable ? 'Preparando mesa...' : 'Empezar pedido en esta mesa'}
                  </button>
                )}
              </div>
            )}
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
                <ProductCard key={product.id} product={product} onOrder={addToCart} mode="order" disabled={!selectedTable?.isOpen} />
              ))}
            </div>

            {selectedTable && !selectedTable.isOpen && (
              <p className="order-prompt">{isCustomerMode ? 'La mesa está cerrada. Pulsa el botón superior para empezar a pedir.' : 'La mesa está cerrada. Reábrela para empezar una nueva comanda.'}</p>
            )}

            {visibleProducts.length === 0 && (
              <p className="empty-state order-empty-state">{SECTION_COPY[activeSection].empty}</p>
            )}
          </div>
        </section>
      )}

      {hasTableContext && cart.length > 0 && (
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
            <button className="btn-primary" onClick={handleSubmit} disabled={submitting || !initialTableId || !selectedTable?.isOpen}>
              {submitting ? 'Enviando...' : 'Confirmar Pedido'}
            </button>
          </div>
        </section>
      )}

      <section className="order-history">
        <h2>{selectedTable ? (isCustomerMode ? 'Pedidos enviados desde esta mesa' : 'Comanda activa de la mesa') : 'Últimos pedidos del local'}</h2>
        {loading ? (
          <p>Cargando...</p>
        ) : (selectedTable ? selectedTableOrders : orders).length === 0 ? (
          <p className="empty-state">{selectedTable ? 'Esta mesa todavía no tiene pedidos en la sesión actual' : 'No hay pedidos aún'}</p>
        ) : (
          <div className="orders-grid">
            {(selectedTable ? selectedTableOrders : orders).slice(0, 10).map(order => (
              <OrderTile
                key={order.id}
                order={order}
                onDeleteRequest={selectedTable && !isCustomerMode ? setOrderPendingDeletion : undefined}
                showDeliveryTimer={Boolean(selectedTable) && isCustomerMode}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}