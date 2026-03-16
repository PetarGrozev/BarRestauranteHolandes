"use client";

import { useEffect, useState } from 'react';

const API_BASE = '/api/orders';

const fetchOrders = async () => {
  const res = await fetch(API_BASE);
  if (!res.ok) throw new Error('Failed to fetch orders');
  return res.json();
};

const updateOrderStatus = async (orderId, status) => {
  const res = await fetch(`${API_BASE}/updateStatus`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId, status }),
  });
  if (!res.ok) throw new Error('Failed to update order status');
  return res.json();
};

const createOrder = async (items) => {
  const res = await fetch(`${API_BASE}/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });
  if (!res.ok) throw new Error('Failed to create order');
  return res.json();
};

const useOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOrders = async () => {
      setLoading(true);
      const fetchedOrders = await fetchOrders();
      setOrders(fetchedOrders);
      setLoading(false);
    };

    loadOrders();
  }, []);

  const refreshOrders = async () => {
    const updated = await fetchOrders();
    setOrders(updated);
    return updated;
  };

  const markOrderAsReady = async (orderId) => {
    await updateOrderStatus(orderId, 'ready');
    await refreshOrders();
  };

  const createOrderAndRefresh = async (items) => {
    await createOrder(items);
    await refreshOrders();
  };

  return {
    orders,
    loading,
    markOrderAsReady,
    createOrder: createOrderAndRefresh,
  };
};

export default useOrders;