"use client";

import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppToastStack from '@/components/AppToast';
import ConfirmDialog from '@/components/ConfirmDialog';
import useAppToasts from '@/hooks/useAppToasts';
import ProductCard from '@/components/ProductCard';
import type { Product } from '@/types';

const ProductsPage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [productPendingDeletion, setProductPendingDeletion] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState(false);
  const [togglingProductId, setTogglingProductId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const { toasts, pushToast, removeToast } = useAppToasts();
  const router = useRouter();
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    fetch('/api/products')
      .then(r => r.json())
      .then(setProducts)
      .catch(() => {});
  }, []);

  const visibleProducts = useMemo(() => {
    const normalizedSearch = deferredSearch.trim().toLocaleLowerCase('nl-NL');

    return [...products]
      .sort((left, right) => left.name.localeCompare(right.name, 'nl-NL', { sensitivity: 'base' }))
      .filter(product => {
        if (!normalizedSearch) {
          return true;
        }

        return product.name.toLocaleLowerCase('nl-NL').includes(normalizedSearch);
      });
  }, [deferredSearch, products]);

  const handleDelete = async (productId: number) => {
    const product = products.find(item => item.id === productId) ?? null;
    if (!product) {
      return;
    }

    setProductPendingDeletion(product);
  };

  const handleConfirmDelete = async () => {
    if (!productPendingDeletion) {
      return;
    }

    setDeletingProduct(true);

    try {
      const res = await fetch(`/api/products/${productPendingDeletion.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      setProducts(prev => prev.filter(p => p.id !== productPendingDeletion.id));
      setProductPendingDeletion(null);
      pushToast({ message: 'Product is succesvol verwijderd.', title: 'Product', variant: 'success' });
    } catch {
      pushToast({ message: 'Product verwijderen is mislukt.', title: 'Product', variant: 'error' });
    } finally {
      setDeletingProduct(false);
    }
  };

  const handleEdit = (product: Product) => {
    router.push(`/admin/products/${product.id}`);
  };

  const handleToggleEnabled = async (product: Product) => {
    setTogglingProductId(product.id);

    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: product.name,
          description: product.description || undefined,
          price: product.price,
          image: product.imageUrl || undefined,
          category: product.category,
          stock: product.stock,
          isEnabled: !product.isEnabled,
          orderDestination: product.orderTarget.toLowerCase(),
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error ?? 'Failed');
      }

      const updatedProduct = (await res.json()) as Product;
      setProducts(prev => prev.map(item => (item.id === updatedProduct.id ? updatedProduct : item)));
      pushToast({
        message: updatedProduct.isEnabled ? 'Product is succesvol ingeschakeld.' : 'Product is succesvol uitgeschakeld.',
        title: 'Product',
        variant: 'success',
      });
    } catch (error) {
      pushToast({
        message: error instanceof Error && error.message !== 'Failed' ? error.message : 'De productstatus kon niet worden bijgewerkt.',
        title: 'Product',
        variant: 'error',
      });
    } finally {
      setTogglingProductId(null);
    }
  };

  return (
    <div className="products-page">
      <div className="page-header">
        <h1>Producten</h1>
        <button className="btn-primary" onClick={() => router.push('/admin/products/create')}>
          + Nieuw product
        </button>
      </div>
      <div className="order-browser-toolbar">
        <label className="order-search-field">
          <span className="order-search-label">Zoeken op naam</span>
          <input
            type="text"
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Bijvoorbeeld: Cola"
          />
        </label>
      </div>
      <div className="product-grid">
        {visibleProducts.map(product => (
          <ProductCard
            key={product.id}
            product={togglingProductId === product.id ? { ...product, isEnabled: !product.isEnabled } : product}
            mode="admin"
            onEdit={handleEdit}
            onDelete={handleDelete}
            onToggleEnabled={handleToggleEnabled}
          />
        ))}
      </div>
      {products.length === 0 && <p className="empty-state">Er zijn nog geen producten</p>}
      {products.length > 0 && visibleProducts.length === 0 && <p className="empty-state">Er zijn geen producten met die naam</p>}

      <ConfirmDialog
        open={Boolean(productPendingDeletion)}
        title="Product verwijderen"
        message={productPendingDeletion ? `Weet je zeker dat je ${productPendingDeletion.name} wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.` : ''}
        confirmLabel={deletingProduct ? 'Verwijderen...' : 'Ja, verwijderen'}
        cancelLabel="Annuleren"
        confirmVariant="danger"
        busy={deletingProduct}
        onConfirm={handleConfirmDelete}
        onCancel={() => setProductPendingDeletion(null)}
      />

      <AppToastStack toasts={toasts} onClose={removeToast} />
    </div>
  );
};

export default ProductsPage;