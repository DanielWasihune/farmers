const path = require('path');

// Writable path for uploads on Koyeb (project root)
const UPLOADS_DIR = path.join(process.cwd(), 'Uploads');

const CORS_CONFIG = {
  origin: '*', // Allows any origin
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Include all necessary methods
  allowedHeaders: ['Authorization', 'Content-Type', 'Accept'], // Add Content-Type and Accept
  credentials: true,
};

const SOCKET_CONFIG = {
  path: '/socket.io/',
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
};

module.exports = { UPLOADS_DIR, CORS_CONFIG, SOCKET_CONFIG };