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
            product={product}
            mode="admin"
            onEdit={handleEdit}
            onDelete={handleDelete}
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