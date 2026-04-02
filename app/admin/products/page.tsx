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
    const normalizedSearch = deferredSearch.trim().toLocaleLowerCase('es-ES');

    return [...products]
      .sort((left, right) => left.name.localeCompare(right.name, 'es-ES', { sensitivity: 'base' }))
      .filter(product => {
        if (!normalizedSearch) {
          return true;
        }

        return product.name.toLocaleLowerCase('es-ES').includes(normalizedSearch);
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
      pushToast({ message: 'Producto eliminado correctamente.', title: 'Producto', variant: 'success' });
    } catch {
      pushToast({ message: 'Error al eliminar producto.', title: 'Producto', variant: 'error' });
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
        message: updatedProduct.isEnabled ? 'Producto habilitado correctamente.' : 'Producto deshabilitado correctamente.',
        title: 'Producto',
        variant: 'success',
      });
    } catch (error) {
      pushToast({
        message: error instanceof Error && error.message !== 'Failed' ? error.message : 'No se pudo actualizar el estado del producto.',
        title: 'Producto',
        variant: 'error',
      });
    } finally {
      setTogglingProductId(null);
    }
  };

  return (
    <div className="products-page">
      <div className="page-header">
        <h1>Productos</h1>
        <button className="btn-primary" onClick={() => router.push('/admin/products/create')}>
          + Nuevo Producto
        </button>
      </div>
      <div className="order-browser-toolbar">
        <label className="order-search-field">
          <span className="order-search-label">Buscar por nombre</span>
          <input
            type="text"
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Ejemplo: Coca-Cola"
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
      {products.length === 0 && <p className="empty-state">No hay productos aún</p>}
      {products.length > 0 && visibleProducts.length === 0 && <p className="empty-state">No hay productos con ese nombre</p>}

      <ConfirmDialog
        open={Boolean(productPendingDeletion)}
        title="Eliminar producto"
        message={productPendingDeletion ? `¿Seguro que quieres eliminar ${productPendingDeletion.name}? Esta acción no se puede deshacer.` : ''}
        confirmLabel={deletingProduct ? 'Eliminando...' : 'Sí, eliminar'}
        cancelLabel="Cancelar"
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