import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { setupRoutes } from './routes';
import { errorHandler } from './middleware/errorHandler';
import { setupWebSocketServer } from './services/websocketService';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3005;

// Middleware
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || ['http://localhost:3000', 'http://localhost:3001'],
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

// Setup all API routes
setupRoutes(app);

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Route not found',
        path: req.originalUrl
    });
});

// Global error handler
app.use(errorHandler);

// Create HTTP server
const server = createServer(app);

// Setup WebSocket server
setupWebSocketServer(server);

// Start server
server.listen(PORT, () => {
    console.log(`🚀 OP3 Backend API running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🔗 API endpoints: http://localhost:${PORT}/api/v1`);
    console.log(`🔌 WebSocket server: ws://localhost:${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
