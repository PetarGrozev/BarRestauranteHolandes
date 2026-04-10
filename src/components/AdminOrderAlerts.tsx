"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import ConfirmDialog from '@/components/ConfirmDialog';
import { ORDER_ALERT_DELAY_MS } from '@/lib/orderTimers';
import type { Order } from '@/types';

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
  const hasPrimedCurrentRouteRef = useRef(false);
  const hasFetchedCurrentRouteRef = useRef(false);

  useEffect(() => {
    if (!isInternalAlertRoute(pathname)) {
      return;
    }

    hasPrimedCurrentRouteRef.current = false;
    hasFetchedCurrentRouteRef.current = false;
    setOrders([]);

    let cancelled = false;

    const fetchOrders = async () => {
      try {
        const response = await fetch('/api/orders');
        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as Order[];
        if (!cancelled) {
          hasFetchedCurrentRouteRef.current = true;
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
      notifiedOrderIdsRef.current.clear();
      hasPrimedCurrentRouteRef.current = false;
      hasFetchedCurrentRouteRef.current = false;
      setAlertQueue([]);
      return;
    }

    if (!hasFetchedCurrentRouteRef.current) {
      return;
    }

    const activeOrderIds = new Set(orders.filter(order => order.status !== 'DELIVERED').map(order => order.id));
    notifiedOrderIdsRef.current = new Set(
      Array.from(notifiedOrderIdsRef.current).filter(orderId => activeOrderIds.has(orderId)),
    );

    setAlertQueue(prev => prev.filter(orderId => orders.some(order => order.id === orderId && order.status !== 'DELIVERED')));

    if (!hasPrimedCurrentRouteRef.current) {
      const expiredOrderIds = orders
        .filter(order => order.status !== 'DELIVERED')
        .filter(order => Date.now() - new Date(order.createdAt).getTime() >= ORDER_ALERT_DELAY_MS)
        .map(order => order.id);

      notifiedOrderIdsRef.current = new Set([
        ...Array.from(notifiedOrderIdsRef.current),
        ...expiredOrderIds,
      ]);
      hasPrimedCurrentRouteRef.current = true;
      return;
    }

    for (const order of orders) {
      if (order.status === 'DELIVERED') {
        continue;
      }

      const createdAt = new Date(order.createdAt).getTime();
      const isExpired = Date.now() - createdAt >= ORDER_ALERT_DELAY_MS;

      if (isExpired && !notifiedOrderIdsRef.current.has(order.id)) {
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
    ? `Tafel ${activeAlertOrder.table.number} · ${activeAlertOrder.table.area === 'TERRACE' ? 'Terras' : 'Binnen'}`
    : 'Geen tafel toegewezen';

  const statusLabel = activeAlertOrder.status === 'PREPARING'
    ? 'Nog in bereiding'
    : activeAlertOrder.status === 'READY'
      ? 'Klaar maar nog niet geleverd'
      : 'Nog in afwachting van levering';

  return (
    <ConfirmDialog
      open={Boolean(activeAlertOrder)}
      title="Bestelling nog niet geleverd"
      message={`Bestelling #${activeAlertOrder.id} is al langer dan 10 minuten open en nog niet geleverd.`}
      confirmLabel="Begrepen"
      cancelLabel="Sluiten"
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