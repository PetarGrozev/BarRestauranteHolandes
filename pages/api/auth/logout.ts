import type { NextApiRequest, NextApiResponse } from 'next';
import { ADMIN_SESSION_COOKIE, CUSTOMER_MODE_COOKIE, CUSTOMER_TABLE_COOKIE, SUPERADMIN_SESSION_COOKIE, buildExpiredCookie } from '../../../lib/auth';

function isSecureRequest(req: NextApiRequest) {
  return String(req.headers['x-forwarded-proto'] ?? '').split(',')[0] === 'https';
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const secure = isSecureRequest(req);
  res.setHeader('Set-Cookie', [
    buildExpiredCookie(ADMIN_SESSION_COOKIE, secure),
    buildExpiredCookie(SUPERADMIN_SESSION_COOKIE, secure),
    buildExpiredCookie(CUSTOMER_MODE_COOKIE, secure),
    buildExpiredCookie(CUSTOMER_TABLE_COOKIE, secure),
  ]);
  return res.status(200).json({ ok: true });
}