const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Prisma (Supabase Postgres)
const prisma = require('./prisma/client');

// Import routes
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const mediaRoutes = require('./routes/media');
const exportRoutes = require('./routes/export');
const userRoutes = require('./routes/users');
const internalRoutes = require('./routes/internal');

// Import middleware
const { authMiddleware } = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');

// Create Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  message: 'Too many requests from this IP, please try again later.'
});

// Middleware
app.use(helmet());
app.use(compression());
app.use(limiter);
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint (checks Prisma/Postgres connectivity)
app.get('/health', async (req, res) => {
  let db = 'unknown';
  try {
    await prisma.$queryRaw`SELECT 1`;
    db = 'ok';
  } catch (e) {
    db = 'error';
  }

  res.status(200).json({
    success: true,
    status: 'OK',
    db,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', authMiddleware, projectRoutes);
app.use('/api/media', authMiddleware, mediaRoutes);
app.use('/api/export', authMiddleware, exportRoutes);
app.use('/api/users', authMiddleware, userRoutes);
// Internal admin-only routes (auth/x-internal-key inside router)
app.use('/api/internal', internalRoutes);

// WebSocket for real-time updates
const http = require('http');
const WebSocket = require('ws');

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws, req) => {
  console.log('New WebSocket connection');
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('WebSocket message:', data);
      
      switch (data.type) {
        case 'join_project':
          ws.projectId = data.projectId;
          ws.send(JSON.stringify({ type: 'joined', projectId: data.projectId }));
          break;
        case 'timeline_update':
          wss.clients.forEach(client => {
            if (client !== ws && 
                client.readyState === WebSocket.OPEN && 
                client.projectId === ws.projectId) {
              client.send(JSON.stringify(data));
            }
          });
          break;
        default:
          console.log('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('WebSocket message parse error:', error);
    }
  });

  ws.on('close', () => {
    console.log('WebSocket connection closed');
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Error handling middleware
app.use(errorHandler.errorHandler);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(async () => {
    console.log('Process terminated');
    // Prisma uses lazy connections; optional explicit disconnect:
    try { await prisma.$disconnect(); } catch {}
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(async () => {
    console.log('Process terminated');
    try { await prisma.$disconnect(); } catch {}
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 FlickMV server running on port ${PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
  console.log(`🌐 WebSocket URL: ws://localhost:${PORT}`);
});

module.exports = app;