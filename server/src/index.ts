import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import http from 'http';
import WebSocket from 'ws';

// Load environment variables
dotenv.config();

// Prisma (Supabase Postgres)
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Import routes (will need to be converted to TypeScript)
import authRoutes from './routes/auth';
import projectRoutes from './routes/projects';
import mediaRoutes from './routes/media';
import exportRoutes from './routes/export';
import userRoutes from './routes/users';
import internalRoutes from './routes/internal';

// Import middleware (will need to be converted to TypeScript)
import authMiddleware from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';

// Types
interface HealthResponse {
  success: boolean;
  status: string;
  db: string;
  timestamp: string;
  uptime: number;
  memory: NodeJS.MemoryUsage;
  version: string;
}

interface WebSocketMessage {
  type: string;
  projectId?: string;
  [key: string]: any;
}

interface ExtendedWebSocket extends WebSocket {
  projectId?: string;
}

// Create Express app
const app: Application = express();
const PORT: number = parseInt(process.env.PORT || '5000', 10);

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
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check endpoint (checks Prisma/Postgres connectivity)
app.get('/health', async (req: Request, res: Response): Promise<void> => {
  let db = 'unknown';
  try {
    await prisma.$queryRaw`SELECT 1`;
    db = 'ok';
  } catch (e) {
    console.error('Database health check failed:', e);
    db = 'error';
  }

  const healthResponse: HealthResponse = {
    success: true,
    status: 'OK',
    db,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.2.0'
  };

  res.status(200).json(healthResponse);
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
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws: ExtendedWebSocket, req: http.IncomingMessage) => {
  console.log('New WebSocket connection from:', req.socket.remoteAddress);
  
  ws.on('message', (message: WebSocket.Data) => {
    try {
      const data: WebSocketMessage = JSON.parse(message.toString());
      console.log('WebSocket message:', data.type, data.projectId);
      
      switch (data.type) {
        case 'join_project':
          if (typeof data.projectId === 'string') {
            ws.projectId = data.projectId;
            ws.send(JSON.stringify({ 
              type: 'joined', 
              projectId: data.projectId,
              timestamp: new Date().toISOString()
            }));
          } else {
            ws.send(JSON.stringify({ 
              type: 'error', 
              message: 'Invalid projectId' 
            }));
          }
          break;
          
        case 'timeline_update':
          // Broadcast to other clients in the same project
          wss.clients.forEach((client: ExtendedWebSocket) => {
            if (client !== ws && 
                client.readyState === WebSocket.OPEN && 
                client.projectId === ws.projectId) {
              client.send(JSON.stringify({
                ...data,
                timestamp: new Date().toISOString()
              }));
            }
          });
          break;
          
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong' }));
          break;
          
        default:
          console.log('Unknown message type:', data.type);
          ws.send(JSON.stringify({ 
            type: 'error', 
            message: `Unknown message type: ${data.type}` 
          }));
      }
    } catch (error) {
      console.error('WebSocket message parse error:', error);
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'Invalid JSON message' 
      }));
    }
  });

  ws.on('close', (code: number, reason: Buffer) => {
    console.log(`WebSocket connection closed: ${code} ${reason.toString()}`);
  });

  ws.on('error', (error: Error) => {
    console.error('WebSocket error:', error);
  });

  // Send welcome message
  ws.send(JSON.stringify({ 
    type: 'welcome', 
    message: 'Connected to FlickMV WebSocket',
    timestamp: new Date().toISOString()
  }));
});

// 404 handler
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use(errorHandler);

// Graceful shutdown
const gracefulShutdown = async (signal: string): Promise<void> => {
  console.log(`${signal} received, shutting down gracefully`);
  
  // Close WebSocket server
  wss.close((err) => {
    if (err) {
      console.error('Error closing WebSocket server:', err);
    }
  });
  
  // Close HTTP server
  server.close(async () => {
    console.log('HTTP server closed');
    
    // Disconnect from database
    try {
      await prisma.$disconnect();
      console.log('Database disconnected');
    } catch (error) {
      console.error('Error disconnecting from database:', error);
    }
    
    console.log('Process terminated');
    process.exit(0);
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
server.listen(PORT, () => {
  console.log(`🚀 FlickMV server running on port ${PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
  console.log(`🌐 WebSocket URL: ws://localhost:${PORT}`);
  console.log(`🗄️  Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
});

export default app;
