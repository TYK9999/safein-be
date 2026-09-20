import { io } from 'socket.io-client';
import { config as loadDotenv } from 'dotenv';

loadDotenv();

const port = process.env.PORT ?? '3000';
const baseUrl = `http://127.0.0.1:${port}`;

const socket = io(`${baseUrl}/realtime`, {
  auth: {
    clientType: 'backoffice',
    tenantId: 1,
  },
  transports: ['websocket'],
  timeout: 5000,
});

const timer = setTimeout(() => {
  console.error('Realtime smoke timed out');
  socket.close();
  process.exit(1);
}, 8000);

socket.on('connect', () => {
  clearTimeout(timer);
  console.log(`Realtime smoke OK (socket ${socket.id})`);
  socket.close();
  process.exit(0);
});

socket.on('connect_error', (error) => {
  clearTimeout(timer);
  console.error(`Realtime smoke failed: ${error.message}`);
  process.exit(1);
});
