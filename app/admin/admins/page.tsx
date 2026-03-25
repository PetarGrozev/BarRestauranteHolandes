"use client";

import React, { useEffect, useState } from 'react';
import type { Admin } from '@/types';

const AdminsPage = () => {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchAdmins = async () => {
    try {
      const res = await fetch('/api/admin/addAdmin', { method: 'GET' });
      // Note: the addAdmin route only handles POST. We'll fetch from a list approach.
      // For now, no dedicated list endpoint exists, so we skip.
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    setLoading(false);
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    try {
      const res = await fetch('/api/admin/addAdmin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error('Failed');
      const newAdmin = await res.json();
      setAdmins(prev => [...prev, newAdmin]);
      setEmail('');
    } catch {
      alert('Error al añadir administrador');
    }
  };

  const handleRemove = async (adminId: number) => {
    try {
      const res = await fetch('/api/admin/removeAdmin', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId }),
      });
      if (!res.ok) throw new Error('Failed');
      setAdmins(prev => prev.filter(a => a.id !== adminId));
    } catch {
      alert('Error al eliminar administrador');
    }
  };

  return (
    <div className="admins-page">
      <h1>Administradores</h1>

      <form className="admin-form" onSubmit={handleAdd}>
        <input
          type="email"
          placeholder="Email del nuevo admin"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <button className="btn-primary" type="submit">Añadir Admin</button>
      </form>

      {admins.length > 0 && (
        <ul className="admin-list">
          {admins.map(admin => (
            <li key={admin.id} className="admin-list-item">
              <span>{admin.email}</span>
              <button className="btn-ghost" onClick={() => handleRemove(admin.id)}>Eliminar</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AdminsPage;