import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { registerSocketHandlers } from './socket/handlers';
import { getQueueState, getAnalytics, getActivityLog } from './controllers/queueController';

const app = express();
const httpServer = createServer(app);

const isProd = process.env.NODE_ENV === 'production';
const allowedOrigins = isProd
  ? ['*']
  : ['http://localhost:5173', 'http://localhost:4173'];

const io = new Server(httpServer, {
  cors: { origin: allowedOrigins, methods: ['GET', 'POST'] },
  perMessageDeflate: true,
});

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

// REST endpoints (fallback / initial load)
app.get('/api/queue', getQueueState);
app.get('/api/analytics', getAnalytics);
app.get('/api/activity', getActivityLog);
app.get('/api/health', (_req, res) => res.json({ status: 'ok', ts: new Date() }));

// Serve React build in production
if (isProd) {
  const clientDist = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

// Socket.IO
io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);
  registerSocketHandlers(io, socket);
});

const PORT = process.env.PORT ?? 3001;
httpServer.listen(PORT, () => {
  console.log(`Queue Cure server running on port ${PORT}`);
});
