import { NextApiRequest, NextApiResponse } from 'next';
import { sendMagicLink } from '../../../lib/auth';

export default async function magic(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'POST') {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        try {
            await sendMagicLink(email);
            return res.status(200).json({ message: 'Magic link sent' });
        } catch (error) {
            return res.status(500).json({ message: 'Error sending magic link' });
        }
    }

    return res.setHeader('Allow', ['POST']).status(405).end(`Method ${req.method} Not Allowed`);
}