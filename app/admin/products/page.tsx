"use client";

import { useEffect, useState } from 'react';
import ProductCard from '@/components/ProductCard';

const ProductsPage = () => {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const loadProducts = async () => {
      const res = await fetch('/api/products');
      if (!res.ok) return;
      const data = await res.json();
      setProducts(data);
    };

    loadProducts();
  }, []);

  return (
    <div>
      <h1>Producten Beheren</h1>
      <div className="product-list">
        {products.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
};

export default ProductsPage;