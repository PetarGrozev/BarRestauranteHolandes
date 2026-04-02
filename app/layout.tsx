import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import AppShell from '@/components/AppShell';
import { ADMIN_SESSION_COOKIE, getAdminSessionFromCookieValue } from '../lib/auth';
import '../src/styles/globals.css';

export const metadata = {
    title: 'Bar/Restaurant App',
};

type RootLayoutProps = {
    children: ReactNode;
};

export default async function RootLayout({ children }: RootLayoutProps) {
    const cookieStore = await cookies();
    const hasAdminSession = Boolean(getAdminSessionFromCookieValue(cookieStore.get(ADMIN_SESSION_COOKIE)?.value));

    return (
        <html lang="en">
            <body className="app-body">
                <AppShell hasAdminSession={hasAdminSession}>{children}</AppShell>
            </body>
        </html>
    );
}