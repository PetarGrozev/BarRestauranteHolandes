"use client";

import React, { useEffect, useState } from 'react';
import useOrders from '../hooks/useOrders';

const LiveNotifications: React.FC = () => {
    const { orders } = useOrders();
    const [notifications, setNotifications] = useState<string[]>([]);

    useEffect(() => {
        if (orders.length > 0) {
            const newNotifications = orders.map(order => `New order: ${order.id} - ${order.items.join(', ')}`);
            setNotifications(prev => [...prev, ...newNotifications]);
        }
    }, [orders]);

    return (
        <div className="live-notifications">
            <h2>Live Notifications</h2>
            <ul>
                {notifications.map((notification, index) => (
                    <li key={index}>{notification}</li>
                ))}
            </ul>
        </div>
    );
};

export default LiveNotifications;