import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../lib/db';

export default async function addAdmin(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { email } = req.body;

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
        return res.status(500).json({ message: 'Error adding admin', error });
    }
}