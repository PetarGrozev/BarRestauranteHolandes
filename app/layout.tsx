import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import AppShell from '@/components/AppShell';
import { internalAppLabel } from '@/lib/brand';
import { getRestaurantBrandingById } from '../lib/restaurants';
import { ADMIN_SESSION_COOKIE, SUPERADMIN_SESSION_COOKIE, getAdminSessionFromCookieValue, getSuperAdminSessionFromCookieValue } from '../lib/auth';
import '../src/styles/globals.css';

export const metadata = {
    title: `${internalAppLabel} | Multi-restaurante`,
};

type RootLayoutProps = {
    children: ReactNode;
};

export default async function RootLayout({ children }: RootLayoutProps) {
    const cookieStore = await cookies();
    const adminSession = getAdminSessionFromCookieValue(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
    const superAdminSession = getSuperAdminSessionFromCookieValue(cookieStore.get(SUPERADMIN_SESSION_COOKIE)?.value);
    const hasAdminSession = Boolean(adminSession);
    const hasSuperAdminSession = Boolean(superAdminSession);
    const currentBrand = adminSession ? await getRestaurantBrandingById(adminSession.restaurantId) : null;

    return (
        <html lang="en">
            <body className="app-body">
                <AppShell hasAdminSession={hasAdminSession} hasSuperAdminSession={hasSuperAdminSession} currentBrand={currentBrand}>{children}</AppShell>
            </body>
        </html>
    );
}