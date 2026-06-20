import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { registerSocketHandlers } from './socket/handlers';
import { getQueueState, getAnalytics, getActivityLog } from './controllers/queueController';

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:4173'],
    methods: ['GET', 'POST'],
  },
  // Enable per-message deflate for large queue payloads
  perMessageDeflate: true,
});

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:4173'] }));
app.use(express.json());

// REST endpoints (fallback / initial load)
app.get('/api/queue', getQueueState);
app.get('/api/analytics', getAnalytics);
app.get('/api/activity', getActivityLog);
app.get('/api/health', (_req, res) => res.json({ status: 'ok', ts: new Date() }));

// Socket.IO
io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);
  registerSocketHandlers(io, socket);
});

const PORT = process.env.PORT ?? 3001;
httpServer.listen(PORT, () => {
  console.log(`Queue Cure server running on port ${PORT}`);
});
