"use client";

import React from 'react';
import { useRouter } from 'next/navigation';

type AdminCardAccent = 'products' | 'admins' | 'create' | 'tables' | 'menus' | 'export';

function AdminCardIcon({ accent }: { accent: AdminCardAccent }) {
  if (accent === 'admins') {
    return (
      <svg aria-hidden="true" className="admin-card-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
        <circle cx="9.5" cy="7" r="3" />
        <path d="M20 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 4.13a4 4 0 0 1 0 7.75" />
      </svg>
    );
  }

  if (accent === 'create') {
    return (
      <svg aria-hidden="true" className="admin-card-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5v14" />
        <path d="M5 12h14" />
        <rect x="4" y="4" width="16" height="16" rx="3" />
      </svg>
    );
  }

  if (accent === 'tables') {
    return (
      <svg aria-hidden="true" className="admin-card-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="6" width="16" height="8" rx="2" />
        <path d="M8 14v4" />
        <path d="M16 14v4" />
        <path d="M6 18h12" />
      </svg>
    );
  }

  if (accent === 'menus') {
    return (
      <svg aria-hidden="true" className="admin-card-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 6h14" />
        <path d="M5 10h14" />
        <path d="M5 14h8" />
        <path d="M16 14h3" />
        <path d="M16 18h3" />
        <path d="M5 18h8" />
      </svg>
    );
  }

  if (accent === 'export') {
    return (
      <svg aria-hidden="true" className="admin-card-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3v12" />
        <path d="m7 10 5 5 5-5" />
        <path d="M5 21h14" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" className="admin-card-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 7h14" />
      <path d="M5 12h14" />
      <path d="M5 17h10" />
      <rect x="3" y="4" width="18" height="16" rx="3" />
    </svg>
  );
}

function ActionChevron() {
  return (
    <svg aria-hidden="true" className="admin-card-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

const AdminControls: React.FC = () => {
  const router = useRouter();

  const adminCards = [
    {
      title: 'Productos',
      description: 'Gestiona el menú de productos',
      href: '/admin/products',
      accent: 'products' as const,
    },
    {
      title: 'Administradores',
      description: 'Gestiona cuentas de admin',
      href: '/admin/admins',
      accent: 'admins' as const,
    },
    {
      title: 'Nuevo Producto',
      description: 'Añade un producto al menú',
      href: '/admin/products/create',
      accent: 'create' as const,
    },
    {
      title: 'Mesas',
      description: 'Configura interior y terraza',
      href: '/admin/tables',
      accent: 'tables' as const,
    },
    {
      title: 'Menus',
      description: 'Crea menus con opciones por entrante, principal, postre o bebida',
      href: '/admin/menus',
      accent: 'menus' as const,
    },
  ];

  const handleExportCSV = (period: 'daily' | 'weekly' | 'monthly') => {
    window.open(`/api/orders/export?period=${period}`, '_blank');
  };

  return (
    <div className="admin-controls">
      <div className="admin-controls-grid">
        {adminCards.map(card => (
          <button
            key={card.href}
            className={`admin-card admin-card--${card.accent}`}
            type="button"
            onClick={() => router.push(card.href)}
          >
            <div className="admin-card-topline">
              <span className="admin-card-icon" aria-hidden="true">
                <AdminCardIcon accent={card.accent} />
              </span>
            </div>
            <div className="admin-card-copy">
              <h3>{card.title}</h3>
              <p>{card.description}</p>
            </div>
            <div className="admin-card-footer">
              <span className="admin-card-accent-bar" aria-hidden="true" />
              <ActionChevron />
            </div>
          </button>
        ))}
        <div className="admin-card admin-card--export admin-card--export-panel">
          <div className="admin-card-topline">
            <span className="admin-card-icon" aria-hidden="true">
              <AdminCardIcon accent="export" />
            </span>
          </div>
          <div className="admin-card-copy">
            <h3>Exportar CSV</h3>
            <p>Descarga ventas agrupadas por producto en diario, semanal o mensual.</p>
          </div>
          <div className="admin-export-actions">
            <button className="btn-secondary" type="button" onClick={() => handleExportCSV('daily')}>
              Diario
            </button>
            <button className="btn-secondary" type="button" onClick={() => handleExportCSV('weekly')}>
              Semanal
            </button>
            <button className="btn-secondary" type="button" onClick={() => handleExportCSV('monthly')}>
              Mensual
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminControls;