import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../lib/db';
import {
  CUSTOMER_MODE_COOKIE,
  CUSTOMER_TABLE_COOKIE,
  buildAdminSessionCookie,
  buildExpiredCookie,
  createAdminSessionToken,
  isStoredAdminPasswordValid,
} from '../../../lib/auth';
import { getRestaurantBySlug, normalizeRestaurantSlug } from '../../../lib/restaurants';

function isSecureRequest(req: NextApiRequest) {
  return String(req.headers['x-forwarded-proto'] ?? '').split(',')[0] === 'https';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const restaurantSlug = normalizeRestaurantSlug(req.body?.restaurant);
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '');

  if (!restaurantSlug || !email || !password) {
    return res.status(400).json({ message: 'Introduce restaurante, email y contraseña.' });
  }

  try {
    const restaurant = await getRestaurantBySlug(restaurantSlug);

    if (!restaurant || !restaurant.isActive) {
      return res.status(401).json({ message: 'Restaurante no encontrado o inactivo.' });
    }

    const admin = await db.admin.findFirst({ where: { restaurantId: restaurant.id, email } });

    if (!admin) {
      return res.status(401).json({ message: 'Credenciales incorrectas.' });
    }

    if (!isStoredAdminPasswordValid(password, admin.passwordHash)) {
      return res.status(401).json({ message: 'Credenciales incorrectas.' });
    }

    const secure = isSecureRequest(req);
    const token = createAdminSessionToken({
      email: admin.email,
      restaurantId: restaurant.id,
      restaurantSlug: restaurant.slug,
    });

    res.setHeader('Set-Cookie', [
      buildAdminSessionCookie(token, secure),
      buildExpiredCookie(CUSTOMER_MODE_COOKIE, secure),
      buildExpiredCookie(CUSTOMER_TABLE_COOKIE, secure),
    ]);

    return res.status(200).json({ email: admin.email, restaurant: { id: restaurant.id, name: restaurant.name, slug: restaurant.slug } });
  } catch (error) {
    console.error('login error', error);
    return res.status(500).json({ message: 'No se pudo iniciar sesión.' });
  }
}