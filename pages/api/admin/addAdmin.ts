import type { NextApiRequest, NextApiResponse } from 'next';
import { getAdminSessionFromApiRequest } from '../../../lib/auth';
import { db } from '../../../lib/db';

export default async function addAdmin(req: NextApiRequest, res: NextApiResponse) {
    if (!getAdminSessionFromApiRequest(req)) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    if (req.method === 'GET') {
        try {
            const admins = await db.admin.findMany({
                orderBy: { email: 'asc' },
            });

            return res.status(200).json(admins);
        } catch (error) {
            return res.status(500).json({ message: 'Error fetching admins', error });
        }
    }

    if (req.method !== 'POST') {
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const email = String(req.body?.email ?? '').trim().toLowerCase();

    if (!email) {
        return res.status(400).json({ message: 'Email is required' });
    }

    try {
        const newAdmin = await db.admin.create({
            data: {
                email,
            },
        });

        return res.status(201).json(newAdmin);
    } catch (error) {
        if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
            return res.status(409).json({ message: 'Ese email ya existe como administrador.' });
        }

        return res.status(500).json({ message: 'Error adding admin', error });
    }
}