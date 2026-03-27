"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import ConfirmDialog from '@/components/ConfirmDialog';
import type { Order } from '@/types';

const ORDER_ALERT_DELAY_MS = 10 * 60 * 1000;
const ADMIN_ALERT_POLL_MS = 1000;

function isInternalAlertRoute(pathname: string | null) {
  if (!pathname) {
    return false;
  }

  return (
    pathname.startsWith('/admin') ||
    pathname === '/tables' ||
    pathname === '/order' ||
    pathname === '/kitchen' ||
    pathname === '/staff'
  );
}

const AdminOrderAlerts = () => {
  const pathname = usePathname();
  const [orders, setOrders] = useState<Order[]>([]);
  const [alertQueue, setAlertQueue] = useState<number[]>([]);
  const notifiedOrderIdsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (!isInternalAlertRoute(pathname)) {
      return;
    }

    let cancelled = false;

    const fetchOrders = async () => {
      try {
        const response = await fetch('/api/orders');
        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as Order[];
        if (!cancelled) {
          setOrders(data);
        }
      } catch {
        // Best effort alerting only.
      }
    };

    fetchOrders();
    const intervalId = window.setInterval(fetchOrders, ADMIN_ALERT_POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [pathname]);

  const activeAlertOrder = useMemo(() => {
    const orderId = alertQueue[0];
    if (!orderId) {
      return null;
    }

    return orders.find(order => order.id === orderId && order.status !== 'DELIVERED') ?? null;
  }, [alertQueue, orders]);

  useEffect(() => {
    if (!isInternalAlertRoute(pathname)) {
      setAlertQueue([]);
      return;
    }

    setAlertQueue(prev => prev.filter(orderId => orders.some(order => order.id === orderId && order.status !== 'DELIVERED')));

    for (const order of orders) {
      if (order.status === 'DELIVERED') {
        continue;
      }

      const createdAt = new Date(order.createdAt).getTime();
      const isExpired = Date.now() - createdAt >= ORDER_ALERT_DELAY_MS;

      if (isExpired && !notifiedOrderIdsRef.current.has(order.id)) {
        console.log('[AdminOrderAlerts] Pedido vencido detectado', {
          orderId: order.id,
          status: order.status,
          tableId: order.tableId ?? null,
          createdAt: order.createdAt,
          elapsedMs: Date.now() - createdAt,
          thresholdMs: ORDER_ALERT_DELAY_MS,
        });
        notifiedOrderIdsRef.current.add(order.id);
        setAlertQueue(prev => [...prev, order.id]);
      }
    }
  }, [orders, pathname]);

  const dismissAlert = () => {
    setAlertQueue(prev => prev.slice(1));
  };

  if (!isInternalAlertRoute(pathname) || !activeAlertOrder) {
    return null;
  }

  const tableLabel = activeAlertOrder.table
    ? `Mesa ${activeAlertOrder.table.number} · ${activeAlertOrder.table.area === 'TERRACE' ? 'Terraza' : 'Interior'}`
    : 'Mesa no asignada';

  const statusLabel = activeAlertOrder.status === 'PREPARING'
    ? 'Sigue en preparación'
    : activeAlertOrder.status === 'READY'
      ? 'Está listo pero no entregado'
      : 'Sigue pendiente de entrega';

  return (
    <ConfirmDialog
      open={Boolean(activeAlertOrder)}
      title="Pedido sin entregar"
      message={`El pedido #${activeAlertOrder.id} ya ha superado los 10 minutos y todavía no está entregado.`}
      confirmLabel="Entendido"
      cancelLabel="Cerrar"
      confirmVariant="danger"
      onConfirm={dismissAlert}
      onCancel={dismissAlert}
    >
      <div className="confirm-dialog-summary">
        <strong>{tableLabel}</strong>
        <span>{statusLabel}</span>
      </div>
    </ConfirmDialog>
  );
};

export default AdminOrderAlerts;