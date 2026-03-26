"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Order, OrderStatus } from '../types';

const API_BASE = '/api/orders';
const POLL_INTERVAL = 5000;

type UseOrdersOptions = {
  tableId?: number | null;
};

const useOrders = ({ tableId }: UseOrdersOptions = {}) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      const endpoint = tableId ? `${API_BASE}?tableId=${tableId}` : API_BASE;
      const res = await fetch(endpoint);
      if (!res.ok) return;
      const data = await res.json();
      setOrders(data);
    } catch {
      // silently fail on poll
    } finally {
      setLoading(false);
    }
  }, [tableId]);

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

  const deleteOrder = useCallback(async (orderId: number) => {
    const res = await fetch(`${API_BASE}/${orderId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete order');
    const payload = await res.json();
    setOrders(prev => prev.filter(order => order.id !== orderId));
    return payload.order as Order;
  }, []);

  return {
    orders,
    loading,
    createOrder,
    updateStatus,
    deleteOrder,
    refreshOrders: fetchOrders,
  };
};

export default useOrders;