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

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const redirectTo = normalizeRedirect(searchParams?.get('redirect') ?? null);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    startTransition(async () => {
      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
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
      <div className="login-card">
        <div className="login-card-copy">
          <span className="login-kicker">Acceso interno</span>
          <h1>Inicia sesión</h1>
          <p>Accede a administración, cocina, sala y gestión de pedidos con tu correo autorizado y la clave interna del local.</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label className="login-field">
            <span>Email de administrador</span>
            <input type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="admin@local.com" required />
          </label>

          <label className="login-field">
            <span>Clave de acceso</span>
            <input type="password" value={password} onChange={event => setPassword(event.target.value)} placeholder="Tu contraseña interna" required />
          </label>

          {error && <p className="login-error">{error}</p>}

          <button className="btn-primary login-submit" type="submit" disabled={isPending}>
            {isPending ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </section>
  );
}