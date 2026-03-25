"use client";

import React from 'react';
import type { Order, OrderStatus, TableArea } from '../types';

interface OrderTileProps {
  order: Order;
  onStatusUpdate?: (orderId: number, newStatus: OrderStatus) => void;
  nextStatusOverride?: OrderStatus | null;
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  RECEIVED: 'Recibido',
  PREPARING: 'Preparando',
  READY: 'Listo',
  DELIVERED: 'Entregado',
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  RECEIVED: '#f59e0b',
  PREPARING: '#3b82f6',
  READY: '#10b981',
  DELIVERED: '#6b7280',
};

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  RECEIVED: 'PREPARING',
  PREPARING: 'READY',
  READY: 'DELIVERED',
};

const AREA_LABELS: Record<TableArea, string> = {
  INTERIOR: 'Interior',
  TERRACE: 'Terraza',
};

const OrderTile: React.FC<OrderTileProps> = ({ order, onStatusUpdate, nextStatusOverride }) => {
  const total = order.orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const nextStatus = nextStatusOverride ?? NEXT_STATUS[order.status] ?? null;

  return (
    <div className="order-tile">
      <div className="order-tile-header">
        <div>
          <h3>Pedido #{order.id}</h3>
          {order.table && (
            <p className="order-table-label">Mesa {order.table.number} · {AREA_LABELS[order.table.area]}</p>
          )}
        </div>
        <span
          className="order-status-badge"
          style={{ backgroundColor: STATUS_COLORS[order.status] }}
        >
          {STATUS_LABELS[order.status]}
        </span>
      </div>
      <ul className="order-tile-items">
        {order.orderItems.map((item) => (
          <li key={item.id}>
            {item.product?.name ?? `Producto #${item.productId}`} &times; {item.quantity}{' '}
            <span className="order-tile-price">&euro;{(item.price * item.quantity).toFixed(2)}</span>
          </li>
        ))}
      </ul>
      <div className="order-tile-footer">
        <strong>Total: &euro;{total.toFixed(2)}</strong>
        <span className="order-tile-time">
          {new Date(order.createdAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      {onStatusUpdate && nextStatus && (
        <button
          className="btn-primary order-tile-action"
          onClick={() => onStatusUpdate(order.id, nextStatus)}
        >
          Marcar como {STATUS_LABELS[nextStatus]}
        </button>
      )}
    </div>
  );
};

export default OrderTile;