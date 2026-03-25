"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Order, OrderStatus } from '../types';

const API_BASE = '/api/orders';
const POLL_INTERVAL = 5000;

const useOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch(API_BASE);
      if (!res.ok) return;
      const data = await res.json();
      setOrders(data);
    } catch {
      // silently fail on poll
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    intervalRef.current = setInterval(fetchOrders, POLL_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchOrders]);

  const createOrder = useCallback(async (tableId: number, items: { productId: number; quantity: number; price: number }[]) => {
    const res = await fetch(`${API_BASE}/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tableId, items }),
    });
    if (!res.ok) throw new Error('Failed to create order');
    const newOrder = await res.json();
    setOrders(prev => [newOrder, ...prev]);
    return newOrder;
  }, []);

  const updateStatus = useCallback(async (orderId: number, status: OrderStatus) => {
    const res = await fetch(`${API_BASE}/updateStatus`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, status }),
    });
    if (!res.ok) throw new Error('Failed to update order status');
    const updated = await res.json();
    setOrders(prev => prev.map(o => (o.id === orderId ? updated : o)));
    return updated;
  }, []);

  return {
    orders,
    loading,
    createOrder,
    updateStatus,
    refreshOrders: fetchOrders,
  };
};

export default useOrders;