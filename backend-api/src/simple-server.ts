import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        service: 'OP3 Backend API'
    });
});

// API routes for setup
app.post('/api/v1/setup/test-connection', (req, res) => {
    const { database } = req.body;

    // Simple validation
    if (!database) {
        return res.status(400).json({
            success: false,
            message: 'Database configuration is required'
        });
    }

    // Mock successful connection for now
    return res.json({
        success: true,
        message: 'Connection test successful',
        connectionInfo: {
            type: database.type || 'test',
            database: database.database || 'test',
            connected: true
        }
    });
});

app.post('/api/v1/setup/database', (req, res) => {
    const { database } = req.body;

    if (!database) {
        return res.status(400).json({
            success: false,
            message: 'Database configuration is required'
        });
    }

    return res.json({
        success: true,
        message: 'Database configuration saved successfully',
        step: 'database'
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

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: err.message
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
