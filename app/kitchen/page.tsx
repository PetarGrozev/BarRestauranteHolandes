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
          <h1>KEUKEN</h1>
        </div>
        <div className="ops-metrics-grid">
          <div className="ops-metric-card">
            <strong>{kitchenOrders.length}</strong>
            <span>Bestellingen in wachtrij</span>
          </div>
          <div className="ops-metric-card">
            <strong>{receivedCount}</strong>
            <span>Ontvangen</span>
          </div>
          <div className="ops-metric-card">
            <strong>{preparingCount}</strong>
            <span>In bereiding</span>
          </div>
        </div>
      </div>

      {loading ? (
        <p>Bestellingen laden...</p>
      ) : kitchenOrders.length === 0 ? (
        <div className="empty-state ops-empty-state">
          <strong>De keuken is bijgewerkt.</strong>
          <p>Er zijn op dit moment geen bestellingen om te bereiden.</p>
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