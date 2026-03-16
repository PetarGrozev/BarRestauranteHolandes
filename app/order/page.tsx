"use client";

import { useState } from 'react';
import useOrders from '@/hooks/useOrders';
import OrderTile from '@/components/OrderTile';
import LiveNotifications from '@/components/LiveNotifications';

const OrderPage = () => {
    const { orders, createOrder } = useOrders();
    const [selectedItems, setSelectedItems] = useState([]);

    const handleOrderSubmit = () => {
        createOrder(selectedItems);
        setSelectedItems([]);
    };

    return (
        <div>
            <h1>Bestellingen</h1>
            <LiveNotifications />
            <div>
                {orders.map(order => (
                    <OrderTile key={order.id} order={order} />
                ))}
            </div>
            <button onClick={handleOrderSubmit}>Plaats Bestelling</button>
        </div>
    );
};

export default OrderPage;