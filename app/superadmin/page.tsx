"use client";

import { useEffect, useMemo, useState } from 'react';
import AppToastStack from '@/components/AppToast';
import useAppToasts from '@/hooks/useAppToasts';
import type { RestaurantSummary } from '@/types';

type RestaurantFormState = {
  name: string;
  slug: string;
  logoUrl: string;
  adminEmail: string;
  adminPassword: string;
  adminPasswordConfirm: string;
};

const INITIAL_FORM: RestaurantFormState = {
  name: '',
  slug: '',
  logoUrl: '',
  adminEmail: '',
  adminPassword: '',
  adminPasswordConfirm: '',
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('nl-NL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function SuperAdminPage() {
  const [restaurants, setRestaurants] = useState<RestaurantSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [editing, setEditing] = useState<RestaurantSummary | null>(null);
  const { toasts, pushToast, removeToast } = useAppToasts();

  const activeCount = useMemo(() => restaurants.filter(item => item.isActive).length, [restaurants]);

  const fetchRestaurants = async () => {
    try {
      const response = await fetch('/api/superadmin/restaurants');
      if (!response.ok) {
        throw new Error('Restaurants laden is mislukt.');
      }

      const payload = await response.json() as RestaurantSummary[];
      setRestaurants(payload);
    } catch (error) {
      pushToast({ title: 'Platform', message: error instanceof Error ? error.message : 'Restaurants laden is mislukt.', variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRestaurants().catch(() => {});
  }, []);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();

    if (form.adminPassword !== form.adminPasswordConfirm) {
      pushToast({ title: 'Platform', message: 'De wachtwoorden van de eerste beheerder komen niet overeen.', variant: 'error' });
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/superadmin/restaurants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          slug: form.slug,
          logoUrl: form.logoUrl,
          adminEmail: form.adminEmail,
          adminPassword: form.adminPassword,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message ?? 'Restaurant aanmaken is mislukt.');
      }

      const created = await response.json() as RestaurantSummary;
      setRestaurants(prev => [created, ...prev]);
      setForm(INITIAL_FORM);
      pushToast({ title: 'Platform', message: 'Restaurant aangemaakt en eerste beheerder toegewezen.', variant: 'success' });
    } catch (error) {
      pushToast({ title: 'Platform', message: error instanceof Error ? error.message : 'Restaurant aanmaken is mislukt.', variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditStart = (restaurant: RestaurantSummary) => {
    setEditing(restaurant);
  };

  const handleEditSave = async (restaurant: RestaurantSummary) => {
    setSavingId(restaurant.id);

    try {
      const response = await fetch(`/api/superadmin/restaurants/${restaurant.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: restaurant.name,
          slug: restaurant.slug,
          logoUrl: restaurant.logoUrl,
          isActive: restaurant.isActive,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message ?? 'Restaurant bijwerken is mislukt.');
      }

      const updated = await response.json() as RestaurantSummary;
      setRestaurants(prev => prev.map(item => item.id === updated.id ? updated : item));
      setEditing(prev => prev && prev.id === updated.id ? updated : prev);
      pushToast({ title: 'Platform', message: 'Restaurant bijgewerkt.', variant: 'success' });
    } catch (error) {
      pushToast({ title: 'Platform', message: error instanceof Error ? error.message : 'Restaurant bijwerken is mislukt.', variant: 'error' });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="superadmin-page">
      <div className="superadmin-hero">
        <div className="superadmin-hero-copy">
          <h1>Multi-restaurantplatform</h1>
          <p className="page-subtitle">Maak restaurants aan, pas hun branding aan en beheer toegangen vanuit één compact paneel.</p>
        </div>
        <div className="superadmin-stats">
          <div className="superadmin-stat-card">
            <strong>{restaurants.length}</strong>
            <span>Restaurants</span>
          </div>
          <div className="superadmin-stat-card superadmin-stat-card--accent">
            <strong>{activeCount}</strong>
            <span>Actief</span>
          </div>
        </div>
      </div>

      <div className="superadmin-layout">
        <section className="admins-panel admins-panel--form superadmin-panel superadmin-panel--create">
          <div className="admins-panel-copy">
            <h2>Restaurant aanmaken</h2>
            <p>Stel de omgeving en de eerste toegang in zonder deze pagina te verlaten.</p>
          </div>

          <form className="admin-form superadmin-create-form" onSubmit={handleCreate}>
            <div className="superadmin-form-grid">
            <label className="admins-field">
              <span>Naam</span>
              <input value={form.name} onChange={event => setForm(prev => ({ ...prev, name: event.target.value }))} placeholder="Casa Aurora" required />
            </label>
            <label className="admins-field">
              <span>Slug of code</span>
              <input value={form.slug} onChange={event => setForm(prev => ({ ...prev, slug: event.target.value }))} placeholder="casa-aurora" required />
            </label>
            <label className="admins-field superadmin-form-span">
              <span>Logo URL</span>
              <input value={form.logoUrl} onChange={event => setForm(prev => ({ ...prev, logoUrl: event.target.value }))} placeholder="/logos/casa-aurora.png" />
            </label>
            <label className="admins-field">
              <span>E-mailadres eerste beheerder</span>
              <input type="email" value={form.adminEmail} onChange={event => setForm(prev => ({ ...prev, adminEmail: event.target.value }))} placeholder="admin@restaurante.com" required />
            </label>
            <label className="admins-field">
              <span>Eerste wachtwoord</span>
              <input type="password" value={form.adminPassword} onChange={event => setForm(prev => ({ ...prev, adminPassword: event.target.value }))} placeholder="Minimaal 8 tekens" minLength={8} required />
            </label>
            <label className="admins-field">
              <span>Eerste wachtwoord bevestigen</span>
              <input type="password" value={form.adminPasswordConfirm} onChange={event => setForm(prev => ({ ...prev, adminPasswordConfirm: event.target.value }))} placeholder="Herhaal het eerste wachtwoord" minLength={8} required />
            </label>
            </div>
            <button className="btn-primary" type="submit" disabled={submitting}>
              {submitting ? 'Aanmaken...' : 'Restaurant aanmaken'}
            </button>
          </form>
        </section>

        <section className="admins-panel admins-panel--list superadmin-panel superadmin-panel--list">
          <div className="admins-panel-copy admins-panel-copy--list superadmin-list-toolbar">
            <div>
              <h2>Beschikbare omgevingen</h2>
              <p>Bewerk naam, slug en branding zonder onnodig veel ruimte in te nemen.</p>
            </div>
            <span className="superadmin-list-count">{restaurants.length} omgevingen</span>
          </div>

          {loading ? (
            <p>Restaurants laden...</p>
          ) : restaurants.length > 0 ? (
            <div className="superadmin-restaurant-list">
              {restaurants.map(restaurant => {
                const current = editing?.id === restaurant.id ? editing : restaurant;
                const isEditing = editing?.id === restaurant.id;

                return (
                  <article key={restaurant.id} className="superadmin-restaurant-card">
                    <div className="superadmin-restaurant-head">
                      <div>
                        <h3>{restaurant.name}</h3>
                        <p>{restaurant.slug}</p>
                      </div>
                      <button className={`superadmin-status-badge${current.isActive ? ' is-active' : ''}`} type="button" onClick={() => setEditing(prev => prev?.id === restaurant.id ? { ...prev, isActive: !prev.isActive } : { ...restaurant, isActive: !restaurant.isActive })}>
                        {current.isActive ? 'Actief' : 'Inactief'}
                      </button>
                    </div>

                    <div className="superadmin-metrics">
                      <span>{restaurant.counts.admins} beheerders</span>
                      <span>{restaurant.counts.products} producten</span>
                      <span>{restaurant.counts.tables} tafels</span>
                      <span>{restaurant.counts.orders} bestellingen</span>
                    </div>

                    <div className="superadmin-edit-grid">
                      <label className="admins-field">
                        <span>Naam</span>
                        <input value={current.name} onChange={event => setEditing(prev => prev?.id === restaurant.id ? { ...prev, name: event.target.value } : { ...restaurant, name: event.target.value })} />
                      </label>
                      <label className="admins-field">
                        <span>Slug</span>
                        <input value={current.slug} onChange={event => setEditing(prev => prev?.id === restaurant.id ? { ...prev, slug: event.target.value } : { ...restaurant, slug: event.target.value })} />
                      </label>
                      <label className="admins-field superadmin-field-span">
                        <span>Logo URL</span>
                        <input value={current.logoUrl ?? ''} onChange={event => setEditing(prev => prev?.id === restaurant.id ? { ...prev, logoUrl: event.target.value } : { ...restaurant, logoUrl: event.target.value })} placeholder="/logos/restaurante.png" />
                      </label>
                    </div>

                    <div className="superadmin-restaurant-footer">
                      <span>Aangemaakt: {formatDate(restaurant.createdAt)}</span>
                      <div className="superadmin-restaurant-actions">
                        {!isEditing && (
                          <button className="btn-ghost" type="button" onClick={() => handleEditStart(restaurant)}>
                            Bewerken
                          </button>
                        )}
                        {isEditing && (
                          <>
                            <button className="btn-ghost" type="button" onClick={() => setEditing(null)}>
                              Annuleren
                            </button>
                            <button className="btn-primary" type="button" disabled={savingId === restaurant.id} onClick={() => handleEditSave(current)}>
                              {savingId === restaurant.id ? 'Opslaan...' : 'Opslaan'}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="empty-state admins-empty-state">
              <strong>Er zijn geen restaurants ingesteld.</strong>
              <p>Maak het eerste restaurant aan via het formulier aan de zijkant om een nieuwe omgeving te activeren.</p>
            </div>
          )}
        </section>
      </div>

      <AppToastStack toasts={toasts} onClose={removeToast} />
    </div>
  );
}