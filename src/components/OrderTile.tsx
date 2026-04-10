"use client";

import React from 'react';
import HoldTimer from './HoldTimer';
import type { Order, OrderStatus, TableArea } from '../types';

interface OrderTileProps {
  order: Order;
  onStatusUpdate?: (orderId: number, newStatus: OrderStatus) => void;
  nextStatusOverride?: OrderStatus | null;
  onDeleteRequest?: (order: Order) => void;
  showDeliveryTimer?: boolean;
  variant?: 'default' | 'kitchen' | 'staff';
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  RECEIVED: 'Ontvangen',
  PREPARING: 'In bereiding',
  READY: 'Klaar',
  DELIVERED: 'Bezorgd',
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
  INTERIOR: 'Binnen',
  TERRACE: 'Terras',
};

const OrderTile: React.FC<OrderTileProps> = ({ order, onStatusUpdate, nextStatusOverride, onDeleteRequest, showDeliveryTimer = false, variant = 'default' }) => {
  const total = order.orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemCount = order.orderItems.reduce((sum, item) => sum + item.quantity, 0);
  const nextStatus = nextStatusOverride ?? NEXT_STATUS[order.status] ?? null;
  const isKitchenVariant = variant === 'kitchen';
  const createdAtLabel = new Date(order.createdAt).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`order-tile order-tile--${variant}`}>
      <div className="order-tile-header">
        <div className="order-tile-heading">
          <h3>Bestelling #{order.id}</h3>
          {order.table && (
            <p className="order-table-label">Tafel {order.table.number} · {AREA_LABELS[order.table.area]}</p>
          )}
        </div>
        {isKitchenVariant ? (
          <div className="order-tile-kitchen-meta">
            <span className="order-tile-time order-tile-time--kitchen-meta">
              {createdAtLabel}
            </span>
            <span
              className="order-status-badge order-status-badge--kitchen"
              style={{ backgroundColor: STATUS_COLORS[order.status] }}
            >
              {STATUS_LABELS[order.status]}
            </span>
          </div>
        ) : (
          <div className="order-tile-meta">
            <span className="order-tile-time order-tile-time--meta">{createdAtLabel}</span>
            <span
              className="order-status-badge"
              style={{ backgroundColor: STATUS_COLORS[order.status] }}
            >
              {STATUS_LABELS[order.status]}
            </span>
          </div>
        )}
      </div>
      <ul className="order-tile-items">
        {order.orderItems.map((item) => (
          <li key={item.id} className={isKitchenVariant ? 'order-tile-item order-tile-item--kitchen' : 'order-tile-item'}>
            <div className="order-tile-item-row">
              {isKitchenVariant ? (
                <>
                  <span className="order-tile-quantity">{item.quantity}</span>
                  <span className="order-tile-item-name">{item.product?.name ?? `Product #${item.productId}`}</span>
                </>
              ) : (
                <div className="order-tile-item-copy">
                  <span className="order-tile-item-name-inline">{item.product?.name ?? `Product #${item.productId}`}</span>
                  <span className="order-tile-item-quantity-inline">x{item.quantity}</span>
                </div>
              )}
              {!isKitchenVariant && <span className="order-tile-price">&euro;{(item.price * item.quantity).toFixed(2)}</span>}
            </div>
            {item.note && <p className="order-tile-note">{isKitchenVariant ? item.note : `Opmerking: ${item.note}`}</p>}
          </li>
        ))}
      </ul>
      <div className={`order-tile-footer${isKitchenVariant ? ' order-tile-footer--kitchen' : ''}`}>
        <strong>{isKitchenVariant ? `${itemCount} ${itemCount === 1 ? 'artikel' : 'artikelen'}` : `Totaal: ${total.toFixed(2)}`}</strong>
        {!isKitchenVariant && (
          <span className="order-tile-footer-meta">{itemCount} {itemCount === 1 ? 'artikel' : 'artikelen'}</span>
        )}
      </div>
      {showDeliveryTimer && (
        <HoldTimer startedAt={order.createdAt} isCompleted={order.status === 'DELIVERED'} />
      )}
      {onStatusUpdate && nextStatus && (
        <button
          className="btn-primary order-tile-action"
          onClick={() => onStatusUpdate(order.id, nextStatus)}
        >
          Markeren als {STATUS_LABELS[nextStatus]}
        </button>
      )}
      {onDeleteRequest && (
        <button
          className="btn-ghost order-tile-action order-tile-action--danger"
          onClick={() => onDeleteRequest(order)}
        >
          Bestelling verwijderen
        </button>
      )}
    </div>
  );
};

export default OrderTile;