"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ProductCard from '@/components/ProductCard';
import type { Product } from '@/types';

const ProductsPage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/products')
      .then(r => r.json())
      .then(setProducts)
      .catch(() => {});
  }, []);

  const handleDelete = async (productId: number) => {
    if (!confirm('¿Eliminar este producto?')) return;
    try {
      const res = await fetch(`/api/products/${productId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      setProducts(prev => prev.filter(p => p.id !== productId));
    } catch {
      alert('Error al eliminar producto');
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
      <div className="product-grid">
        {products.map(product => (
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
    </div>
  );
};

export default ProductsPage;