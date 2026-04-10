"use client";

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function normalizeRedirect(value: string | null) {
  if (!value || !value.startsWith('/')) {
    return '/admin';
  }

  if (value.startsWith('//')) {
    return '/admin';
  }

  return value;
}

function getPostLoginRedirect(value: string | null, mode: 'restaurant' | 'platform') {
  const normalized = normalizeRedirect(value);

  if (mode === 'platform') {
    return normalized.startsWith('/superadmin') ? normalized : '/superadmin';
  }

  return normalized.startsWith('/superadmin') ? '/admin' : normalized;
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<'restaurant' | 'platform'>('restaurant');
  const [restaurant, setRestaurant] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const redirectTo = getPostLoginRedirect(searchParams?.get('redirect') ?? null, mode);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    startTransition(async () => {
      try {
        const response = await fetch(mode === 'platform' ? '/api/auth/superadmin-login' : '/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mode === 'platform' ? { email, password } : { restaurant, email, password }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.message ?? 'Inloggen is niet gelukt.');
        }

        router.replace(redirectTo);
        router.refresh();
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : 'Inloggen is niet gelukt.');
      }
    });
  };

  return (
    <section className="login-page">
      <div className="login-frame">
        <div className="login-showcase">
          <h1>Log in en start de service.</h1>
          <p className="login-lead">
            Minder lopen, minder wachten en meer service: de app verkort de tijd tussen tafel, keuken en afrekening.
          </p>
        </div>

        <div className="login-card">
          <div className="login-card-copy">
            <h2>{mode === 'platform' ? 'Inloggen als superadmin' : 'Inloggen'}</h2>
            <p>{mode === 'platform' ? 'Beheer restaurants en globale instellingen.' : 'Open de restaurantomgeving met je code en je gegevens.'}</p>
          </div>

          <div className="login-mode-switch" role="tablist" aria-label="Type toegang">
            <button className={`login-mode-chip${mode === 'restaurant' ? ' is-active' : ''}`} type="button" onClick={() => setMode('restaurant')}>
              Restaurant
            </button>
            <button className={`login-mode-chip${mode === 'platform' ? ' is-active' : ''}`} type="button" onClick={() => setMode('platform')}>
              Superadmin
            </button>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            {mode === 'restaurant' && (
              <label className="login-field">
                <span>Restaurantcode</span>
                <input type="text" value={restaurant} onChange={event => setRestaurant(event.target.value)} placeholder="mi-restaurante" autoComplete="organization" required />
              </label>
            )}

            <label className="login-field">
              <span>{mode === 'platform' ? 'Platform-e-mail' : 'Geautoriseerd e-mailadres'}</span>
              <input type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder={mode === 'platform' ? 'superadmin@plataforma.com' : 'admin@local.com'} autoComplete="username" required />
            </label>

            <label className="login-field">
              <span>{mode === 'platform' ? 'Platformwachtwoord' : 'Intern wachtwoord'}</span>
              <input type="password" value={password} onChange={event => setPassword(event.target.value)} placeholder={mode === 'platform' ? 'Je superadmin-wachtwoord' : 'Je interne wachtwoord'} autoComplete="current-password" required />
            </label>

            {error && <p className="login-error">{error}</p>}

            <button className="btn-primary login-submit" type="submit" disabled={isPending}>
              {isPending ? 'Toegang wordt gecontroleerd...' : mode === 'platform' ? 'Naar platform' : 'Naar dashboard'}
            </button>
          </form>

          <div className="login-note">
            <span className="login-note-dot" aria-hidden="true" />
            <p>{mode === 'platform' ? 'Alleen voor globaal beheer.' : 'Alleen voor geautoriseerd personeel.'}</p>
          </div>
        </div>

        <p className="login-credit">Copyright Grozev Digital. Professioneel platform voor horeca. Alle rechten voorbehouden.</p>
      </div>
    </section>
  );
}
