import type { ReactNode } from 'react';
import AdminOrderAlerts from '@/components/AdminOrderAlerts';
import '../src/styles/globals.css';

export const metadata = {
    title: 'Bar/Restaurant App',
};

type RootLayoutProps = {
    children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
    return (
        <html lang="en">
            <body className="app-body">
                <AdminOrderAlerts />
                <div className="shell">
                    <header className="shell-header">
                        <div className="shell-brand">
                            <span className="shell-logo" />
                            <span className="shell-title">Bar/Restaurant App</span>
                        </div>
                        <nav className="shell-nav">
                            <a href="/tables">Mesas</a>
                            <a href="/order">Pedidos</a>
                            <a href="/kitchen">Cocina</a>
                            <a href="/staff">Sala</a>
                            <a href="/admin">Admin</a>
                        </nav>
                    </header>
                    <main className="shell-main">{children}</main>
                    <footer className="shell-footer">
                        <span>&copy; {new Date().getFullYear()} Bar/Restaurant App</span>
                    </footer>
                </div>
            </body>
        </html>
    );
}