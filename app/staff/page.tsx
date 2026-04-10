"use client";

import { useMemo } from 'react';
import useOrders from '@/hooks/useOrders';
import OrderTile from '@/components/OrderTile';
import type { OrderStatus } from '@/types';
import { getStaffNextStatus, isStaffQueueOrder } from '@/lib/orderRouting';

const StaffPage = () => {
  const { orders, loading, updateStatus } = useOrders();

  const staffOrders = orders.filter(isStaffQueueOrder);
  const readyCount = useMemo(() => staffOrders.filter(order => order.status === 'READY').length, [staffOrders]);
  const deliveredCount = useMemo(() => staffOrders.filter(order => order.status === 'DELIVERED').length, [staffOrders]);

  const handleStatusUpdate = (orderId: number, newStatus: OrderStatus) => {
    updateStatus(orderId, newStatus);
  };

  return (
    <div className="ops-page ops-page--staff">
      <div className="ops-page-hero">
        <div>
          <h1>BEDIENING</h1>
        </div>
        <div className="ops-metrics-grid">
          <div className="ops-metric-card">
            <strong>{staffOrders.length}</strong>
            <span>Zichtbare bestellingen</span>
          </div>
          <div className="ops-metric-card">
            <strong>{readyCount}</strong>
            <span>Klaar om uit te serveren</span>
          </div>
          <div className="ops-metric-card">
            <strong>{deliveredCount}</strong>
            <span>Geleverd</span>
          </div>
        </div>
      </div>

      {loading ? (
        <p>Laden...</p>
      ) : staffOrders.length === 0 ? (
        <div className="empty-state ops-empty-state">
          <strong>Er zijn geen leveringen in behandeling.</strong>
          <p>Zodra de keuken een bestelling als klaar markeert, verschijnt die hier automatisch.</p>
        </div>
      ) : (
        <div className="orders-grid">
          {staffOrders.map(order => (
            <OrderTile
              key={order.id}
              order={order}
              variant="staff"
              nextStatusOverride={getStaffNextStatus(order)}
              onStatusUpdate={handleStatusUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default StaffPage;