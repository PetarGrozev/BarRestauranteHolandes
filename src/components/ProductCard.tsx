"use client";

import React from 'react';

interface ProductCardProps {
    product: {
        id: string;
        name: string;
        description: string;
        price: number;
        imageUrl?: string;
        status: 'available' | 'sold out';
    };
    onOrder: (productId: string) => void;
    onMarkSoldOut: (productId: string) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onOrder, onMarkSoldOut }) => {
    return (
        <div className="product-card">
            {product.imageUrl && <img src={product.imageUrl} alt={product.name} />}
            <h3>{product.name}</h3>
            <p>{product.description}</p>
            <p>Prijs: €{product.price.toFixed(2)}</p>
            <button onClick={() => onOrder(product.id)} disabled={product.status === 'sold out'}>
                Bestel
            </button>
            {product.status === 'available' && (
                <button onClick={() => onMarkSoldOut(product.id)}>Markeer als uitverkocht</button>
            )}
        </div>
    );
};

export default ProductCard;