import { createHmac, timingSafeEqual } from 'node:crypto';
import type { NextApiRequest } from 'next';

export const ADMIN_SESSION_COOKIE = 'bar_admin_session';
export const CUSTOMER_MODE_COOKIE = 'bar_customer_mode';
export const CUSTOMER_TABLE_COOKIE = 'bar_customer_table';

const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 12;

type AdminSessionPayload = {
  email: string;
  exp: number;
};

type CookieHeaderOptions = {
  httpOnly?: boolean;
  maxAge?: number;
  path?: string;
  sameSite?: 'Lax' | 'Strict' | 'None';
  secure?: boolean;
};

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function getAuthSecret() {
  if (process.env.AUTH_SECRET) {
    return process.env.AUTH_SECRET;
  }

  if (process.env.NODE_ENV !== 'production') {
    return 'bar-app-local-auth-secret';
  }

  throw new Error('AUTH_SECRET is required in production');
}

export function getAdminAccessPassword() {
  return process.env.ADMIN_PASSWORD || '';
}

export function getBootstrapAdminEmail() {
  return (process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || '').trim().toLowerCase();
}

function signPayload(payload: string) {
  return createHmac('sha256', getAuthSecret()).update(payload).digest('base64url');
}

export function createAdminSessionToken(email: string) {
  const payload = Buffer.from(JSON.stringify({
    email,
    exp: Date.now() + ADMIN_SESSION_TTL_SECONDS * 1000,
  } satisfies AdminSessionPayload)).toString('base64url');

  return `${payload}.${signPayload(payload)}`;
}

export function getAdminSessionFromCookieValue(token: string | undefined) {
  if (!token) {
    return null;
  }

  const [payload, signature] = token.split('.');
  if (!payload || !signature) {
    return null;
  }

  if (!safeEqual(signature, signPayload(payload))) {
    return null;
  }

  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as AdminSessionPayload;

    if (!decoded.email || decoded.exp <= Date.now()) {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
}

export function getAdminSessionFromApiRequest(req: NextApiRequest) {
  return getAdminSessionFromCookieValue(req.cookies[ADMIN_SESSION_COOKIE]);
}

export function isAdminPasswordValid(password: string) {
  const configuredPassword = getAdminAccessPassword();

  if (!configuredPassword || !password) {
    return false;
  }

  return safeEqual(password, configuredPassword);
}

export function isCustomerTableRequestAllowed(req: NextApiRequest, tableId: number) {
  return req.cookies[CUSTOMER_MODE_COOKIE] === '1' && req.cookies[CUSTOMER_TABLE_COOKIE] === String(tableId);
}

export function buildCookieHeader(name: string, value: string, options: CookieHeaderOptions = {}) {
  const segments = [`${name}=${encodeURIComponent(value)}`];

  segments.push(`Path=${options.path ?? '/'}`);

  if (typeof options.maxAge === 'number') {
    segments.push(`Max-Age=${options.maxAge}`);
  }

  if (options.httpOnly) {
    segments.push('HttpOnly');
  }

  segments.push(`SameSite=${options.sameSite ?? 'Lax'}`);

  if (options.secure) {
    segments.push('Secure');
  }

  return segments.join('; ');
}

export function buildAdminSessionCookie(token: string, secure: boolean) {
  return buildCookieHeader(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    maxAge: ADMIN_SESSION_TTL_SECONDS,
    path: '/',
    sameSite: 'Lax',
    secure,
  });
}

export function buildExpiredCookie(name: string, secure: boolean) {
  return buildCookieHeader(name, '', {
    httpOnly: true,
    maxAge: 0,
    path: '/',
    sameSite: 'Lax',
    secure,
  });
}

export async function sendMagicLink(email: string) {
  if (!email) throw new Error('Email required');
  console.log(`Enviar "magic link" a ${email}`);
  return true;
}
