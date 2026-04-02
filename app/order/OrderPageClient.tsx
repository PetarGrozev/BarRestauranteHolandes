"use client";

import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AppToastStack from '@/components/AppToast';
import ConfirmDialog from '@/components/ConfirmDialog';
import useAppToasts from '@/hooks/useAppToasts';
import useOrders from '@/hooks/useOrders';
import OrderTile from '@/components/OrderTile';
import ProductCard from '@/components/ProductCard';
import { MENU_COURSE_LABELS } from '@/lib/menuCourses';
import { ORDER_ALERT_DELAY_MS } from '@/lib/orderTimers';
import type { Product, CartItem, DiningTable, TableArea, TableCheckoutSummary, Menu } from '@/types';
import { getMenuCategory, getProductSection, productMatchesSearch, groupProductsByMenuCategory, MENU_CATEGORIES, MENU_CATEGORY_META, type ProductSection } from '@/lib/productCategories';

const ORDER_ITEM_NOTE_MAX_LENGTH = 280;

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
  const [menus, setMenus] = useState<Menu[]>([]);
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [tablesLoaded, setTablesLoaded] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [closingTable, setClosingTable] = useState(false);
  const [reopeningTable, setReopeningTable] = useState(false);
  const [lastCheckoutSummary, setLastCheckoutSummary] = useState<TableCheckoutSummary | null>(null);
  const [orderPendingDeletion, setOrderPendingDeletion] = useState<(typeof orders)[number] | null>(null);
  const [deletingOrder, setDeletingOrder] = useState(false);
  const [activeSection, setActiveSection] = useState<ProductSection>('DRINKS');
  const [search, setSearch] = useState('');
  const [activeCartNoteId, setActiveCartNoteId] = useState<string | null>(null);
  const [cartNoteDraft, setCartNoteDraft] = useState('');
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);
  const [previewMenu, setPreviewMenu] = useState<Menu | null>(null);
  const [menuSelections, setMenuSelections] = useState<Record<number, number>>({});
  const deferredSearch = useDeferredValue(search);
  const { toasts, pushToast, removeToast } = useAppToasts();
  const hasTableContext = initialTableId !== null;

  const loadProducts = async () => {
    const response = await fetch('/api/products');
    if (!response.ok) {
      throw new Error('Failed to load products');
    }

    const data = (await response.json()) as Product[];
    setProducts(data);
  };

  const loadMenus = async () => {
    const response = await fetch('/api/menus');
    if (!response.ok) {
      throw new Error('Failed to load menus');
    }

    const data = (await response.json()) as Menu[];
    setMenus(data);
  };

  const loadTables = async () => {
    const response = await fetch('/api/tables');
    if (!response.ok) {
      throw new Error('Failed to load tables');
    }

    const data = await response.json();
    const nextTables = (data.tables ?? []) as DiningTable[];
    setTables(nextTables);
    setTablesLoaded(true);
  };

  useEffect(() => {
    loadProducts().catch(() => {});
    loadMenus().catch(() => {});

    loadTables().catch(() => {});
  }, []);

  const selectedTable = useMemo(() => {
    return tables.find(table => table.id === initialTableId) ?? null;
  }, [initialTableId, tables]);

  const missingSelectedTable = hasTableContext && tablesLoaded && !selectedTable;

  const availableProducts = useMemo(() => {
    return products.filter(product => product.isEnabled && product.stock > 0);
  }, [products]);

  const availableProductsById = useMemo(() => {
    return new Map(availableProducts.map(product => [product.id, product]));
  }, [availableProducts]);

  const availableMenus = useMemo(() => {
    return menus
      .filter(menu => menu.isActive)
      .map(menu => ({
        ...menu,
        courses: menu.courses
          .map(course => ({
            ...course,
            options: course.options.filter(option => availableProductsById.has(option.id)),
          }))
          .filter(course => course.options.length > 0),
      }))
      .filter(menu => menu.courses.length > 0);
  }, [availableProductsById, menus]);

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

  const menuGrouped = useMemo(() => {
    if (!isCustomerMode) return null;
    return groupProductsByMenuCategory(availableProducts);
  }, [isCustomerMode, availableProducts]);

  const activeMenuCategories = useMemo(() => {
    if (!menuGrouped) return [];
    return MENU_CATEGORIES.filter(cat => menuGrouped[cat].length > 0);
  }, [menuGrouped]);

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

  const cartItemCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

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

  const buildCartLineId = (productId: number) => {
    return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${productId}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  };

  const addToCart = (product: Product, note: string | null = null) => {
    if (!initialTableId || !selectedTable?.isOpen) {
      return;
    }

    const currentProduct = products.find(item => item.id === product.id);

    if (!currentProduct || !currentProduct.isEnabled || currentProduct.stock <= 0) {
      pushToast({ message: `${product.name} no está disponible ahora mismo.`, title: 'Producto', variant: 'error' });
      return;
    }

    setCart(prev => [...prev, { cartLineId: buildCartLineId(product.id), productId: product.id, product: currentProduct, quantity: 1, note }]);
  };

  const removeFromCart = (cartLineId: string) => {
    setCart(prev => prev.filter(item => item.cartLineId !== cartLineId));
    setActiveCartNoteId(currentId => (currentId === cartLineId ? null : currentId));
  };

  const updateQuantity = (cartLineId: string, quantity: number) => {
    if (quantity <= 0) {
      return removeFromCart(cartLineId);
    }

    setCart(prev =>
      prev.map(item =>
        item.cartLineId === cartLineId ? { ...item, quantity } : item,
      ),
    );
  };

  const openCartNoteEditor = (cartLineId: string) => {
    const cartItem = cart.find(item => item.cartLineId === cartLineId);
    setActiveCartNoteId(cartLineId);
    setCartNoteDraft(cartItem?.note ?? '');
  };

  const closeCartNoteEditor = () => {
    setActiveCartNoteId(null);
    setCartNoteDraft('');
  };

  const saveCartItemNote = () => {
    if (!activeCartNoteId) {
      return;
    }

    const trimmedNote = cartNoteDraft.trim();
    const note = trimmedNote.length > 0 ? trimmedNote.slice(0, ORDER_ITEM_NOTE_MAX_LENGTH) : null;

    setCart(prev => prev.map(item => (item.cartLineId === activeCartNoteId ? { ...item, note } : item)));
    closeCartNoteEditor();
  };

  const handleAddPreviewProduct = () => {
    if (!previewProduct) {
      return;
    }

    addToCart(previewProduct);
    setPreviewProduct(null);
  };

  const openMenuPreview = (menu: Menu) => {
    const nextSelections = menu.courses.reduce<Record<number, number>>((acc, course) => {
      if (course.options[0]) {
        acc[course.id] = course.options[0].id;
      }
      return acc;
    }, {});

    const hasAllSelections = menu.courses.every(course => nextSelections[course.id]);
    if (!hasAllSelections) {
      pushToast({ title: 'Menu', message: 'Ahora mismo no hay opciones disponibles para completar este menu.', variant: 'error' });
      return;
    }

    setPreviewProduct(null);
    setMenuSelections(nextSelections);
    setPreviewMenu(menu);
  };

  const handleMenuSelection = (courseId: number, productId: number) => {
    setMenuSelections(prev => ({ ...prev, [courseId]: productId }));
  };

  const handleAddPreviewMenu = () => {
    if (!previewMenu || !initialTableId || !selectedTable?.isOpen) {
      return;
    }

    const selectedLines = previewMenu.courses.map(course => {
      const selectedProductId = menuSelections[course.id];
      const product = selectedProductId ? availableProductsById.get(selectedProductId) : null;
      return {
        course,
        product: product ?? null,
      };
    });

    if (selectedLines.some(line => !line.product)) {
      pushToast({ title: 'Menu', message: 'Selecciona una opción en cada bloque del menu.', variant: 'error' });
      return;
    }

    setCart(prev => [
      ...prev,
      ...selectedLines.map(line => ({
        cartLineId: buildCartLineId(line.product!.id),
        productId: line.product!.id,
        product: line.product!,
        quantity: 1,
        note: `${previewMenu.name} · ${line.course.label}`,
      })),
    ]);

    setPreviewMenu(null);
    setMenuSelections({});
  };

  const previewMenuTotal = useMemo(() => {
    if (!previewMenu) {
      return 0;
    }

    return previewMenu.courses.reduce((sum, course) => {
      const productId = menuSelections[course.id];
      const product = productId ? availableProductsById.get(productId) : null;
      return sum + (product?.price ?? 0);
    }, 0);
  }, [availableProductsById, menuSelections, previewMenu]);

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
          note: item.note ?? null,
        })),
      );
      setCart([]);
      closeCartNoteEditor();
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

  const canDeleteOrder = (order: (typeof orders)[number]) => {
    if (isCustomerMode) {
      return false;
    }

    if (order.status === 'DELIVERED') {
      return false;
    }

    if (!order.table) {
      return true;
    }

    return order.table.isOpen && order.table.currentSession === order.tableSession;
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
    <div className={`order-page${isCustomerMode ? ' order-page--customer' : ''}`}>
      {hasTableContext && !isCustomerMode && (
        <div className={`order-page-header${isCustomerMode ? ' order-page-header--customer' : ''}`}>
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

      <AppToastStack toasts={toasts} onClose={removeToast} />

      {missingSelectedTable && (
        <section className={`customer-order-error${isCustomerMode ? ' customer-order-error--customer' : ''}`}>
          <h2>{isCustomerMode ? 'Este QR ya no esta disponible' : 'La mesa ya no esta disponible'}</h2>
          <p>
            {isCustomerMode
              ? 'La mesa asociada a este codigo QR ya no existe o ha sido reconfigurada. Pide al personal un nuevo QR para continuar.'
              : 'La mesa asociada a esta comanda ya no existe o ha sido reconfigurada desde administracion.'}
          </p>
        </section>
      )}

      {hasTableContext && !missingSelectedTable && isCustomerMode && selectedTable && (
        <div className="menu-layout">
          <header className="menu-hero">
            <span className="menu-hero-badge">Mesa {selectedTable.number} · {TABLE_AREA_LABELS[selectedTable.area]}</span>
            <h1 className="menu-hero-title">Nuestra Carta</h1>
            <p className="menu-hero-tagline">Elige tus platos favoritos y envíalos directamente a tu mesa</p>
            {!selectedTable.isOpen && (
              <div className="menu-closed-notice">
                <p>La mesa está cerrada ahora mismo. Pide al personal que la abra para empezar a pedir.</p>
              </div>
            )}
          </header>

          <div className="menu-body">
            <div className="menu-sections">
              {availableMenus.length > 0 && (
                <section className="menu-section menu-section--specials">
                  <div className="menu-section-header">
                    <div className="menu-section-copy">
                      <h2>Menus</h2>
                      <p>Combina varios pasos del menú y deja que el cliente elija una opción por bloque.</p>
                    </div>
                  </div>
                  <div className="menu-bundle-grid">
                    {availableMenus.map(menu => (
                      <article key={menu.id} className="menu-bundle-card">
                        <div className="menu-bundle-copy">
                          <div className="menu-bundle-topline">
                            <span className="menu-bundle-badge">Menu configurable</span>
                            <strong>{menu.courses.length} bloques</strong>
                          </div>
                          <h3>{menu.name}</h3>
                          <p>{menu.description?.trim() || 'Elige una opción en cada parte del menú antes de añadirlo a tu pedido.'}</p>
                          <ul className="menu-bundle-course-list">
                            {menu.courses.map(course => (
                              <li key={course.id}>
                                <strong>{course.label}</strong>
                                <span>{course.options.length} opciones</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <button className="btn-primary menu-bundle-button" type="button" onClick={() => openMenuPreview(menu)} disabled={!selectedTable.isOpen}>
                          Elegir menu
                        </button>
                      </article>
                    ))}
                  </div>
                </section>
              )}

              {activeMenuCategories.map(cat => {
                const items = menuGrouped ? menuGrouped[cat] : [];
                return (
                  <section
                    key={cat}
                    className="menu-section"
                  >
                    <div className="menu-section-header">
                      <div className="menu-section-copy">
                        <h2>{MENU_CATEGORY_META[cat].label}</h2>
                        <p>{MENU_CATEGORY_META[cat].tagline}</p>
                      </div>
                    </div>
                    {items.length > 0 ? (
                      <div className="menu-product-grid">
                        {items.map(product => (
                          <ProductCard
                            key={product.id}
                            product={product}
                            onOrder={addToCart}
                            onPreview={setPreviewProduct}
                            mode="order"
                            disabled={!selectedTable.isOpen}
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="menu-section-empty">No hay resultados en esta categoría</p>
                    )}
                  </section>
                );
              })}
            </div>

            <aside className="menu-cart" id="order-cart-panel">
              <div className="menu-cart-header">
                <div>
                  <h2>Tu selección</h2>
                  <span className="menu-cart-count">{cartItemCount} artículos</span>
                </div>
                <strong className="menu-cart-total">{cartTotal.toFixed(2)} €</strong>
              </div>
              {cart.length > 0 ? (
                <ul className="cart-list">
                  {cart.map(item => (
                    <li key={item.cartLineId} className={`cart-item${activeCartNoteId === item.cartLineId ? ' is-editing' : ''}`}>
                      <div className="cart-item-main">
                        <div className="cart-item-copy">
                          <span className="cart-item-name">{item.product.name}</span>
                          {item.note && <span className="cart-item-note-preview">Nota: {item.note}</span>}
                        </div>
                        <span className="cart-item-line-total">{(item.product.price * item.quantity).toFixed(2)} €</span>
                      </div>
                      <div className="cart-item-actions-row">
                        <div className="cart-item-controls">
                          <button type="button" onClick={() => updateQuantity(item.cartLineId, item.quantity - 1)}>−</button>
                          <span>{item.quantity}</span>
                          <button type="button" onClick={() => updateQuantity(item.cartLineId, item.quantity + 1)}>+</button>
                        </div>
                        <button className="btn-ghost cart-item-note-button" type="button" onClick={() => openCartNoteEditor(item.cartLineId)}>
                          {item.note ? 'Editar nota' : 'Notas'}
                        </button>
                        <button className="btn-ghost cart-item-remove" type="button" onClick={() => removeFromCart(item.cartLineId)}>✕</button>
                      </div>
                      {activeCartNoteId === item.cartLineId && (
                        <div className="cart-item-note-editor">
                          <label className="cart-item-note-field">
                            <span>Notas para cocina o sala</span>
                            <textarea
                              value={cartNoteDraft}
                              onChange={event => setCartNoteDraft(event.target.value.slice(0, ORDER_ITEM_NOTE_MAX_LENGTH))}
                              placeholder="Ejemplo: sin cebolla, muy hecha, sacar al final"
                              rows={3}
                            />
                          </label>
                          <div className="cart-item-note-actions">
                            <span>{cartNoteDraft.trim().length}/{ORDER_ITEM_NOTE_MAX_LENGTH}</span>
                            <div className="cart-item-note-buttons">
                              <button className="btn-ghost" type="button" onClick={closeCartNoteEditor}>Cancelar</button>
                              <button className="btn-secondary" type="button" onClick={saveCartItemNote}>Guardar nota</button>
                            </div>
                          </div>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="empty-state menu-cart-empty">
                  <p>Todavía no has añadido nada.</p>
                  <p>Selecciona productos de la carta.</p>
                </div>
              )}
              <div className="cart-total">
                <button className="btn-primary menu-cart-submit" onClick={handleSubmit} disabled={submitting || cart.length === 0 || !selectedTable.isOpen}>
                  {submitting ? 'Enviando pedido...' : `Confirmar Pedido · ${cartTotal.toFixed(2)} €`}
                </button>
              </div>
            </aside>
          </div>

          {previewProduct && (
            <div className="menu-product-modal-backdrop" role="presentation" onClick={() => setPreviewProduct(null)}>
              <section
                className="menu-product-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="menu-product-modal-title"
                onClick={event => event.stopPropagation()}
              >
                {previewProduct.imageUrl && (
                  <div className="menu-product-modal-media-wrap" aria-hidden="true">
                    <div className="menu-product-modal-media" style={{ backgroundImage: `url(${previewProduct.imageUrl})` }} />
                    <div className="menu-product-modal-media-overlay" />
                  </div>
                )}

                <div className="menu-product-modal-body">
                  <h2 id="menu-product-modal-title">{previewProduct.name}</h2>
                  <strong className="menu-product-modal-price">{previewProduct.price.toFixed(2)} €</strong>

                  <div className="menu-product-modal-copy">
                    <h3>Qué lleva</h3>
                    <p>{previewProduct.description?.trim() || 'Este producto todavía no tiene una descripción detallada.'}</p>
                  </div>

                  <div className="menu-product-modal-actions">
                    <button className="btn-ghost" type="button" onClick={() => setPreviewProduct(null)}>
                      Seguir mirando
                    </button>
                    <button className="btn-primary menu-product-modal-add" type="button" onClick={handleAddPreviewProduct} disabled={!selectedTable.isOpen}>
                      Añadir al pedido
                    </button>
                  </div>
                </div>
              </section>
            </div>
          )}

          {previewMenu && (
            <div
              className="menu-product-modal-backdrop"
              role="presentation"
              onClick={() => {
                setPreviewMenu(null);
                setMenuSelections({});
              }}
            >
              <section
                className="menu-product-modal menu-product-modal--menu"
                role="dialog"
                aria-modal="true"
                aria-labelledby="menu-builder-modal-title"
                onClick={event => event.stopPropagation()}
              >
                <div className="menu-product-modal-body">
                  <h2 id="menu-builder-modal-title">{previewMenu.name}</h2>
                  <strong className="menu-product-modal-price">{previewMenuTotal.toFixed(2)} €</strong>

                  <div className="menu-product-modal-copy">
                    <h3>Configura tu menu</h3>
                    <p>{previewMenu.description?.trim() || 'Selecciona una opción en cada bloque para completar el pedido.'}</p>
                  </div>

                  <div className="menu-builder-course-list">
                    {previewMenu.courses.map(course => (
                      <section key={course.id} className="menu-builder-course-card">
                        <div className="menu-builder-course-header">
                          <strong>{course.label}</strong>
                          <span>{MENU_COURSE_LABELS[course.courseType]}</span>
                        </div>
                        <div className="menu-builder-option-list">
                          {course.options.map(option => {
                            const checked = menuSelections[course.id] === option.id;
                            return (
                              <label key={option.id} className={`menu-builder-option${checked ? ' is-selected' : ''}`}>
                                <input
                                  type="radio"
                                  name={`menu-course-${course.id}`}
                                  checked={checked}
                                  onChange={() => handleMenuSelection(course.id, option.id)}
                                />
                                <div>
                                  <strong>{option.name}</strong>
                                  <span>{option.price.toFixed(2)} €</span>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </section>
                    ))}
                  </div>

                  <div className="menu-product-modal-actions">
                    <button
                      className="btn-ghost"
                      type="button"
                      onClick={() => {
                        setPreviewMenu(null);
                        setMenuSelections({});
                      }}
                    >
                      Seguir mirando
                    </button>
                    <button className="btn-primary menu-product-modal-add" type="button" onClick={handleAddPreviewMenu} disabled={!selectedTable.isOpen}>
                      Añadir menu al pedido
                    </button>
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>
      )}

      {hasTableContext && !missingSelectedTable && !isCustomerMode && (
        <div className="order-workspace">
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
                  <span>{groupedProducts.DRINKS.length}</span>
                </button>
                <button
                  className={`order-section-tab${activeSection === 'FOOD' ? ' is-active' : ''}`}
                  type="button"
                  onClick={() => setActiveSection('FOOD')}
                >
                  Comida
                  <span>{groupedProducts.FOOD.length}</span>
                </button>
              </div>

              <div className="order-search-shell">
                <label className="order-search-field">
                  <span className="order-search-label">Buscar</span>
                  <input
                    type="text"
                    value={search}
                    onChange={event => setSearch(event.target.value)}
                    placeholder={SECTION_COPY[activeSection].placeholder}
                  />
                </label>
                {search && (
                  <button className="btn-ghost order-search-clear" type="button" onClick={() => setSearch('')}>
                    Limpiar
                  </button>
                )}
              </div>
            </div>

            <div className="order-section-header">
              <div>
                <h2>{SECTION_COPY[activeSection].title}</h2>
              </div>
              <span className="order-section-count">{visibleProducts.length} productos</span>
            </div>

            <div className="product-grid product-grid--order">
              {visibleProducts.map(product => (
                <ProductCard key={product.id} product={product} onOrder={addToCart} mode="order" disabled={!selectedTable?.isOpen} />
              ))}
            </div>

            {selectedTable && !selectedTable.isOpen && (
              <p className="order-prompt">La mesa está cerrada. Reábrela para empezar una nueva comanda.</p>
            )}

            {visibleProducts.length === 0 && (
              <p className="empty-state order-empty-state">{SECTION_COPY[activeSection].empty}</p>
            )}
            </div>
          </section>

          <aside className="order-cart order-cart--sticky" id="order-cart-panel">
            <div className="order-cart-header">
              <div>
                <h2>Tu Pedido</h2>
                <span className="order-cart-subtitle">{cartItemCount} artículos seleccionados</span>
              </div>
              <strong>Total: &euro;{cartTotal.toFixed(2)}</strong>
            </div>
            {cart.length > 0 ? (
              <ul className="cart-list">
                {cart.map(item => (
                  <li key={item.cartLineId} className={`cart-item${activeCartNoteId === item.cartLineId ? ' is-editing' : ''}`}>
                    <div className="cart-item-main">
                      <div className="cart-item-copy">
                        <span className="cart-item-name">{item.product.name}</span>
                        {item.note && <span className="cart-item-note-preview">Nota: {item.note}</span>}
                      </div>
                      <span className="cart-item-line-total">&euro;{(item.product.price * item.quantity).toFixed(2)}</span>
                    </div>
                    <div className="cart-item-actions-row">
                      <div className="cart-item-controls">
                        <button type="button" onClick={() => updateQuantity(item.cartLineId, item.quantity - 1)}>-</button>
                        <span>{item.quantity}</span>
                        <button type="button" onClick={() => updateQuantity(item.cartLineId, item.quantity + 1)}>+</button>
                      </div>
                      <button className="btn-ghost cart-item-note-button" type="button" onClick={() => openCartNoteEditor(item.cartLineId)}>
                        {item.note ? 'Editar nota' : 'Notas'}
                      </button>
                      <button className="btn-ghost cart-item-remove" type="button" onClick={() => removeFromCart(item.cartLineId)}>✕</button>
                    </div>
                    {activeCartNoteId === item.cartLineId && (
                      <div className="cart-item-note-editor">
                        <label className="cart-item-note-field">
                          <span>Notas para cocina o sala</span>
                          <textarea
                            value={cartNoteDraft}
                            onChange={event => setCartNoteDraft(event.target.value.slice(0, ORDER_ITEM_NOTE_MAX_LENGTH))}
                            placeholder="Ejemplo: sin cebolla, muy hecha, sacar al final"
                            rows={3}
                          />
                        </label>
                        <div className="cart-item-note-actions">
                          <span>{cartNoteDraft.trim().length}/{ORDER_ITEM_NOTE_MAX_LENGTH}</span>
                          <div className="cart-item-note-buttons">
                            <button className="btn-ghost" type="button" onClick={closeCartNoteEditor}>Cancelar</button>
                            <button className="btn-secondary" type="button" onClick={saveCartItemNote}>Guardar nota</button>
                          </div>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-state order-cart-empty-state">
                <p>Todavia no has anadido productos.</p>
                <p>Selecciona articulos del menu y apareceran aqui al momento.</p>
              </div>
            )}
            <div className="cart-total">
              <button className="btn-primary" onClick={handleSubmit} disabled={submitting || cart.length === 0 || !initialTableId || !selectedTable?.isOpen}>
                {submitting ? 'Enviando...' : 'Confirmar Pedido'}
              </button>
            </div>
          </aside>
        </div>
      )}

      {!isCustomerMode && (
      <section className={`order-history${isCustomerMode ? ' order-history--customer' : ''}`}>
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
                onDeleteRequest={selectedTable && canDeleteOrder(order) ? setOrderPendingDeletion : undefined}
                showDeliveryTimer={Boolean(selectedTable) && isCustomerMode}
              />
            ))}
          </div>
        )}
      </section>
      )}
    </div>
  );
}