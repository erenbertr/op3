import { Express } from 'express';
import setupRouter from './setup';
import workspaceRouter from './workspace';
import personalitiesRouter from './personalities';
import chatRouter from './chat';
import aiProvidersRouter from './ai-providers';

export const setupRoutes = (app: Express): void => {
    // API prefix
    const API_PREFIX = '/api/v1';

    // Setup routes
    app.use(`${API_PREFIX}/setup`, setupRouter);

    // Workspace routes
    app.use(`${API_PREFIX}/workspace`, workspaceRouter);

    // Personalities routes
    app.use(`${API_PREFIX}/personalities`, personalitiesRouter);

    // Chat routes
    app.use(`${API_PREFIX}/chat`, chatRouter);

    // AI Providers routes
    app.use(`${API_PREFIX}/ai-providers`, aiProvidersRouter);

    // API info endpoint
    app.get(`${API_PREFIX}`, (req, res) => {
        res.json({
            name: 'OP3 Backend API',
            version: '1.0.0',
            description: 'Backend API for OP3 application setup and management',
            endpoints: {
                setup: `${API_PREFIX}/setup`,
                workspace: `${API_PREFIX}/workspace`,
                personalities: `${API_PREFIX}/personalities`,
                chat: `${API_PREFIX}/chat`,
                aiProviders: `${API_PREFIX}/ai-providers`,
                health: '/health'
            }
        });
    });
};
