"use client";

import React from 'react';

interface OrderTileProps {
    orderId: string;
    items: Array<{
        name: string;
        quantity: number;
        price: number;
    }>;
    totalPrice: number;
    status: string;
    onStatusUpdate: (newStatus: string) => void;
}

const OrderTile: React.FC<OrderTileProps> = ({ orderId, items, totalPrice, status, onStatusUpdate }) => {
    return (
        <div className="order-tile">
            <h3>Order ID: {orderId}</h3>
            <ul>
                {items.map((item, index) => (
                    <li key={index}>
                        {item.name} - {item.quantity} x €{item.price.toFixed(2)}
                    </li>
                ))}
            </ul>
            <h4>Total: €{totalPrice.toFixed(2)}</h4>
            <p>Status: {status}</p>
            <button onClick={() => onStatusUpdate('preparing')}>Mark as Preparing</button>
            <button onClick={() => onStatusUpdate('ready')}>Mark as Ready</button>
        </div>
    );
};

export default OrderTile;