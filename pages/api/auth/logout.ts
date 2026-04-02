import type { NextApiRequest, NextApiResponse } from 'next';
import { ADMIN_SESSION_COOKIE, buildExpiredCookie } from '../../../lib/auth';

function isSecureRequest(req: NextApiRequest) {
  return String(req.headers['x-forwarded-proto'] ?? '').split(',')[0] === 'https';
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: 'Method not allowed' });
  }

  res.setHeader('Set-Cookie', buildExpiredCookie(ADMIN_SESSION_COOKIE, isSecureRequest(req)));
  return res.status(200).json({ ok: true });
}