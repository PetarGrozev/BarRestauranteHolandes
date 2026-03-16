"use client";

import { useEffect, useState } from 'react';
import { fetchOrders, updateOrderStatus } from '../lib/realtime';
import LiveNotifications from '@/components/LiveNotifications';

const KitchenPage = () => {
    const [orders, setOrders] = useState([]);

    useEffect(() => {
        const getOrders = async () => {
            const fetchedOrders = await fetchOrders();
            setOrders(fetchedOrders);
        };

        getOrders();
    }, []);

    const handleStatusUpdate = async (orderId, status) => {
        await updateOrderStatus(orderId, status);
        setOrders(prevOrders => 
            prevOrders.map(order => 
                order.id === orderId ? { ...order, status } : order
            )
        );
    };

    return (
        <div>
            <h1>Kitchen Orders</h1>
            <LiveNotifications />
            <ul>
                {orders.map(order => (
                    <li key={order.id}>
                        <span>{order.productName} - {order.status}</span>
                        <button onClick={() => handleStatusUpdate(order.id, 'preparing')}>Preparing</button>
                        <button onClick={() => handleStatusUpdate(order.id, 'ready')}>Ready</button>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default KitchenPage;