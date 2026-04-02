"use client";

import { useMemo } from 'react';
import useOrders from '@/hooks/useOrders';
import OrderTile from '@/components/OrderTile';
import type { OrderStatus } from '@/types';
import { getKitchenNextStatus, isKitchenQueueOrder } from '@/lib/orderRouting';

const KitchenPage = () => {
  const { orders, loading, updateStatus } = useOrders();

  const kitchenOrders = orders.filter(isKitchenQueueOrder);
  const preparingCount = useMemo(() => kitchenOrders.filter(order => order.status === 'PREPARING').length, [kitchenOrders]);
  const receivedCount = useMemo(() => kitchenOrders.filter(order => order.status === 'RECEIVED').length, [kitchenOrders]);

  const handleStatusUpdate = (orderId: number, newStatus: OrderStatus) => {
    updateStatus(orderId, newStatus);
  };

  return (
    <div className="ops-page ops-page--kitchen">
      <div className="ops-page-hero">
        <div>
          <h1>COCINA</h1>
        </div>
        <div className="ops-metrics-grid">
          <div className="ops-metric-card">
            <strong>{kitchenOrders.length}</strong>
            <span>Pedidos en cola</span>
          </div>
          <div className="ops-metric-card">
            <strong>{receivedCount}</strong>
            <span>Recibidos</span>
          </div>
          <div className="ops-metric-card">
            <strong>{preparingCount}</strong>
            <span>Preparando</span>
          </div>
        </div>
      </div>

      {loading ? (
        <p>Cargando pedidos...</p>
      ) : kitchenOrders.length === 0 ? (
        <div className="empty-state ops-empty-state">
          <strong>La cocina está al día.</strong>
          <p>No hay pedidos pendientes para preparar ahora mismo.</p>
        </div>
      ) : (
        <div className="orders-grid">
          {kitchenOrders.map(order => (
            <OrderTile
              key={order.id}
              order={order}
              variant="kitchen"
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