import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { NextApiRequest } from 'next';

export const ADMIN_SESSION_COOKIE = 'bar_admin_session';
export const SUPERADMIN_SESSION_COOKIE = 'bar_superadmin_session';
export const CUSTOMER_MODE_COOKIE = 'bar_customer_mode';
export const CUSTOMER_TABLE_COOKIE = 'bar_customer_table';

const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 12;
export const ADMIN_PASSWORD_MIN_LENGTH = 8;

export type AdminSessionPayload = {
  email: string;
  restaurantId: number;
  restaurantSlug: string;
  exp: number;
};

export type SuperAdminSessionPayload = {
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

export function getSuperAdminAccessEmail() {
  return (process.env.SUPERADMIN_EMAIL || '').trim().toLowerCase();
}

export function getSuperAdminAccessPassword() {
  return process.env.SUPERADMIN_PASSWORD || '';
}

export function isAdminPasswordFormatValid(password: string) {
  return password.trim().length >= ADMIN_PASSWORD_MIN_LENGTH;
}

export function hashAdminPassword(password: string) {
  if (!isAdminPasswordFormatValid(password)) {
    throw new Error(`La contraseña debe tener al menos ${ADMIN_PASSWORD_MIN_LENGTH} caracteres.`);
  }

  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

export function isStoredAdminPasswordValid(password: string, storedHash: string | null | undefined) {
  if (!storedHash || !password) {
    return false;
  }

  const [algorithm, salt, expectedHash] = storedHash.split(':');

  if (algorithm !== 'scrypt' || !salt || !expectedHash) {
    return false;
  }

  const computedHash = scryptSync(password, salt, 64).toString('hex');
  return safeEqual(computedHash, expectedHash);
}

function signPayload(payload: string) {
  return createHmac('sha256', getAuthSecret()).update(payload).digest('base64url');
}

export function createAdminSessionToken(session: { email: string; restaurantId: number; restaurantSlug: string }) {
  const encodedPayload = Buffer.from(JSON.stringify({
    email: session.email,
    restaurantId: session.restaurantId,
    restaurantSlug: session.restaurantSlug,
    exp: Date.now() + ADMIN_SESSION_TTL_SECONDS * 1000,
  } satisfies AdminSessionPayload)).toString('base64url');

  return `${encodedPayload}.${signPayload(encodedPayload)}`;
}

export function createSuperAdminSessionToken(email: string) {
  const encodedPayload = Buffer.from(JSON.stringify({
    email,
    exp: Date.now() + ADMIN_SESSION_TTL_SECONDS * 1000,
  } satisfies SuperAdminSessionPayload)).toString('base64url');

  return `${encodedPayload}.${signPayload(encodedPayload)}`;
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

    if (!decoded.email || !Number.isInteger(decoded.restaurantId) || decoded.restaurantId <= 0 || !decoded.restaurantSlug || decoded.exp <= Date.now()) {
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

export function getSuperAdminSessionFromCookieValue(token: string | undefined) {
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
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as SuperAdminSessionPayload;

    if (!decoded.email || decoded.exp <= Date.now()) {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
}

export function getSuperAdminSessionFromApiRequest(req: NextApiRequest) {
  return getSuperAdminSessionFromCookieValue(req.cookies[SUPERADMIN_SESSION_COOKIE]);
}

export function isSuperAdminCredentialsValid(email: string, password: string) {
  const configuredEmail = getSuperAdminAccessEmail();
  const configuredPassword = getSuperAdminAccessPassword();
  const normalizedEmail = email.trim().toLowerCase();

  if (!configuredEmail || !configuredPassword || !normalizedEmail || !password) {
    return false;
  }

  return safeEqual(normalizedEmail, configuredEmail) && safeEqual(password, configuredPassword);
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

export function buildSuperAdminSessionCookie(token: string, secure: boolean) {
  return buildCookieHeader(SUPERADMIN_SESSION_COOKIE, token, {
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
