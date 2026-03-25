"use client";

import useOrders from '@/hooks/useOrders';
import OrderTile from '@/components/OrderTile';
import type { OrderStatus } from '@/types';
import { getKitchenNextStatus, isKitchenQueueOrder } from '@/lib/orderRouting';

const KitchenPage = () => {
  const { orders, loading, updateStatus } = useOrders();

  const kitchenOrders = orders.filter(isKitchenQueueOrder);

  const handleStatusUpdate = (orderId: number, newStatus: OrderStatus) => {
    updateStatus(orderId, newStatus);
  };

  return (
    <div className="kitchen-page">
      <h1>Cocina</h1>
      <p className="page-subtitle">Pedidos en tiempo real — se actualiza automáticamente</p>

      {loading ? (
        <p>Cargando pedidos...</p>
      ) : kitchenOrders.length === 0 ? (
        <p className="empty-state">No hay pedidos pendientes</p>
      ) : (
        <div className="orders-grid">
          {kitchenOrders.map(order => (
            <OrderTile
              key={order.id}
              order={order}
              nextStatusOverride={getKitchenNextStatus(order)}
              onStatusUpdate={handleStatusUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default KitchenPage;