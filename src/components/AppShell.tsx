"use client";

import { useState, useTransition, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AdminOrderAlerts from '@/components/AdminOrderAlerts';

type AppShellProps = {
  children: ReactNode;
  hasAdminSession?: boolean;
};

function isCustomerRoute(pathname: string | null) {
  return pathname?.startsWith('/mesa/') ?? false;
}

const NAV_ITEMS = [
  { href: '/tables', label: 'Mesas', icon: 'tables' as const },
  { href: '/order', label: 'Pedidos', icon: 'orders' as const },
  { href: '/kitchen', label: 'Cocina', icon: 'kitchen' as const },
  { href: '/staff', label: 'Sala', icon: 'staff' as const },
  { href: '/admin', label: 'Admin', icon: 'admin' as const },
];

function NavIcon({ icon }: { icon: 'tables' | 'orders' | 'kitchen' | 'staff' | 'admin' }) {
  if (icon === 'orders') {
    return (
      <svg aria-hidden="true" className="shell-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 6h14" />
        <path d="M5 12h14" />
        <path d="M5 18h9" />
      </svg>
    );
  }

  if (icon === 'kitchen') {
    return (
      <svg aria-hidden="true" className="shell-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 3v8" />
        <path d="M7 3v8" />
        <path d="M10 3v8" />
        <path d="M7 11v10" />
        <path d="M15 3c1.657 0 3 1.79 3 4v14" />
        <path d="M15 11h6" />
      </svg>
    );
  }

  if (icon === 'staff') {
    return (
      <svg aria-hidden="true" className="shell-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 20h16" />
        <path d="M7 20v-5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v5" />
        <path d="M9 13V8a3 3 0 1 1 6 0v5" />
      </svg>
    );
  }

  if (icon === 'admin') {
    return (
      <svg aria-hidden="true" className="shell-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3 4 7v5c0 5 3.4 7.9 8 9 4.6-1.1 8-4 8-9V7l-8-4Z" />
        <path d="m9.5 12 1.7 1.7 3.3-3.7" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" className="shell-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="6" width="16" height="11" rx="2" />
      <path d="M8 17v3" />
      <path d="M16 17v3" />
      <path d="M9 10h6" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg aria-hidden="true" className="shell-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
      <path d="M10 17l5-5-5-5" />
      <path d="M15 12H4" />
    </svg>
  );
}

function isNavItemActive(pathname: string | null, href: string) {
  if (!pathname) {
    return false;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AppShell({ children, hasAdminSession = false }: AppShellProps) {
  const pathname = usePathname();
  const customerRoute = isCustomerRoute(pathname);
  const loginRoute = pathname === '/login';
  const [isPending, startTransition] = useTransition();
  const [logoutError, setLogoutError] = useState('');

  const handleLogout = () => {
    setLogoutError('');

    startTransition(async () => {
      try {
        const response = await fetch('/api/auth/logout', { method: 'POST' });
        if (!response.ok) {
          throw new Error('No se pudo cerrar la sesión.');
        }

        window.location.href = '/login';
      } catch (error) {
        setLogoutError(error instanceof Error ? error.message : 'No se pudo cerrar la sesión.');
      }
    });
  };

  return (
    <>
      <AdminOrderAlerts />
      <div className={`shell${customerRoute ? ' shell--customer' : ''}`}>
        {!customerRoute && (
          <header className="shell-header">
            <div className="shell-header-bar">
              <div className="shell-brand">
                <div className="shell-brand-copy">
                  <span className="shell-title">Bar/Restaurant App</span>
                  {hasAdminSession && !loginRoute && <span className="shell-subtitle">Acceso interno</span>}
                </div>
              </div>
              {hasAdminSession && !loginRoute && (
                <button
                  className="shell-logout-button"
                  type="button"
                  onClick={handleLogout}
                  disabled={isPending}
                  aria-label={isPending ? 'Cerrando sesión' : 'Cerrar sesión'}
                  title={isPending ? 'Cerrando sesión' : 'Cerrar sesión'}
                >
                  <LogoutIcon />
                </button>
              )}
            </div>
            {hasAdminSession && !loginRoute && (
              <div className="shell-header-actions">
                <nav className="shell-nav" aria-label="Navegación interna">
                  {NAV_ITEMS.map(item => (
                    <Link key={item.href} className={`shell-nav-link${isNavItemActive(pathname, item.href) ? ' is-active' : ''}`} href={item.href}>
                      <NavIcon icon={item.icon} />
                      <span className="shell-nav-text">{item.label}</span>
                    </Link>
                  ))}
                </nav>
              </div>
            )}
          </header>
        )}

        <main className={`shell-main${customerRoute ? ' shell-main--customer' : ''}`}>{children}</main>

        {logoutError && !customerRoute && <div className="shell-session-error">{logoutError}</div>}

        {!customerRoute && (
          <footer className="shell-footer">
            <span>&copy; {new Date().getFullYear()} Bar/Restaurant App</span>
          </footer>
        )}
      </div>
    </>
  );
}