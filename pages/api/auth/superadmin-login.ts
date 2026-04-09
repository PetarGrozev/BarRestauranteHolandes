import type { NextApiRequest, NextApiResponse } from 'next';
import {
  ADMIN_SESSION_COOKIE,
  CUSTOMER_MODE_COOKIE,
  CUSTOMER_TABLE_COOKIE,
  buildExpiredCookie,
  buildSuperAdminSessionCookie,
  createSuperAdminSessionToken,
  isSuperAdminCredentialsValid,
} from '../../../lib/auth';

function isSecureRequest(req: NextApiRequest) {
  return String(req.headers['x-forwarded-proto'] ?? '').split(',')[0] === 'https';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '');

  if (!email || !password) {
    return res.status(400).json({ message: 'Introduce email y contraseña de plataforma.' });
  }

  if (!isSuperAdminCredentialsValid(email, password)) {
    return res.status(401).json({ message: 'Credenciales de plataforma incorrectas.' });
  }

  const secure = isSecureRequest(req);
  const token = createSuperAdminSessionToken(email);

  res.setHeader('Set-Cookie', [
    buildSuperAdminSessionCookie(token, secure),
    buildExpiredCookie(ADMIN_SESSION_COOKIE, secure),
    buildExpiredCookie(CUSTOMER_MODE_COOKIE, secure),
    buildExpiredCookie(CUSTOMER_TABLE_COOKIE, secure),
  ]);

  return res.status(200).json({ email });
}