import type { Order, OrderStatus, OrderTarget } from '../types';

function orderTargets(order: Order) {
  return new Set(order.orderItems.map(item => item.product.orderTarget));
}

function hasAnyTarget(order: Order, targets: OrderTarget[]) {
  const activeTargets = orderTargets(order);
  return targets.some(target => activeTargets.has(target));
}

export function needsKitchen(order: Order) {
  return hasAnyTarget(order, ['KITCHEN', 'BOTH']);
}

export function needsStaff(order: Order) {
  return hasAnyTarget(order, ['STAFF', 'BOTH']);
}

export function getKitchenNextStatus(order: Order): OrderStatus | null {
  if (!needsKitchen(order)) {
    return null;
  }

  const requiresStaffHandoff = needsStaff(order);

  if (order.status === 'RECEIVED') {
    return 'PREPARING';
  }

  if (order.status === 'PREPARING') {
    return requiresStaffHandoff ? 'READY' : 'DELIVERED';
  }

  if (order.status === 'READY' && !requiresStaffHandoff) {
    return 'DELIVERED';
  }

  return null;
}

export function getStaffNextStatus(order: Order): OrderStatus | null {
  if (!needsStaff(order)) {
    return null;
  }

  if (!needsKitchen(order) && order.status === 'RECEIVED') {
    return 'READY';
  }

  if (order.status === 'READY') {
    return 'DELIVERED';
  }

  return null;
}

export function isKitchenQueueOrder(order: Order) {
  const nextStatus = getKitchenNextStatus(order);
  return nextStatus !== null;
}

export function isStaffQueueOrder(order: Order) {
  const nextStatus = getStaffNextStatus(order);
  return nextStatus !== null;
}