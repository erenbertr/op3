import { Express } from 'express';
import setupRouter from './setup';
import workspaceRouter from './workspace';
import workspaceGroupRouter from './workspace-group';
import personalitiesRouter from './personalities';
import chatRouter from './chat';
import aiProvidersRouter from './ai-providers';
import statisticsRouter from './statistics';
import authRouter from './auth';
import filesRouter from './files';

export const setupRoutes = (app: Express): void => {
    // API prefix
    const API_PREFIX = '/api/v1';

    // Setup routes
    app.use(`${API_PREFIX}/setup`, setupRouter);

    // Auth routes
    app.use(`${API_PREFIX}/auth`, authRouter);

    // Workspace routes
    app.use(`${API_PREFIX}/workspace`, workspaceRouter);

    // Workspace group routes
    app.use(`${API_PREFIX}/workspace-groups`, workspaceGroupRouter);

    // Personalities routes
    app.use(`${API_PREFIX}/personalities`, personalitiesRouter);

    // Chat routes
    app.use(`${API_PREFIX}/chat`, chatRouter);

    // AI Providers routes
    app.use(`${API_PREFIX}/ai-providers`, aiProvidersRouter);

    // Files routes
    app.use(`${API_PREFIX}/files`, filesRouter);

    // Statistics routes
    app.use(`${API_PREFIX}/statistics`, statisticsRouter);

    // API info endpoint
    app.get(`${API_PREFIX}`, (req, res) => {
        res.json({
            name: 'OP3 Backend API',
            version: '1.0.0',
            description: 'Backend API for OP3 application setup and management',
            endpoints: {
                setup: `${API_PREFIX}/setup`,
                auth: `${API_PREFIX}/auth`,
                workspace: `${API_PREFIX}/workspace`,
                workspaceGroups: `${API_PREFIX}/workspace-groups`,
                personalities: `${API_PREFIX}/personalities`,
                chat: `${API_PREFIX}/chat`,
                aiProviders: `${API_PREFIX}/ai-providers`,
                files: `${API_PREFIX}/files`,
                statistics: `${API_PREFIX}/statistics`,
                health: '/health'
            }
        });
    });
};
