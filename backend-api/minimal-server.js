const http = require('http');
const url = require('url');

const PORT = process.env.PORT || 3001;

// Helper function to parse JSON body
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
  });
}

// Helper function to send JSON response
function sendJSON(res, data, statusCode = 200) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': 'http://localhost:3000',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true'
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  const method = req.method;

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': 'http://localhost:3000',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true'
    });
    res.end();
    return;
  }

  try {
    // Health check
    if (path === '/health' && method === 'GET') {
      sendJSON(res, {
        status: 'OK',
        timestamp: new Date().toISOString(),
        service: 'OP3 Backend API'
      });
      return;
    }

    // API info
    if (path === '/api/v1' && method === 'GET') {
      sendJSON(res, {
        name: 'OP3 Backend API',
        version: '1.0.0',
        description: 'Backend API for OP3 application setup and management',
        endpoints: {
          setup: '/api/v1/setup',
          health: '/health'
        }
      });
      return;
    }

    // Test connection
    if (path === '/api/v1/setup/test-connection' && method === 'POST') {
      const body = await parseBody(req);
      const { database } = body;
      
      // Simulate connection test delay
      setTimeout(() => {
        sendJSON(res, {
          success: true,
          message: `${database?.type || 'Database'} connection test successful`,
          connectionInfo: {
            type: database?.type || 'test',
            database: database?.database || 'test',
            connected: true
          }
        });
      }, 1000);
      return;
    }

    // Save database config
    if (path === '/api/v1/setup/database' && method === 'POST') {
      const body = await parseBody(req);
      const { database } = body;
      
      sendJSON(res, {
        success: true,
        message: 'Database configuration saved successfully',
        step: 'database',
        data: {
          type: database?.type,
          database: database?.database
        }
      });
      return;
    }

    // Setup status
    if (path === '/api/v1/setup/status' && method === 'GET') {
      sendJSON(res, {
        success: true,
        setup: {
          database: {
            configured: false,
            type: null
          }
        }
      });
      return;
    }

    // 404 handler
    sendJSON(res, {
      error: 'Route not found',
      path: path
    }, 404);

  } catch (error) {
    console.error('Server error:', error);
    sendJSON(res, {
      error: 'Internal server error',
      message: error.message
    }, 500);
  }
});

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});
