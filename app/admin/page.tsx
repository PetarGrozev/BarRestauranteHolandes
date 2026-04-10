"use client";

import AdminControls from '@/components/AdminControls';

const AdminPage = () => {
  return (
    <div className="admin-page">
      <h1>Beheerpaneel</h1>
      <p className="page-subtitle">Beheer je zaak</p>
      <AdminControls />
    </div>
  );
};

export default AdminPage;