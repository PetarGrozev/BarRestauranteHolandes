"use client";

import React, { useEffect, useState } from 'react';
import AppToastStack from '@/components/AppToast';
import useAppToasts from '@/hooks/useAppToasts';
import type { Admin } from '@/types';

function formatAdminDate(value: string) {
  return new Date(value).toLocaleDateString('nl-NL', {
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
      pushToast({ message: 'De beheerderslijst kon niet worden geladen.', title: 'Beheerders', variant: 'error' });
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
      pushToast({ message: 'De wachtwoorden komen niet overeen.', title: 'Beheerders', variant: 'error' });
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
      pushToast({ message: 'Beheerder is succesvol toegevoegd.', title: 'Beheerders', variant: 'success' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Beheerder toevoegen is mislukt.';
      pushToast({ message, title: 'Beheerders', variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (adminId: number, adminEmail: string) => {
    const nextPassword = window.prompt(`Nieuw wachtwoord voor ${adminEmail}`, '');

    if (nextPassword === null) {
      return;
    }

    if (!nextPassword.trim()) {
      pushToast({ message: 'Het wachtwoord mag niet leeg zijn.', title: 'Beheerders', variant: 'error' });
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

      pushToast({ message: `Wachtwoord bijgewerkt voor ${adminEmail}.`, title: 'Beheerders', variant: 'success' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Wachtwoord bijwerken is mislukt.';
      pushToast({ message, title: 'Beheerders', variant: 'error' });
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
      pushToast({ message: 'Beheerder is succesvol verwijderd.', title: 'Beheerders', variant: 'success' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Beheerder verwijderen is mislukt.';
      pushToast({ message, title: 'Beheerders', variant: 'error' });
    } finally {
      setRemovingAdminId(null);
    }
  };

  return (
    <div className="admins-page">
      <div className="admins-page-hero">
        <div>
          <h1>BEHEERDERS</h1>
          <p className="page-subtitle">Beheer alle interne toegangen vanuit één paneel.</p>
        </div>
        <div className="admins-page-stat">
          <strong>{admins.length}</strong>
          <span>Actieve toegangen</span>
        </div>
      </div>

      <div className="admins-layout">
        <section className="admins-panel admins-panel--form">
          <div className="admins-panel-copy">
            <h2>Beheerder toevoegen</h2>
            <p>Vul het e-mailadres en een eigen wachtwoord voor deze gebruiker in.</p>
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
              <span>Wachtwoord</span>
              <input
                type="password"
                placeholder="Minimaal 8 tekens"
                value={password}
                onChange={e => setPassword(e.target.value)}
                minLength={8}
                required
              />
            </label>
            <label className="admins-field">
              <span>Wachtwoord bevestigen</span>
              <input
                type="password"
                placeholder="Herhaal het wachtwoord"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                minLength={8}
                required
              />
            </label>
            <button className="btn-primary" type="submit" disabled={submitting}>
              {submitting ? 'Toevoegen...' : 'Beheerder toevoegen'}
            </button>
          </form>
        </section>

        <section className="admins-panel admins-panel--list">
          <div className="admins-panel-copy admins-panel-copy--list">
            <h2>Geautoriseerde toegangen</h2>
            <p>Controleer wie toegang heeft tot het beheergebied en verwijder toegangen wanneer nodig.</p>
          </div>

          {loading ? (
            <p>Beheerders laden...</p>
          ) : admins.length > 0 ? (
            <ul className="admin-list">
              {admins.map(admin => (
                <li key={admin.id} className="admin-list-item">
                  <div className="admin-list-identity">
                    <span className="admin-list-avatar" aria-hidden="true">{admin.email.slice(0, 1).toUpperCase()}</span>
                    <div className="admin-list-copy">
                      <strong>{admin.email}</strong>
                      <span>Aangemaakt: {formatAdminDate(admin.createdAt)}</span>
                    </div>
                  </div>
                  <div className="admin-list-actions">
                    <button className="btn-secondary" type="button" onClick={() => handleResetPassword(admin.id, admin.email)} disabled={resettingAdminId === admin.id}>
                      {resettingAdminId === admin.id ? 'Opslaan...' : 'Wachtwoord wijzigen'}
                    </button>
                    <button className="btn-ghost" type="button" onClick={() => handleRemove(admin.id)} disabled={removingAdminId === admin.id}>
                      {removingAdminId === admin.id ? 'Verwijderen...' : 'Verwijderen'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty-state admins-empty-state">
              <strong>Er zijn geen beheerders geregistreerd.</strong>
              <p>Voeg het eerste geautoriseerde e-mailadres toe via het formulier aan de zijkant.</p>
            </div>
          )}
        </section>
      </div>

      <AppToastStack toasts={toasts} onClose={removeToast} />
    </div>
  );
};

export default AdminsPage;