const API_BASE = '/api/orders';

export const fetchOrders = async () => {
  const res = await fetch(API_BASE);
  if (!res.ok) throw new Error('Failed to fetch orders');
  return res.json();
};

export const updateOrderStatus = async (orderId, status) => {
  const res = await fetch(`${API_BASE}/updateStatus`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId, status }),
  });
  if (!res.ok) throw new Error('Failed to update order status');
  return res.json();
};
