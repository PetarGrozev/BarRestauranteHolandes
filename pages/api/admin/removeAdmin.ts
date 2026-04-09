import type { NextApiRequest, NextApiResponse } from 'next';
import { getAdminSessionFromApiRequest } from '../../../lib/auth';
import { db } from '../../../lib/db';

export default async function removeAdmin(req: NextApiRequest, res: NextApiResponse) {
    const adminSession = getAdminSessionFromApiRequest(req);
    if (!adminSession) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    if (req.method !== 'DELETE') {
        res.setHeader('Allow', ['DELETE']);
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const adminId = Number(req.body?.adminId);

    if (!Number.isInteger(adminId) || adminId <= 0) {
        return res.status(400).json({ message: 'Admin ID is required' });
    }

    try {
        const targetAdmin = await db.admin.findFirst({ where: { id: adminId, restaurantId: adminSession.restaurantId } });
        if (!targetAdmin) {
            return res.status(404).json({ message: 'Administrador no encontrado.' });
        }

        await db.admin.delete({
            where: { id: adminId },
        });
        return res.status(200).json({ message: 'Admin removed successfully' });
    } catch (error) {
        if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2025') {
            return res.status(404).json({ message: 'Administrador no encontrado.' });
        }

        return res.status(500).json({ message: 'Error removing admin', error });
    }
}