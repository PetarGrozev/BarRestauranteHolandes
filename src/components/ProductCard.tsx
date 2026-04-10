"use client";

import React from 'react';
import type { Product } from '../types';

interface ProductCardProps {
  product: Product;
  onOrder?: (product: Product) => void;
  onPreview?: (product: Product) => void;
  onEdit?: (product: Product) => void;
  onDelete?: (productId: number) => void;
  onToggleEnabled?: (product: Product) => void;
  mode?: 'order' | 'admin';
  disabled?: boolean;
}

const TARGET_LABELS: Record<string, string> = {
  KITCHEN: 'Keuken',
  STAFF: 'Bediening',
  BOTH: 'Beide',
};

const ProductCard: React.FC<ProductCardProps> = ({ product, onOrder, onPreview, onEdit, onDelete, onToggleEnabled, mode = 'order', disabled = false }) => {
  if (mode === 'order' && onOrder) {
    const hasImage = Boolean(product.imageUrl);

    if (onPreview) {
      return (
        <article className="product-pick-card">
          <button
            className={`product-pick-preview-zone${hasImage ? ' product-pick-preview-zone--image' : ''}`}
            type="button"
            onClick={() => onPreview(product)}
            disabled={disabled}
          >
            {hasImage && (
              <>
                <span className="product-pick-media" aria-hidden="true" style={{ backgroundImage: `url(${product.imageUrl})` }} />
                <span className="product-pick-scrim" aria-hidden="true" />
              </>
            )}

            <span className="product-pick-content">
              <span className="product-pick-name">{product.name}</span>
              {product.description && <span className="product-pick-desc">{product.description}</span>}
            </span>
          </button>

          <div className="product-pick-action-bar">
            <span className="product-pick-price">&euro;{product.price.toFixed(2)}</span>
            <button className="product-pick-add-button" type="button" onClick={() => onOrder(product)} disabled={disabled}>
              Toevoegen
            </button>
          </div>
        </article>
      );
    }

    return (
      <button
        className={`product-pick-button${hasImage ? ' product-pick-button--image' : ''}`}
        type="button"
        onClick={() => onOrder(product)}
        disabled={disabled}
      >
        {hasImage && (
          <>
            <span className="product-pick-media" aria-hidden="true" style={{ backgroundImage: `url(${product.imageUrl})` }} />
            <span className="product-pick-scrim" aria-hidden="true" />
          </>
        )}

        <span className="product-pick-content">
          <span className="product-pick-name">{product.name}</span>
          {product.description && <span className="product-pick-desc">{product.description}</span>}
        </span>

        <span className="product-pick-footer">
          <span className="product-pick-price">&euro;{product.price.toFixed(2)}</span>
        </span>
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
            {product.stock > 0 ? `Voorraad: ${product.stock}` : 'Geen voorraad'}
          </span>
          <span className={`product-card-badge ${product.isEnabled ? 'product-card-badge--enabled' : 'product-card-badge--disabled'}`}>
            {product.isEnabled ? 'Ingeschakeld' : 'Uitgeschakeld'}
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
            {onEdit && <button className="btn-secondary" type="button" onClick={() => onEdit(product)}>Bewerken</button>}
            {onToggleEnabled && (
              <button className="btn-ghost" type="button" onClick={() => onToggleEnabled(product)}>
                {product.isEnabled ? 'Uitschakelen' : 'Inschakelen'}
              </button>
            )}
            {onDelete && <button className="btn-ghost" type="button" onClick={() => onDelete(product.id)}>Verwijderen</button>}
          </>
        )}
      </div>
    </div>
  );
};

export default ProductCard;