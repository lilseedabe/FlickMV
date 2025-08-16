const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('combined'));
app.use(express.json());

// Basic API endpoints
app.get('/api/', (req, res) => {
  res.json({ 
    success: true, 
    message: 'FlickMV API Server Running',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    status: 'healthy',
    uptime: process.uptime()
  });
});

app.get('/api/status', (req, res) => {
  res.json({
    success: true,
    server: 'FlickMV API',
    environment: process.env.NODE_ENV || 'development',
    memory: process.memoryUsage(),
    version: '1.0.0'
  });
});

// Health check for frontend
app.get('/api/internal/status', (req, res) => {
  res.json({
    success: true,
    message: 'Internal API is running'
  });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`🚀 FlickMV Basic API running on port ${PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
});
