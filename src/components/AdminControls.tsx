"use client";

import React from 'react';
import { useRouter } from 'next/navigation';

const AdminControls: React.FC = () => {
  const router = useRouter();

  const handleExportCSV = async () => {
    window.open('/api/orders/export', '_blank');
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
        <div className="admin-card" onClick={handleExportCSV}>
          <h3>Exportar CSV</h3>
          <p>Descarga los pedidos en CSV</p>
        </div>
      </div>
    </div>
  );
};

export default AdminControls;