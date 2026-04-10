"use client";

import React, { useEffect, useRef, useState } from 'react';
import useOrders from '../hooks/useOrders';
import type { Order } from '../types';

const LiveNotifications: React.FC = () => {
  const { orders } = useOrders();
  const [notifications, setNotifications] = useState<string[]>([]);
  const prevCountRef = useRef(0);

  useEffect(() => {
    if (orders.length > prevCountRef.current) {
      const newOrders = orders.slice(0, orders.length - prevCountRef.current);
      const msgs = newOrders.map((order: Order) => {
        const items = order.orderItems
          .map(i => `${i.product?.name ?? 'Product'} x${i.quantity}`)
          .join(', ');
        return `Nieuwe bestelling #${order.id}: ${items}`;
      });
      setNotifications(prev => [...msgs, ...prev].slice(0, 10));
    }
    prevCountRef.current = orders.length;
  }, [orders]);

  if (notifications.length === 0) return null;

  return (
    <div className="live-notifications">
      <h3>Meldingen</h3>
      <ul>
        {notifications.map((msg, i) => (
          <li key={i}>{msg}</li>
        ))}
      </ul>
    </div>
  );
};

export default LiveNotifications;