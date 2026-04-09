import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_SESSION_COOKIE, getAdminSessionFromCookieValue } from '../lib/auth';

export default async function HomePage() {
    const cookieStore = await cookies();
    const hasAdminSession = Boolean(getAdminSessionFromCookieValue(cookieStore.get(ADMIN_SESSION_COOKIE)?.value));

    redirect(hasAdminSession ? '/admin' : '/login');
}