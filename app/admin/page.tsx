"use client";

import AdminControls from '@/components/AdminControls';

const AdminPage = () => {
  return (
    <div className="admin-page">
      <h1>Panel de Administración</h1>
      <p className="page-subtitle">Gestiona tu negocio</p>
      <AdminControls />
    </div>
  );
};

export default AdminPage;