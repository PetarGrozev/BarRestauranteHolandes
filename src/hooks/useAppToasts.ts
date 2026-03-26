"use client";

import { useCallback, useState } from 'react';
import type { AppToastItem, AppToastVariant } from '@/components/AppToast';

type PushToastInput = {
  message: string;
  title?: string;
  variant?: AppToastVariant;
  duration?: number;
};

const createToastId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const useAppToasts = () => {
  const [toasts, setToasts] = useState<AppToastItem[]>([]);

  const pushToast = useCallback((toast: PushToastInput) => {
    const nextToast: AppToastItem = {
      id: createToastId(),
      ...toast,
    };

    setToasts(prev => [...prev, nextToast]);
    return nextToast.id;
  }, []);

  const removeToast = useCallback((toastId: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== toastId));
  }, []);

  return {
    toasts,
    pushToast,
    removeToast,
  };
};

export default useAppToasts;