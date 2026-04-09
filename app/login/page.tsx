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
          throw new Error(payload?.message ?? 'No se pudo iniciar sesión.');
        }

        router.replace(redirectTo);
        router.refresh();
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : 'No se pudo iniciar sesión.');
      }
    });
  };

  return (
    <section className="login-page">
      <div className="login-frame">
        <div className="login-showcase">
          <h1>Entra y empieza el servicio.</h1>
          <p className="login-lead">
            Menos viajes, menos esperas y más servicio: la app recorta tiempo entre la mesa, la cocina y el cobro.
          </p>
        </div>

        <div className="login-card">
          <div className="login-card-copy">
            <h2>{mode === 'platform' ? 'Entrar como superadmin' : 'Iniciar sesión'}</h2>
            <p>{mode === 'platform' ? 'Gestiona restaurantes y configuración global.' : 'Accede al entorno del restaurante con tu código y tus credenciales.'}</p>
          </div>

          <div className="login-mode-switch" role="tablist" aria-label="Tipo de acceso">
            <button className={`login-mode-chip${mode === 'restaurant' ? ' is-active' : ''}`} type="button" onClick={() => setMode('restaurant')}>
              Restaurante
            </button>
            <button className={`login-mode-chip${mode === 'platform' ? ' is-active' : ''}`} type="button" onClick={() => setMode('platform')}>
              Superadmin
            </button>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            {mode === 'restaurant' && (
              <label className="login-field">
                <span>Código del restaurante</span>
                <input type="text" value={restaurant} onChange={event => setRestaurant(event.target.value)} placeholder="mi-restaurante" autoComplete="organization" required />
              </label>
            )}

            <label className="login-field">
              <span>{mode === 'platform' ? 'Email de plataforma' : 'Email autorizado'}</span>
              <input type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder={mode === 'platform' ? 'superadmin@plataforma.com' : 'admin@local.com'} autoComplete="username" required />
            </label>

            <label className="login-field">
              <span>{mode === 'platform' ? 'Clave de plataforma' : 'Clave interna'}</span>
              <input type="password" value={password} onChange={event => setPassword(event.target.value)} placeholder={mode === 'platform' ? 'Tu clave de superadmin' : 'Tu contraseña interna'} autoComplete="current-password" required />
            </label>

            {error && <p className="login-error">{error}</p>}

            <button className="btn-primary login-submit" type="submit" disabled={isPending}>
              {isPending ? 'Verificando acceso...' : mode === 'platform' ? 'Entrar a plataforma' : 'Entrar al panel'}
            </button>
          </form>

          <div className="login-note">
            <span className="login-note-dot" aria-hidden="true" />
            <p>{mode === 'platform' ? 'Solo para administración global.' : 'Solo para personal autorizado.'}</p>
          </div>
        </div>

        <p className="login-credit">Copyright Grozev Digital. Plataforma profesional para restauracion. Todos los derechos reservados.</p>
      </div>
    </section>
  );
}
