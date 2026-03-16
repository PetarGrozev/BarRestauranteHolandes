import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../lib/db';

export default async function removeAdmin(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'DELETE') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { adminId } = req.body;

    if (!adminId) {
        return res.status(400).json({ message: 'Admin ID is required' });
    }

    try {
        await db.admin.delete({
            where: { id: adminId },
        });
        return res.status(200).json({ message: 'Admin removed successfully' });
    } catch (error) {
        return res.status(500).json({ message: 'Error removing admin', error });
    }
}