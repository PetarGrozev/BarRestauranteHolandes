"use client";

import useOrders from '@/hooks/useOrders';
import OrderTile from '@/components/OrderTile';
import type { OrderStatus } from '@/types';
import { getStaffNextStatus, isStaffQueueOrder } from '@/lib/orderRouting';

const StaffPage = () => {
  const { orders, loading, updateStatus } = useOrders();

  const staffOrders = orders.filter(isStaffQueueOrder);

  const handleStatusUpdate = (orderId: number, newStatus: OrderStatus) => {
    updateStatus(orderId, newStatus);
  };

  return (
    <div className="staff-page">
      <h1>Sala</h1>
      <p className="page-subtitle">Pedidos listos para entregar</p>

      {loading ? (
        <p>Cargando...</p>
      ) : staffOrders.length === 0 ? (
        <p className="empty-state">No hay pedidos pendientes de entrega</p>
      ) : (
        <div className="orders-grid">
          {staffOrders.map(order => (
            <OrderTile
              key={order.id}
              order={order}
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