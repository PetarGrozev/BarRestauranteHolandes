"use client";

import React from 'react';
import type { Product } from '../types';

interface ProductCardProps {
  product: Product;
  onOrder?: (product: Product) => void;
  onEdit?: (product: Product) => void;
  onDelete?: (productId: number) => void;
  mode?: 'order' | 'admin';
  disabled?: boolean;
}

const TARGET_LABELS: Record<string, string> = {
  KITCHEN: 'Cocina',
  STAFF: 'Sala',
  BOTH: 'Ambos',
};

const ProductCard: React.FC<ProductCardProps> = ({ product, onOrder, onEdit, onDelete, mode = 'order', disabled = false }) => {
  if (mode === 'order' && onOrder) {
    return (
      <button className="product-pick-button" type="button" onClick={() => onOrder(product)} disabled={disabled}>
        <span className="product-pick-name">{product.name}</span>
        {product.description && <span className="product-pick-desc">{product.description}</span>}
        <span className="product-pick-price">&euro;{product.price.toFixed(2)}</span>
      </button>
    );
  }

  return (
    <div className="product-card">
      {product.imageUrl && (
        <img className="product-card-img" src={product.imageUrl} alt={product.name} />
      )}
      <div className="product-card-body">
        <h3>{product.name}</h3>
        {product.description && <p className="product-card-desc">{product.description}</p>}
        <div className="product-card-meta">
          <span className="product-card-price">&euro;{product.price.toFixed(2)}</span>
          <span className="product-card-target">{TARGET_LABELS[product.orderTarget] ?? product.orderTarget}</span>
        </div>
      </div>
      <div className="product-card-actions">
        {mode === 'admin' && (
          <>
            {onEdit && <button className="btn-secondary" onClick={() => onEdit(product)}>Editar</button>}
            {onDelete && <button className="btn-ghost" onClick={() => onDelete(product.id)}>Eliminar</button>}
          </>
        )}
      </div>
    </div>
  );
};

export default ProductCard;