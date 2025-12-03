import type { NextApiRequest, NextApiResponse } from 'next';
import { InitSocketServer } from '@/lib/notifications';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      // Initialize Socket.IO server on Node.js HTTP server
      InitSocketServer(res);
      res.status(200).send('WebSocket server is running');
    } catch (error: any) {
      console.error('Error initializing WebSocket server:', error);
      res.status(500).send(`Error initializing WebSocket server: ${error.message}`);
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 