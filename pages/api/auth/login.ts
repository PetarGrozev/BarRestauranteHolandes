import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../lib/db';
import {
  CUSTOMER_MODE_COOKIE,
  CUSTOMER_TABLE_COOKIE,
  buildAdminSessionCookie,
  buildExpiredCookie,
  createAdminSessionToken,
  isAdminPasswordValid,
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
    return res.status(400).json({ message: 'Introduce email y contraseña.' });
  }

  try {
    const admin = await db.admin.findUnique({ where: { email } });

    if (!admin || !isAdminPasswordValid(password)) {
      return res.status(401).json({ message: 'Credenciales incorrectas.' });
    }

    const secure = isSecureRequest(req);
    const token = createAdminSessionToken(admin.email);

    res.setHeader('Set-Cookie', [
      buildAdminSessionCookie(token, secure),
      buildExpiredCookie(CUSTOMER_MODE_COOKIE, secure),
      buildExpiredCookie(CUSTOMER_TABLE_COOKIE, secure),
    ]);

    return res.status(200).json({ email: admin.email });
  } catch (error) {
    console.error('login error', error);
    return res.status(500).json({ message: 'No se pudo iniciar sesión.' });
  }
}