"use client";

import React from 'react';
import { useRouter } from 'next/navigation';

const AdminControls: React.FC = () => {
  const router = useRouter();

  const handleExportCSV = (period: 'daily' | 'weekly' | 'monthly') => {
    window.open(`/api/orders/export?period=${period}`, '_blank');
  };

  return (
    <div className="admin-controls">
      <div className="admin-controls-grid">
        <div className="admin-card" onClick={() => router.push('/admin/products')}>
          <h3>Productos</h3>
          <p>Gestiona el menú de productos</p>
        </div>
        <div className="admin-card" onClick={() => router.push('/admin/admins')}>
          <h3>Administradores</h3>
          <p>Gestiona cuentas de admin</p>
        </div>
        <div className="admin-card" onClick={() => router.push('/admin/products/create')}>
          <h3>Nuevo Producto</h3>
          <p>Añade un producto al menú</p>
        </div>
        <div className="admin-card" onClick={() => router.push('/admin/tables')}>
          <h3>Mesas</h3>
          <p>Configura interior y terraza</p>
        </div>
        <div className="admin-card admin-card--export">
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