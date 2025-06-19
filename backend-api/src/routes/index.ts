import { Express } from 'express';
import setupRouter from './setup';
import workspaceRouter from './workspace';
import workspaceGroupRouter from './workspace-group';
import workspaceOpenRouterRouter from './workspace-openrouter';
import workspaceAIFavoritesRouter from './workspace-ai-favorites';
import workspacePersonalityFavoritesRouter from './workspace-personality-favorites';
import globalOpenRouterRouter from './global-openrouter';
import personalitiesRouter from './personalities';
import chatRouter from './chat';
import aiProvidersRouter from './ai-providers';
import statisticsRouter from './statistics';
import authRouter from './auth';
import filesRouter from './files';
import openaiProvidersRouter from './openai-providers';
import openaiModelConfigsRouter from './openai-model-configs';
import grokModelConfigsRouter from './grok-model-configs';
import anthropicModelConfigsRouter from './anthropic-model-configs';
import googleModelConfigsRouter from './google-model-configs';
import googleProvidersRouter from './google-providers';
import grokProvidersRouter from './grok-providers';
import anthropicProvidersRouter from './anthropic-providers';
import shareRouter from './share';
import msgRouter from './msg';
import adminRouter from './admin';

export const setupRoutes = (app: Express): void => {
    // API prefix
    const API_PREFIX = '/api/v1';

    // Setup routes
    app.use(`${API_PREFIX}/setup`, setupRouter);

    // Auth routes
    app.use(`${API_PREFIX}/auth`, authRouter);

    // Admin routes (requires authentication and admin role)
    app.use(`${API_PREFIX}/admin`, adminRouter);

    // Workspace routes
    app.use(`${API_PREFIX}/workspace`, workspaceRouter);

    // Workspace group routes
    app.use(`${API_PREFIX}/workspace-groups`, workspaceGroupRouter);

    // Workspace OpenRouter routes
    app.use(`${API_PREFIX}/workspace-openrouter`, workspaceOpenRouterRouter);

    // Workspace AI Favorites routes
    app.use(`${API_PREFIX}/workspace-ai-favorites`, workspaceAIFavoritesRouter);

    // Workspace Personality Favorites routes
    app.use(`${API_PREFIX}/workspace-personality-favorites`, workspacePersonalityFavoritesRouter);

    // Global OpenRouter routes
    app.use(`${API_PREFIX}/openrouter`, globalOpenRouterRouter);

    // Personalities routes
    app.use(`${API_PREFIX}/personalities`, personalitiesRouter);

    // Chat routes
    app.use(`${API_PREFIX}/chat`, chatRouter);

    // AI Providers routes
    app.use(`${API_PREFIX}/ai-providers`, aiProvidersRouter);

    // OpenAI Providers routes
    app.use(`${API_PREFIX}/openai-providers`, openaiProvidersRouter);

    // OpenAI Model Configs routes
    app.use(`${API_PREFIX}/openai-model-configs`, openaiModelConfigsRouter);

    // Grok Model Configs routes
    app.use(`${API_PREFIX}/grok-model-configs`, grokModelConfigsRouter);

    // Anthropic Model Configs routes
    app.use(`${API_PREFIX}/anthropic-model-configs`, anthropicModelConfigsRouter);

    // Google Model Configs routes
    app.use(`${API_PREFIX}/google-model-configs`, googleModelConfigsRouter);

    // Google Providers routes
    app.use(`${API_PREFIX}/google-providers`, googleProvidersRouter);

    // Grok Providers routes
    app.use(`${API_PREFIX}/grok-providers`, grokProvidersRouter);

    // Anthropic Providers routes
    app.use(`${API_PREFIX}/anthropic-providers`, anthropicProvidersRouter);

    // Files routes
    app.use(`${API_PREFIX}/files`, filesRouter);

    // Statistics routes
    app.use(`${API_PREFIX}/statistics`, statisticsRouter);

    // Share routes (public access - no authentication required)
    app.use(`${API_PREFIX}/share`, shareRouter);

    // Message share routes (public access - no authentication required)
    app.use(`${API_PREFIX}/msg`, msgRouter);

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
                workspaceOpenRouter: `${API_PREFIX}/workspace-openrouter`,
                workspaceAIFavorites: `${API_PREFIX}/workspace-ai-favorites`,
                workspacePersonalityFavorites: `${API_PREFIX}/workspace-personality-favorites`,
                openrouter: `${API_PREFIX}/openrouter`,
                personalities: `${API_PREFIX}/personalities`,
                chat: `${API_PREFIX}/chat`,
                aiProviders: `${API_PREFIX}/ai-providers`,
                openaiProviders: `${API_PREFIX}/openai-providers`,
                openaiModelConfigs: `${API_PREFIX}/openai-model-configs`,
                grokModelConfigs: `${API_PREFIX}/grok-model-configs`,
                anthropicModelConfigs: `${API_PREFIX}/anthropic-model-configs`,
                googleModelConfigs: `${API_PREFIX}/google-model-configs`,
                googleProviders: `${API_PREFIX}/google-providers`,
                grokProviders: `${API_PREFIX}/grok-providers`,
                anthropicProviders: `${API_PREFIX}/anthropic-providers`,
                files: `${API_PREFIX}/files`,
                statistics: `${API_PREFIX}/statistics`,
                health: '/health'
            }
        });
    });
};
