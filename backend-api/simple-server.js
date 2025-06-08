const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'OP3 Backend API'
  });
});

// Setup routes
app.post('/api/v1/setup/test-connection', (req, res) => {
  const { database } = req.body;
  
  // Simulate connection test
  setTimeout(() => {
    res.json({
      success: true,
      message: `${database?.type || 'Database'} connection test successful`,
      connectionInfo: {
        type: database?.type || 'test',
        database: database?.database || 'test',
        connected: true
      }
    });
  }, 1000);
});

app.post('/api/v1/setup/database', (req, res) => {
  const { database } = req.body;
  
  res.json({
    success: true,
    message: 'Database configuration saved successfully',
    step: 'database',
    data: {
      type: database?.type,
      database: database?.database
    }
  });
});

app.get('/api/v1/setup/status', (req, res) => {
  res.json({
    success: true,
    setup: {
      database: {
        configured: false,
        type: null
      }
    }
  });
});

app.get('/api/v1', (req, res) => {
  res.json({
    name: 'OP3 Backend API',
    version: '1.0.0',
    description: 'Backend API for OP3 application setup and management',
    endpoints: {
      setup: '/api/v1/setup',
      health: '/health'
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});
