"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
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
import { getMenuCategory, getProductSection, productMatchesSearch, groupProductsByMenuCategory, MENU_CATEGORIES, MENU_CATEGORY_META, type MenuCategory, type ProductSection } from '@/lib/productCategories';

const ORDER_ITEM_NOTE_MAX_LENGTH = 280;

const TABLE_AREA_LABELS: Record<TableArea, string> = {
  INTERIOR: 'Binnen',
  TERRACE: 'Terras',
};

const SECTION_COPY: Record<ProductSection, { title: string; placeholder: string; empty: string }> = {
  DRINKS: {
    title: 'Dranken',
    placeholder: 'Zoek drank, bijvoorbeeld water',
    empty: 'Geen bijpassende dranken',
  },
  FOOD: {
    title: 'Eten',
    placeholder: 'Zoek eten',
    empty: 'Geen bijpassende gerechten',
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
  const [activeMenuTab, setActiveMenuTab] = useState<MenuCategory | 'MENUS' | 'ALL' | null>(null);
  const [menuDropdownOpen, setMenuDropdownOpen] = useState(false);
  const menuDropdownRef = useRef<HTMLDivElement>(null);
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
      throw new Error('Producten laden is mislukt');
    }

    const data = (await response.json()) as Product[];
    setProducts(data);
  };

  const loadMenus = async () => {
    const response = await fetch('/api/menus');
    if (!response.ok) {
      throw new Error('Menu\'s laden is mislukt');
    }

    const data = (await response.json()) as Menu[];
    setMenus(data);
  };

  const loadTables = async () => {
    const response = await fetch('/api/tables');
    if (!response.ok) {
      throw new Error('Tafels laden is mislukt');
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

  useEffect(() => {
    if (!isCustomerMode || activeMenuTab !== null) return;
    if (activeMenuCategories.length > 0 || availableMenus.length > 0) {
      setActiveMenuTab('ALL');
    }
  }, [isCustomerMode, availableMenus.length, activeMenuCategories, activeMenuTab]);

  useEffect(() => {
    if (!menuDropdownOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (menuDropdownRef.current && !menuDropdownRef.current.contains(e.target as Node)) {
        setMenuDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [menuDropdownOpen]);

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
      pushToast({ message: `${product.name} is nu niet beschikbaar.`, title: 'Product', variant: 'error' });
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
      pushToast({ title: 'Menu', message: 'Er zijn momenteel geen opties beschikbaar om dit menu compleet te maken.', variant: 'error' });
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
      pushToast({ title: 'Menu', message: 'Selecteer een optie in elk menublok.', variant: 'error' });
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
      pushToast({ message: 'Bestelling is succesvol naar de tafel gestuurd.', title: 'Bestelling', variant: 'success' });
    } catch (error) {
      await loadProducts().catch(() => {});
      const message = error instanceof Error ? error.message : 'Bestelling aanmaken is mislukt.';
      pushToast({ message, title: 'Bestelling', variant: 'error' });
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
        throw new Error('Tafel afsluiten is mislukt');
      }

      const data = await response.json();
      if (data.table) {
        setTables(prev => prev.map(table => (table.id === data.table.id ? data.table : table)));
      }
      setLastCheckoutSummary((data.summary ?? null) as TableCheckoutSummary | null);
      setCart([]);
      await Promise.all([refreshOrders(), loadTables()]);
      pushToast({ message: 'Tafel succesvol afgesloten met bijgewerkt totaalbedrag.', title: 'Tafel', variant: 'success' });
    } catch {
      pushToast({ message: 'De tafel kon niet worden afgesloten.', title: 'Tafel', variant: 'error' });
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
      pushToast({ message: 'Bestelling succesvol verwijderd.', title: 'Bestelling', variant: 'success' });
    } catch {
      pushToast({ message: 'Bestelling verwijderen is mislukt.', title: 'Bestelling', variant: 'error' });
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
        throw new Error('Tafel heropenen is mislukt');
      }

      const data = await response.json();
      if (data.table) {
        setTables(prev => prev.map(table => (table.id === data.table.id ? data.table : table)));
      }
      setLastCheckoutSummary(null);
      await loadTables();
      pushToast({ message: 'Tafel geopend voor nieuwe gasten.', title: 'Tafel', variant: 'success' });
    } catch {
      pushToast({ message: 'De tafel kon niet worden geopend.', title: 'Tafel', variant: 'error' });
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
                Tafel {selectedTable.number} · {TABLE_AREA_LABELS[selectedTable.area]} · {selectedTable.isOpen ? 'Open' : 'Gesloten'}
              </div>
            ) : (
              <div className="order-cart-pill order-cart-pill--muted">Tafel laden...</div>
            )}
          </div>
          {!isCustomerMode && <Link className="btn-secondary" href="/tables">Tafel wisselen</Link>}
        </div>
      )}

      {hasTableContext && selectedTable && !isCustomerMode && (
        <section className="table-session-card">
          <div className="table-session-header">
            <div>
              <h2>Tafelrekening</h2>
              <p className="table-session-subtitle">
                {selectedTable.isOpen
                  ? 'Beheer de actieve bestelling en sluit af wanneer de gasten vertrekken.'
                  : 'De tafel is gesloten. Je kunt haar heropenen voor een nieuwe groep gasten.'}
              </p>
            </div>
            {selectedTable.isOpen ? (
              <button className="btn-primary" type="button" onClick={handleCloseTable} disabled={closingTable}>
                {closingTable ? 'Tafel afsluiten...' : 'Tafel afsluiten en totaal tonen'}
              </button>
            ) : (
              <button className="btn-secondary" type="button" onClick={handleReopenTable} disabled={reopeningTable}>
                {reopeningTable ? 'Tafel openen...' : 'Tafel openen voor nieuwe gasten'}
              </button>
            )}
          </div>

          <div className="table-session-metrics">
            <div className="table-session-metric">
              <strong>{selectedTableOrders.length}</strong>
              <span>Bestellingen van deze tafel</span>
            </div>
            <div className="table-session-metric">
              <strong>{currentTableItemCount}</strong>
              <span>Geserveerde artikelen</span>
            </div>
            <div className="table-session-metric">
              <strong>{currentTableTotal.toFixed(2)} €</strong>
              <span>Opgeteld totaal</span>
            </div>
          </div>

          {selectedTable.lastClosedAt && !selectedTable.isOpen && (
            <p className="table-session-last-close">
              Laatste afsluiting: {Number(selectedTable.lastClosedTotal ?? 0).toFixed(2)} € · {selectedTable.lastClosedOrderCount ?? 0} bestellingen · {new Date(selectedTable.lastClosedAt).toLocaleString('nl-NL')}
            </p>
          )}
        </section>
      )}

      {hasTableContext && lastCheckoutSummary && !isCustomerMode && (
        <section className="table-checkout-card">
          <div className="table-session-header">
            <div>
              <h2>Afsluitoverzicht</h2>
              <p className="table-session-subtitle">
                Eindbestelling van tafel {lastCheckoutSummary.tableNumber} met het totaalbedrag klaar om af te rekenen.
              </p>
            </div>
          </div>

          <div className="table-session-metrics">
            <div className="table-session-metric">
              <strong>{lastCheckoutSummary.orderCount}</strong>
              <span>Afgesloten bestellingen</span>
            </div>
            <div className="table-session-metric">
              <strong>{lastCheckoutSummary.itemCount}</strong>
              <span>Totaal aantal artikelen</span>
            </div>
            <div className="table-session-metric">
              <strong>{lastCheckoutSummary.total.toFixed(2)} €</strong>
              <span>Totaal te innen</span>
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
          title="Bestelling verwijderen"
          message={`Weet je zeker dat je bestelling #${orderPendingDeletion.id} wilt verwijderen? Deze actie haalt de bestelling uit de huidige tafelbon.`}
          confirmLabel={deletingOrder ? 'Verwijderen...' : 'Ja, bestelling verwijderen'}
          cancelLabel="Annuleren"
          confirmVariant="danger"
          busy={deletingOrder}
          onConfirm={handleConfirmDeleteOrder}
          onCancel={() => setOrderPendingDeletion(null)}
        >
          <div className="confirm-dialog-summary">
            <strong>{orderPendingDeletion.orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)} €</strong>
            <span>{orderPendingDeletion.orderItems.length} regels in de bestelling</span>
          </div>
        </ConfirmDialog>
      )}

      <AppToastStack toasts={toasts} onClose={removeToast} />

      {missingSelectedTable && (
        <section className={`customer-order-error${isCustomerMode ? ' customer-order-error--customer' : ''}`}>
          <h2>{isCustomerMode ? 'Deze QR-code is niet meer beschikbaar' : 'Deze tafel is niet meer beschikbaar'}</h2>
          <p>
            {isCustomerMode
              ? 'De tafel die bij deze QR-code hoort bestaat niet meer of is opnieuw ingesteld. Vraag het personeel om een nieuwe QR-code om verder te gaan.'
              : 'De tafel die bij deze bon hoort bestaat niet meer of is vanuit het beheer opnieuw ingesteld.'}
          </p>
        </section>
      )}

      {hasTableContext && !missingSelectedTable && isCustomerMode && selectedTable && (
        <div className="menu-layout">
          <header className="menu-hero">
            <span className="menu-hero-badge">Tafel {selectedTable.number} · {TABLE_AREA_LABELS[selectedTable.area]}</span>
            <h1 className="menu-hero-title">Onze kaart</h1>
            <p className="menu-hero-tagline">Kies je favoriete gerechten en stuur ze direct naar je tafel</p>
            {!selectedTable.isOpen && (
              <div className="menu-closed-notice">
                <p>De tafel is momenteel gesloten. Vraag het personeel om de tafel te openen voordat je bestelt.</p>
              </div>
            )}
          </header>

          <div className="menu-cat-dropdown" ref={menuDropdownRef}>
            <button
              className="menu-cat-trigger"
              type="button"
              onClick={() => setMenuDropdownOpen(prev => !prev)}
              aria-expanded={menuDropdownOpen}
              aria-haspopup="listbox"
            >
              <span className="menu-cat-trigger-label">
                {activeMenuTab === null && 'Categorie kiezen'}
                {activeMenuTab === 'ALL' && 'De hele brief'}
                {activeMenuTab === 'MENUS' && "Menu's"}
                {activeMenuTab !== null && activeMenuTab !== 'MENUS' && activeMenuTab !== 'ALL' && (
                  <>{MENU_CATEGORY_META[activeMenuTab].label}</>
                )}
              </span>
              <span className="menu-cat-trigger-chevron" aria-hidden="true">
                {menuDropdownOpen ? '▲' : '▼'}
              </span>
            </button>

            {menuDropdownOpen && (
              <div className="menu-cat-panel" role="listbox">
                <button
                  className={`menu-cat-option${activeMenuTab === 'ALL' ? ' is-active' : ''}`}
                  type="button"
                  role="option"
                  aria-selected={activeMenuTab === 'ALL'}
                  onClick={() => { setActiveMenuTab('ALL'); setMenuDropdownOpen(false); }}
                >
                  De hele brief
                </button>
                {availableMenus.length > 0 && (
                  <button
                    className={`menu-cat-option${activeMenuTab === 'MENUS' ? ' is-active' : ''}`}
                    type="button"
                    role="option"
                    aria-selected={activeMenuTab === 'MENUS'}
                    onClick={() => { setActiveMenuTab('MENUS'); setMenuDropdownOpen(false); }}
                  >
                    Menu&apos;s
                  </button>
                )}
                {activeMenuCategories.map(cat => (
                  <button
                    key={cat}
                    className={`menu-cat-option${activeMenuTab === cat ? ' is-active' : ''}`}
                    type="button"
                    role="option"
                    aria-selected={activeMenuTab === cat}
                    onClick={() => { setActiveMenuTab(cat); setMenuDropdownOpen(false); }}
                  >
                    {MENU_CATEGORY_META[cat].label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="menu-body">
            <div className="menu-sections">
              {(activeMenuTab === 'MENUS' || activeMenuTab === 'ALL') && availableMenus.length > 0 && (
                <section className="menu-section menu-section--specials">
                  <div className="menu-section-header">
                    <div className="menu-section-copy">
                      <h2>Menu&apos;s</h2>
                      <p>Combineer meerdere gangen en laat de klant per blok een optie kiezen.</p>
                    </div>
                  </div>
                  <div className="menu-bundle-grid">
                    {availableMenus.map(menu => (
                      <article key={menu.id} className="menu-bundle-card">
                        <div className="menu-bundle-copy">
                          <div className="menu-bundle-topline">
                            <span className="menu-bundle-badge">Samenstelbaar menu</span>
                            <strong>{menu.courses.length} blokken</strong>
                          </div>
                          <h3>{menu.name}</h3>
                          <p>{menu.description?.trim() || 'Kies in elk deel van het menu een optie voordat je het toevoegt aan je bestelling.'}</p>
                          <ul className="menu-bundle-course-list">
                            {menu.courses.map(course => (
                              <li key={course.id}>
                                <strong>{course.label}</strong>
                                <span>{course.options.length} opties</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <button className="btn-primary menu-bundle-button" type="button" onClick={() => openMenuPreview(menu)} disabled={!selectedTable.isOpen}>
                          Menu kiezen
                        </button>
                      </article>
                    ))}
                  </div>
                </section>
              )}

              {activeMenuTab === 'ALL' && menuGrouped && activeMenuCategories.map(cat => (
                <section key={cat} className="menu-section">
                  <div className="menu-section-header">
                    <div className="menu-section-copy">
                      <h2>{MENU_CATEGORY_META[cat].label}</h2>
                      <p>{MENU_CATEGORY_META[cat].tagline}</p>
                    </div>
                  </div>
                  {menuGrouped[cat].length > 0 ? (
                    <div className="menu-product-list">
                      {menuGrouped[cat].map(product => (
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
                  ) : null}
                </section>
              ))}

              {activeMenuTab !== null && activeMenuTab !== 'MENUS' && activeMenuTab !== 'ALL' && menuGrouped && (
                <section className="menu-section">
                  <div className="menu-section-header">
                    <div className="menu-section-copy">
                      <h2>{MENU_CATEGORY_META[activeMenuTab].label}</h2>
                      <p>{MENU_CATEGORY_META[activeMenuTab].tagline}</p>
                    </div>
                  </div>
                  {menuGrouped[activeMenuTab].length > 0 ? (
                    <div className="menu-product-list">
                      {menuGrouped[activeMenuTab].map(product => (
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
                    <p className="menu-section-empty">Geen resultaten in deze categorie</p>
                  )}
                </section>
              )}
            </div>

            <aside className="menu-cart" id="order-cart-panel">
              <div className="menu-cart-header">
                <div>
                  <h2>Jouw selectie</h2>
                  <span className="menu-cart-count">{cartItemCount} artikelen</span>
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
                          {item.note && <span className="cart-item-note-preview">Opmerking: {item.note}</span>}
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
                          {item.note ? 'Opmerking bewerken' : 'Opmerkingen'}
                        </button>
                        <button className="btn-ghost cart-item-remove" type="button" onClick={() => removeFromCart(item.cartLineId)}>✕</button>
                      </div>
                      {activeCartNoteId === item.cartLineId && (
                        <div className="cart-item-note-editor">
                          <label className="cart-item-note-field">
                            <span>Opmerkingen voor keuken of bediening</span>
                            <textarea
                              value={cartNoteDraft}
                              onChange={event => setCartNoteDraft(event.target.value.slice(0, ORDER_ITEM_NOTE_MAX_LENGTH))}
                              placeholder="Bijvoorbeeld: zonder ui, goed doorbakken, als laatste serveren"
                              rows={3}
                            />
                          </label>
                          <div className="cart-item-note-actions">
                            <span>{cartNoteDraft.trim().length}/{ORDER_ITEM_NOTE_MAX_LENGTH}</span>
                            <div className="cart-item-note-buttons">
                              <button className="btn-ghost" type="button" onClick={closeCartNoteEditor}>Annuleren</button>
                              <button className="btn-secondary" type="button" onClick={saveCartItemNote}>Opmerking opslaan</button>
                            </div>
                          </div>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="empty-state menu-cart-empty">
                  <p>Je hebt nog niets toegevoegd.</p>
                  <p>Selecteer producten van de kaart.</p>
                </div>
              )}
              <div className="cart-total">
                <button className="btn-primary menu-cart-submit" onClick={handleSubmit} disabled={submitting || cart.length === 0 || !selectedTable.isOpen}>
                  {submitting ? 'Bestelling versturen...' : `Bestelling bevestigen · ${cartTotal.toFixed(2)} €`}
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
                {previewProduct.imageUrl ? (
                  <div className="menu-product-modal-hero">
                    <div className="menu-product-modal-media" style={{ backgroundImage: `url(${previewProduct.imageUrl})` }} />
                    <div className="menu-product-modal-hero-gradient" />
                    <button className="menu-product-modal-close" type="button" onClick={() => setPreviewProduct(null)} aria-label="Sluiten">✕</button>
                    <div className="menu-product-modal-hero-copy">
                      <h2 id="menu-product-modal-title">{previewProduct.name}</h2>
                      <span className="menu-product-modal-price-hero">{previewProduct.price.toFixed(2)} €</span>
                    </div>
                  </div>
                ) : (
                  <div className="menu-product-modal-no-image">
                    <button className="menu-product-modal-close" type="button" onClick={() => setPreviewProduct(null)} aria-label="Sluiten">✕</button>
                    <h2 id="menu-product-modal-title">{previewProduct.name}</h2>
                    <span className="menu-product-modal-price-hero">{previewProduct.price.toFixed(2)} €</span>
                  </div>
                )}

                <div className="menu-product-modal-body">
                  {previewProduct.description && (
                    <p className="menu-product-modal-desc">{previewProduct.description.trim()}</p>
                  )}
                  <div className="menu-product-modal-actions">
                    <button className="btn-ghost" type="button" onClick={() => setPreviewProduct(null)}>
                      Terug
                    </button>
                    <button className="btn-primary menu-product-modal-add" type="button" onClick={handleAddPreviewProduct} disabled={!selectedTable.isOpen}>
                      Toevoegen aan bestelling
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
                    <h3>Stel je menu samen</h3>
                    <p>{previewMenu.description?.trim() || 'Selecteer in elk blok een optie om de bestelling compleet te maken.'}</p>
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
                      Verder kijken
                    </button>
                    <button className="btn-primary menu-product-modal-add" type="button" onClick={handleAddPreviewMenu} disabled={!selectedTable.isOpen}>
                      Menu aan bestelling toevoegen
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
              <div className="order-section-tabs" role="tablist" aria-label="Menusecties">
                <button
                  className={`order-section-tab${activeSection === 'DRINKS' ? ' is-active' : ''}`}
                  type="button"
                  onClick={() => setActiveSection('DRINKS')}
                >
                  Dranken
                  <span>{groupedProducts.DRINKS.length}</span>
                </button>
                <button
                  className={`order-section-tab${activeSection === 'FOOD' ? ' is-active' : ''}`}
                  type="button"
                  onClick={() => setActiveSection('FOOD')}
                >
                  Eten
                  <span>{groupedProducts.FOOD.length}</span>
                </button>
              </div>

              <div className="order-search-shell">
                <label className="order-search-field">
                  <span className="order-search-label">Zoeken</span>
                  <input
                    type="text"
                    value={search}
                    onChange={event => setSearch(event.target.value)}
                    placeholder={SECTION_COPY[activeSection].placeholder}
                  />
                </label>
                {search && (
                  <button className="btn-ghost order-search-clear" type="button" onClick={() => setSearch('')}>
                    Wissen
                  </button>
                )}
              </div>
            </div>

            <div className="order-section-header">
              <div>
                <h2>{SECTION_COPY[activeSection].title}</h2>
              </div>
              <span className="order-section-count">{visibleProducts.length} producten</span>
            </div>

            <div className="product-grid product-grid--order">
              {visibleProducts.map(product => (
                <ProductCard key={product.id} product={product} onOrder={addToCart} mode="order" disabled={!selectedTable?.isOpen} />
              ))}
            </div>

            {selectedTable && !selectedTable.isOpen && (
              <p className="order-prompt">De tafel is gesloten. Heropen ze om een nieuwe bon te starten.</p>
            )}

            {visibleProducts.length === 0 && (
              <p className="empty-state order-empty-state">{SECTION_COPY[activeSection].empty}</p>
            )}
            </div>
          </section>

          <aside className="order-cart order-cart--sticky" id="order-cart-panel">
            <div className="order-cart-header">
              <div>
                <h2>Jouw bestelling</h2>
                <span className="order-cart-subtitle">{cartItemCount} geselecteerde artikelen</span>
              </div>
              <strong>Totaal: &euro;{cartTotal.toFixed(2)}</strong>
            </div>
            {cart.length > 0 ? (
              <ul className="cart-list">
                {cart.map(item => (
                  <li key={item.cartLineId} className={`cart-item${activeCartNoteId === item.cartLineId ? ' is-editing' : ''}`}>
                    <div className="cart-item-main">
                      <div className="cart-item-copy">
                        <span className="cart-item-name">{item.product.name}</span>
                        {item.note && <span className="cart-item-note-preview">Opmerking: {item.note}</span>}
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
                        {item.note ? 'Opmerking bewerken' : 'Opmerkingen'}
                      </button>
                      <button className="btn-ghost cart-item-remove" type="button" onClick={() => removeFromCart(item.cartLineId)}>✕</button>
                    </div>
                    {activeCartNoteId === item.cartLineId && (
                      <div className="cart-item-note-editor">
                        <label className="cart-item-note-field">
                          <span>Opmerkingen voor keuken of bediening</span>
                          <textarea
                            value={cartNoteDraft}
                            onChange={event => setCartNoteDraft(event.target.value.slice(0, ORDER_ITEM_NOTE_MAX_LENGTH))}
                            placeholder="Bijvoorbeeld: zonder ui, goed doorbakken, als laatste serveren"
                            rows={3}
                          />
                        </label>
                        <div className="cart-item-note-actions">
                          <span>{cartNoteDraft.trim().length}/{ORDER_ITEM_NOTE_MAX_LENGTH}</span>
                          <div className="cart-item-note-buttons">
                              <button className="btn-ghost" type="button" onClick={closeCartNoteEditor}>Annuleren</button>
                              <button className="btn-secondary" type="button" onClick={saveCartItemNote}>Opmerking opslaan</button>
                          </div>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-state order-cart-empty-state">
                <p>Je hebt nog geen producten toegevoegd.</p>
                <p>Selecteer artikelen van het menu en ze verschijnen hier meteen.</p>
              </div>
            )}
            <div className="cart-total">
              <button className="btn-primary" onClick={handleSubmit} disabled={submitting || cart.length === 0 || !initialTableId || !selectedTable?.isOpen}>
                {submitting ? 'Versturen...' : 'Bestelling bevestigen'}
              </button>
            </div>
          </aside>
        </div>
      )}

      {!isCustomerMode && (
      <section className={`order-history${isCustomerMode ? ' order-history--customer' : ''}`}>
        <h2>{selectedTable ? (isCustomerMode ? 'Bestellingen verzonden vanaf deze tafel' : 'Actieve tafelbon') : 'Laatste bestellingen van de zaak'}</h2>
        {loading ? (
          <p>Laden...</p>
        ) : (selectedTable ? selectedTableOrders : orders).length === 0 ? (
          <p className="empty-state">{selectedTable ? 'Deze tafel heeft nog geen bestellingen in de huidige sessie' : 'Er zijn nog geen bestellingen'}</p>
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