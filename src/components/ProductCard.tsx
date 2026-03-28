"use client";

import React from 'react';
import type { Product } from '../types';

interface ProductCardProps {
  product: Product;
  onOrder?: (product: Product) => void;
  onEdit?: (product: Product) => void;
  onDelete?: (productId: number) => void;
  onToggleEnabled?: (product: Product) => void;
  mode?: 'order' | 'admin';
  disabled?: boolean;
}

const TARGET_LABELS: Record<string, string> = {
  KITCHEN: 'Cocina',
  STAFF: 'Sala',
  BOTH: 'Ambos',
};

const ProductCard: React.FC<ProductCardProps> = ({ product, onOrder, onEdit, onDelete, onToggleEnabled, mode = 'order', disabled = false }) => {
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
        <div className="product-card-badges">
          <span className={`product-card-badge ${product.stock > 0 ? 'product-card-badge--stock' : 'product-card-badge--out'}`}>
            {product.stock > 0 ? `Stock: ${product.stock}` : 'Sin stock'}
          </span>
          <span className={`product-card-badge ${product.isEnabled ? 'product-card-badge--enabled' : 'product-card-badge--disabled'}`}>
            {product.isEnabled ? 'Habilitado' : 'Deshabilitado'}
          </span>
        </div>
        <div className="product-card-meta">
          <span className="product-card-price">&euro;{product.price.toFixed(2)}</span>
          <span className="product-card-target">{TARGET_LABELS[product.orderTarget] ?? product.orderTarget}</span>
        </div>
      </div>
      <div className="product-card-actions">
        {mode === 'admin' && (
          <>
            {onEdit && <button className="btn-secondary" type="button" onClick={() => onEdit(product)}>Editar</button>}
            {onToggleEnabled && (
              <button className="btn-ghost" type="button" onClick={() => onToggleEnabled(product)}>
                {product.isEnabled ? 'Deshabilitar' : 'Habilitar'}
              </button>
            )}
            {onDelete && <button className="btn-ghost" type="button" onClick={() => onDelete(product.id)}>Eliminar</button>}
          </>
        )}
      </div>
    </div>
  );
};

export default ProductCard;