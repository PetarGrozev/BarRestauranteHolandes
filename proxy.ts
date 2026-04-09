import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, CUSTOMER_MODE_COOKIE, CUSTOMER_TABLE_COOKIE, SUPERADMIN_SESSION_COOKIE, getAdminSessionFromCookieValue, getSuperAdminSessionFromCookieValue } from './lib/auth';

const CUSTOMER_ROUTE_PATTERN = /^\/mesa\/(\d+)(?:\/|$)/;
const INTERNAL_ROUTE_PREFIXES = ['/admin', '/kitchen', '/staff', '/tables', '/order', '/superadmin'];

function getCustomerTableRedirect(pathname: string, tableId: string | undefined) {
  if (!tableId) {
    return pathname === '/' ? null : '/';
  }

  const customerPath = `/mesa/${tableId}`;
  return pathname === customerPath ? null : customerPath;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const customerRouteMatch = pathname.match(CUSTOMER_ROUTE_PATTERN);
  const secure = request.nextUrl.protocol === 'https:';
  const adminSession = getAdminSessionFromCookieValue(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
  const superAdminSession = getSuperAdminSessionFromCookieValue(request.cookies.get(SUPERADMIN_SESSION_COOKIE)?.value);
  const customerModeEnabled = request.cookies.get(CUSTOMER_MODE_COOKIE)?.value === '1';
  const internalRoute = INTERNAL_ROUTE_PREFIXES.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`));
  const superAdminRoute = pathname === '/superadmin' || pathname.startsWith('/superadmin/');

  if (pathname === '/login') {
    if (!adminSession && !superAdminSession) {
      const response = NextResponse.next();

      if (customerModeEnabled) {
        response.cookies.delete(CUSTOMER_MODE_COOKIE);
        response.cookies.delete(CUSTOMER_TABLE_COOKIE);
      }

      return response;
    }

    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = superAdminSession ? '/superadmin' : '/admin';
    redirectUrl.search = '';
    return NextResponse.redirect(redirectUrl);
  }

  if (customerRouteMatch) {
    const response = NextResponse.next();
    const tableId = customerRouteMatch[1];

    response.cookies.set(CUSTOMER_MODE_COOKIE, '1', {
      httpOnly: true,
      maxAge: 60 * 60 * 8,
      path: '/',
      sameSite: 'lax',
      secure,
    });

    response.cookies.set(CUSTOMER_TABLE_COOKIE, tableId, {
      httpOnly: true,
      maxAge: 60 * 60 * 8,
      path: '/',
      sameSite: 'lax',
      secure,
    });

    return response;
  }

  if (superAdminSession) {
    if (!superAdminRoute && internalRoute) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/superadmin';
      redirectUrl.search = '';
      return NextResponse.redirect(redirectUrl);
    }

    return NextResponse.next();
  }

  if (adminSession) {
    if (superAdminRoute) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/admin';
      redirectUrl.search = '';
      return NextResponse.redirect(redirectUrl);
    }

    return NextResponse.next();
  }

  if (!customerModeEnabled) {
    if (!internalRoute) {
      return NextResponse.next();
    }

    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/login';
    redirectUrl.search = `?redirect=${encodeURIComponent(`${pathname}${request.nextUrl.search}`)}`;
    return NextResponse.redirect(redirectUrl);
  }

  const blockedForCustomer = pathname === '/' || internalRoute;

  if (!blockedForCustomer) {
    return NextResponse.next();
  }

  if (internalRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/login';
    redirectUrl.search = `?redirect=${encodeURIComponent(`${pathname}${request.nextUrl.search}`)}`;
    return NextResponse.redirect(redirectUrl);
  }

  const tableId = request.cookies.get(CUSTOMER_TABLE_COOKIE)?.value;
  const redirectPath = getCustomerTableRedirect(pathname, tableId);

  if (!redirectPath) {
    return NextResponse.next();
  }

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = redirectPath;
  redirectUrl.search = '';

  return NextResponse.redirect(redirectUrl);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};