"use client";

import { useEffect } from 'react';

export type AppToastVariant = 'info' | 'success' | 'error';

export type AppToastItem = {
  id: string;
  message: string;
  title?: string;
  variant?: AppToastVariant;
  duration?: number;
};

type AppToastRowProps = {
  toast: AppToastItem;
  onClose: (id: string) => void;
};

const TOAST_ICONS: Record<AppToastVariant, string> = {
  info: 'i',
  success: 'OK',
  error: '!',
};

const AppToastRow = ({ toast, onClose }: AppToastRowProps) => {
  const variant = toast.variant ?? 'info';

  useEffect(() => {
    const timeout = window.setTimeout(() => onClose(toast.id), toast.duration ?? 3200);
    return () => window.clearTimeout(timeout);
  }, [onClose, toast.duration, toast.id]);

  return (
    <div className={`app-toast app-toast--${variant}`} role="status" aria-live="polite" aria-atomic="true">
      <div className={`app-toast-icon app-toast-icon--${variant}`} aria-hidden="true">
        {TOAST_ICONS[variant]}
      </div>
      <div className="app-toast-content">
        {toast.title ? <strong>{toast.title}</strong> : null}
        <span>{toast.message}</span>
      </div>
      <button className="app-toast-close" type="button" onClick={() => onClose(toast.id)} aria-label="Cerrar aviso">
        ×
      </button>
    </div>
  );
};

type AppToastStackProps = {
  toasts: AppToastItem[];
  onClose: (id: string) => void;
};

const AppToastStack = ({ toasts, onClose }: AppToastStackProps) => {
  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="app-toast-layer">
      {toasts.map(toast => (
        <AppToastRow key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>
  );
};

export default AppToastStack;