"use client";

import React from 'react';
import useHoldTimer from '@/hooks/useHoldTimer';

type HoldTimerProps = {
  startedAt: string;
  isCompleted?: boolean;
};

const HoldTimer: React.FC<HoldTimerProps> = ({ startedAt, isCompleted = false }) => {
  const { formattedTime, isExpired } = useHoldTimer({
    startedAt,
    isCompleted,
    limitInSeconds: 600,
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