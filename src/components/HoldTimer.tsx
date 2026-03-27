"use client";

import React from 'react';
import useHoldTimer from '@/hooks/useHoldTimer';
import { ORDER_ALERT_DELAY_SECONDS } from '@/lib/orderTimers';

type HoldTimerProps = {
  startedAt: string;
  isCompleted?: boolean;
};

const HoldTimer: React.FC<HoldTimerProps> = ({ startedAt, isCompleted = false }) => {
  const { formattedTime, isExpired } = useHoldTimer({
    startedAt,
    isCompleted,
    limitInSeconds: ORDER_ALERT_DELAY_SECONDS,
  });

  return (
    <div className={`order-delivery-timer${isExpired ? ' is-expired' : ''}`}>
      <span className="order-delivery-timer-label">Entrega estimada</span>
      <strong>{isCompleted ? 'Entregado' : formattedTime}</strong>
      {!isCompleted && isExpired && <span>Han pasado 10 min</span>}
    </div>
  );
};

export default HoldTimer;