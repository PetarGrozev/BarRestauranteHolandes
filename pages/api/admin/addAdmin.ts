import type { NextApiRequest, NextApiResponse } from 'next';
import { ADMIN_PASSWORD_MIN_LENGTH, getAdminSessionFromApiRequest, hashAdminPassword, isAdminPasswordFormatValid } from '../../../lib/auth';
import { db } from '../../../lib/db';

const adminListSelect = {
    id: true,
    email: true,
    createdAt: true,
    updatedAt: true,
} as const;

export default async function addAdmin(req: NextApiRequest, res: NextApiResponse) {
    const adminSession = getAdminSessionFromApiRequest(req);
    if (!adminSession) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    if (req.method === 'GET') {
        try {
            const admins = await db.admin.findMany({
                where: { restaurantId: adminSession.restaurantId },
                select: adminListSelect,
                orderBy: { email: 'asc' },
            });

            return res.status(200).json(admins);
        } catch (error) {
            return res.status(500).json({ message: 'Error fetching admins', error });
        }
    }

    if (req.method === 'PATCH') {
        const adminId = Number(req.body?.adminId);
        const password = String(req.body?.password ?? '');

        if (!Number.isInteger(adminId) || adminId <= 0) {
            return res.status(400).json({ message: 'Admin ID is required' });
        }

        if (!isAdminPasswordFormatValid(password)) {
            return res.status(400).json({ message: `La contraseña debe tener al menos ${ADMIN_PASSWORD_MIN_LENGTH} caracteres.` });
        }

        try {
            const targetAdmin = await db.admin.findFirst({ where: { id: adminId, restaurantId: adminSession.restaurantId } });

            if (!targetAdmin) {
                return res.status(404).json({ message: 'Administrador no encontrado.' });
            }

            await db.admin.update({
                where: { id: adminId },
                data: { passwordHash: hashAdminPassword(password) },
            });

            return res.status(200).json({ message: 'Contraseña actualizada correctamente.' });
        } catch (error) {
            return res.status(500).json({ message: 'Error updating admin password', error });
        }
    }

    if (req.method !== 'POST') {
        res.setHeader('Allow', ['GET', 'POST', 'PATCH']);
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const password = String(req.body?.password ?? '');

    if (!email) {
        return res.status(400).json({ message: 'Email is required' });
    }

    if (!isAdminPasswordFormatValid(password)) {
        return res.status(400).json({ message: `La contraseña debe tener al menos ${ADMIN_PASSWORD_MIN_LENGTH} caracteres.` });
    }

    try {
        const newAdmin = await db.admin.create({
            data: {
                email,
                passwordHash: hashAdminPassword(password),
                restaurantId: adminSession.restaurantId,
            },
            select: adminListSelect,
        });

        return res.status(201).json(newAdmin);
    } catch (error) {
        if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
            return res.status(409).json({ message: 'Ese email ya existe como administrador.' });
        }

        return res.status(500).json({ message: 'Error adding admin', error });
    }
}