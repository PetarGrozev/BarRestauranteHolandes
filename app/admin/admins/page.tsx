"use client";

import React, { useEffect, useState } from 'react';
import AppToastStack from '@/components/AppToast';
import useAppToasts from '@/hooks/useAppToasts';
import type { Admin } from '@/types';

function formatAdminDate(value: string) {
  return new Date(value).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

const AdminsPage = () => {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [removingAdminId, setRemovingAdminId] = useState<number | null>(null);
  const [resettingAdminId, setResettingAdminId] = useState<number | null>(null);
  const { toasts, pushToast, removeToast } = useAppToasts();

  const fetchAdmins = async () => {
    try {
      const res = await fetch('/api/admin/addAdmin', { method: 'GET' });
      if (!res.ok) {
        throw new Error('Failed');
      }

      const data = (await res.json()) as Admin[];
      setAdmins(data);
    } catch {
      pushToast({ message: 'No se pudo cargar la lista de administradores.', title: 'Administradores', variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins().catch(() => {});
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim() || !confirmPassword.trim()) return;

    if (password !== confirmPassword) {
      pushToast({ message: 'Las contraseñas no coinciden.', title: 'Administradores', variant: 'error' });
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/admin/addAdmin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.message ?? 'Failed');
      }

      const newAdmin = await res.json();
      setAdmins(prev => [...prev, newAdmin].sort((left, right) => left.email.localeCompare(right.email)));
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      pushToast({ message: 'Administrador añadido correctamente.', title: 'Administradores', variant: 'success' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al añadir administrador.';
      pushToast({ message, title: 'Administradores', variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (adminId: number, adminEmail: string) => {
    const nextPassword = window.prompt(`Nueva contraseña para ${adminEmail}`, '');

    if (nextPassword === null) {
      return;
    }

    if (!nextPassword.trim()) {
      pushToast({ message: 'La contraseña no puede estar vacía.', title: 'Administradores', variant: 'error' });
      return;
    }

    setResettingAdminId(adminId);

    try {
      const res = await fetch('/api/admin/addAdmin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId, password: nextPassword }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.message ?? 'Failed');
      }

      pushToast({ message: `Contraseña actualizada para ${adminEmail}.`, title: 'Administradores', variant: 'success' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al actualizar contraseña.';
      pushToast({ message, title: 'Administradores', variant: 'error' });
    } finally {
      setResettingAdminId(null);
    }
  };

  const handleRemove = async (adminId: number) => {
    setRemovingAdminId(adminId);

    try {
      const res = await fetch('/api/admin/removeAdmin', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.message ?? 'Failed');
      }

      setAdmins(prev => prev.filter(a => a.id !== adminId));
      pushToast({ message: 'Administrador eliminado correctamente.', title: 'Administradores', variant: 'success' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al eliminar administrador.';
      pushToast({ message, title: 'Administradores', variant: 'error' });
    } finally {
      setRemovingAdminId(null);
    }
  };

  return (
    <div className="admins-page">
      <div className="admins-page-hero">
        <div>
          <h1>ADMINISTRADORES</h1>
          <p className="page-subtitle">Gestiona los accesos internos del sistema desde un único panel.</p>
        </div>
        <div className="admins-page-stat">
          <strong>{admins.length}</strong>
          <span>Accesos activos</span>
        </div>
      </div>

      <div className="admins-layout">
        <section className="admins-panel admins-panel--form">
          <div className="admins-panel-copy">
            <h2>Añadir administrador</h2>
            <p>Introduce el correo y una contraseña propia para ese usuario.</p>
          </div>

          <form className="admin-form" onSubmit={handleAdd}>
            <label className="admins-field">
              <span>Email</span>
              <input
                type="email"
                placeholder="admin@local.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </label>
            <label className="admins-field">
              <span>Contraseña</span>
              <input
                type="password"
                placeholder="Minimo 8 caracteres"
                value={password}
                onChange={e => setPassword(e.target.value)}
                minLength={8}
                required
              />
            </label>
            <label className="admins-field">
              <span>Confirmar contraseña</span>
              <input
                type="password"
                placeholder="Repite la contraseña"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                minLength={8}
                required
              />
            </label>
            <button className="btn-primary" type="submit" disabled={submitting}>
              {submitting ? 'Añadiendo...' : 'Añadir Admin'}
            </button>
          </form>
        </section>

        <section className="admins-panel admins-panel--list">
          <div className="admins-panel-copy admins-panel-copy--list">
            <h2>Accesos autorizados</h2>
            <p>Revisa quién puede entrar al área de administración y elimina accesos cuando haga falta.</p>
          </div>

          {loading ? (
            <p>Cargando administradores...</p>
          ) : admins.length > 0 ? (
            <ul className="admin-list">
              {admins.map(admin => (
                <li key={admin.id} className="admin-list-item">
                  <div className="admin-list-identity">
                    <span className="admin-list-avatar" aria-hidden="true">{admin.email.slice(0, 1).toUpperCase()}</span>
                    <div className="admin-list-copy">
                      <strong>{admin.email}</strong>
                      <span>Alta: {formatAdminDate(admin.createdAt)}</span>
                    </div>
                  </div>
                  <div className="admin-list-actions">
                    <button className="btn-secondary" type="button" onClick={() => handleResetPassword(admin.id, admin.email)} disabled={resettingAdminId === admin.id}>
                      {resettingAdminId === admin.id ? 'Guardando...' : 'Cambiar clave'}
                    </button>
                    <button className="btn-ghost" type="button" onClick={() => handleRemove(admin.id)} disabled={removingAdminId === admin.id}>
                      {removingAdminId === admin.id ? 'Eliminando...' : 'Eliminar'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty-state admins-empty-state">
              <strong>No hay administradores registrados.</strong>
              <p>Añade el primer correo autorizado desde el formulario lateral.</p>
            </div>
          )}
        </section>
      </div>

      <AppToastStack toasts={toasts} onClose={removeToast} />
    </div>
  );
};

export default AdminsPage;