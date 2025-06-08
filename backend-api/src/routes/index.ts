import { Express } from 'express';
import setupRouter from './setup';
import workspaceRouter from './workspace';

export const setupRoutes = (app: Express): void => {
    // API prefix
    const API_PREFIX = '/api/v1';

    // Setup routes
    app.use(`${API_PREFIX}/setup`, setupRouter);

    // Workspace routes
    app.use(`${API_PREFIX}/workspace`, workspaceRouter);

    // API info endpoint
    app.get(`${API_PREFIX}`, (req, res) => {
        res.json({
            name: 'OP3 Backend API',
            version: '1.0.0',
            description: 'Backend API for OP3 application setup and management',
            endpoints: {
                setup: `${API_PREFIX}/setup`,
                workspace: `${API_PREFIX}/workspace`,
                health: '/health'
            }
        });
    });
};
