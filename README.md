# OP3 - AI-Powered Workspace Management Platform

🌐 **Live Demo**: [https://op3.chat](https://op3.chat)

OP3 is a modern, full-stack application that provides AI-powered workspace management with intelligent chat functionality, multi-provider AI integration, and comprehensive workspace organization tools. Built with Next.js 15, TypeScript, and the latest AI technologies.

## 🚀 Features

### 🤖 Advanced AI Integration
- **Multi-Provider Support**: OpenAI (GPT-4o, GPT-4o-mini, O1 models), Google Gemini, Anthropic Claude, Grok, and 100+ models via OpenRouter
- **Vercel AI SDK Integration**: Unified streaming responses across all AI providers with consistent performance
- **Intelligent Chat Sessions**: Real-time streaming responses with typing indicators and smooth animations
- **AI Personality Favorites**: Create and manage custom AI personalities per workspace with drag-and-drop reordering
- **Advanced Capabilities**: Web search, reasoning steps, file attachments, and O1 model support
- **Chat Branching**: Create conversation branches from any message to explore different discussion paths
- **Chat Sharing**: Share conversations publicly with clean, minimal public view pages

### 🏢 Workspace Management
- **Dynamic Workspaces**: Create, organize, and manage multiple workspaces with custom rules and templates
- **Drag & Drop Organization**: Intuitive workspace organization with @dnd-kit and cross-group functionality
- **Workspace Groups**: Organize workspaces into vertical groups with responsive horizontal layouts
- **Scoped Chat Sessions**: Each workspace maintains its own separate chat history and AI configurations
- **Workspace Settings**: Comprehensive settings with horizontal tab layouts and AI provider management

### 📁 File Processing & Search
- **File Upload Integration**: Support for file attachments with OpenAI's file search API and vector stores
- **Document Retrieval**: AI-powered document analysis and retrieval during conversations
- **Web Search Integration**: Real-time web search for supported AI models (GPT-4o, GPT-4o-mini, GPT-4-turbo)
- **Multiple Search Providers**: DuckDuckGo, Bing, and Google Custom Search API support

### 🎨 Modern User Experience
- **shadcn/ui Components**: Beautiful, accessible UI components with consistent design language
- **Dark/Light Theme**: Automatic theme switching with system preference detection and enhanced coding text design
- **Responsive Design**: Mobile-first design that works seamlessly across all devices
- **Progressive Loading**: Skeleton states, delayed spinners, and smooth loading animations
- **Toast Notifications**: Center-top positioned notifications with solid backgrounds and high z-index
- **Stacked Card UI**: Only active cards fully visible with completed/future cards showing minimal edges

### 🔐 Enterprise-Grade Features
- **Multi-Database Support**: MongoDB, MySQL, PostgreSQL, SQLite, Supabase, PlanetScale, Neon, Turso, Convex, Firebase
- **Universal Database Layer**: Single global functions (add, update, delete, get) that automatically handle database type decisions
- **Better Auth Integration**: Secure authentication with JWT and modern auth patterns
- **Role-Based Access**: Admin and user roles with appropriate permissions
- **Setup Wizard**: Guided initial setup for database selection and admin user creation

## 🏗️ Technology Stack

### Frontend
- **Framework**: Next.js 15 with App Router and Turbopack
- **Language**: TypeScript 5.8+
- **Styling**: Tailwind CSS 4.0 with custom animations
- **UI Components**: shadcn/ui (Radix UI primitives)
- **State Management**: TanStack Query (React Query) for server state management
- **Drag & Drop**: @dnd-kit for workspace organization and AI favorites reordering
- **Authentication**: Better Auth client integration
- **Theme**: next-themes for dark/light mode with enhanced coding text design
- **Icons**: Lucide React
- **Markdown**: React Markdown with syntax highlighting and math support
- **Forms**: React Hook Form with Zod validation

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js with TypeScript
- **AI Integration**: Vercel AI SDK for unified streaming across all providers
- **Authentication**: Better Auth with JWT and secure session management
- **Real-time**: WebSocket (ws library) for live chat updates
- **File Upload**: Multer with OpenAI file processing
- **Security**: Helmet, CORS, bcrypt for comprehensive security
- **Logging**: Morgan for request logging
- **Validation**: Zod for runtime type checking

### Database Architecture
- **Universal Database Layer**: Single abstraction supporting multiple database types
- **Primary**: MongoDB with native driver
- **Relational**: MySQL, PostgreSQL with connection pooling
- **Local Development**: SQLite for quick setup
- **Cloud Providers**: Supabase, PlanetScale, Neon, Turso
- **Modern Platforms**: Convex, Firebase Firestore
- **Automatic Type Handling**: Database-agnostic operations with automatic type conversion

### AI Provider Ecosystem
- **Vercel AI SDK**: Unified interface for all AI providers with consistent streaming
- **OpenAI**: GPT-4o, GPT-4o-mini, O1 models with function calling, file search, web search
- **Google**: Gemini Pro and Flash models with proper API endpoint handling
- **Anthropic**: Claude 3.5 Sonnet, Claude 3 Haiku, and Claude 3 Opus
- **xAI**: Grok models with real-time capabilities
- **OpenRouter**: 100+ models from various providers through unified API
- **Real-time Features**: Streaming responses, reasoning steps, web search integration

## 📁 Project Structure

```
OP3/
├── frontend-next/              # Next.js 15 frontend application
│   ├── src/
│   │   ├── app/               # Next.js App Router pages and layouts
│   │   │   ├── (auth)/       # Authentication pages
│   │   │   ├── setup/        # Initial setup wizard
│   │   │   ├── ws/           # Workspace-scoped pages (/ws/{workspaceId})
│   │   │   ├── ai-providers/ # AI provider configuration pages
│   │   │   └── share/        # Public chat sharing pages
│   │   ├── components/        # React components
│   │   │   ├── ui/           # shadcn/ui base components
│   │   │   ├── workspace/    # Workspace management and chat components
│   │   │   │   ├── chat/     # Chat interface, streaming, and branching
│   │   │   │   ├── ai-providers/ # AI provider setup and configuration
│   │   │   │   └── settings/ # Workspace settings and favorites
│   │   │   ├── setup/        # Setup wizard components
│   │   │   └── shared/       # Shared utility components
│   │   ├── lib/              # Utility functions and configurations
│   │   │   ├── api/          # API client functions for each service
│   │   │   ├── hooks/        # Custom React hooks with TanStack Query
│   │   │   ├── auth.ts       # Better Auth configuration
│   │   │   └── utils.ts      # Helper utilities and constants
│   │   ├── types/            # TypeScript type definitions
│   │   └── styles/           # Global styles and Tailwind configuration
│   ├── components.json       # shadcn/ui configuration
│   ├── tailwind.config.js    # Tailwind CSS configuration
│   └── package.json
├── backend-api/               # Express.js backend API
│   ├── src/
│   │   ├── routes/           # API route handlers organized by feature
│   │   │   ├── auth.ts       # Authentication routes
│   │   │   ├── chat.ts       # Chat and streaming routes
│   │   │   ├── workspace.ts  # Workspace management routes
│   │   │   ├── ai-providers/ # AI provider configuration routes
│   │   │   └── msg.ts        # Public message sharing routes
│   │   ├── services/         # Business logic services
│   │   │   ├── vercelAIChatService.ts    # Unified AI chat service
│   │   │   ├── vercelAIProviderService.ts # AI provider management
│   │   │   ├── universalDatabaseService.ts # Database abstraction layer
│   │   │   ├── webSearchService.ts       # Web search integration
│   │   │   ├── openaiFileService.ts      # File upload and processing
│   │   │   └── chatServiceNew.ts         # Chat session management
│   │   ├── middleware/       # Express middleware
│   │   ├── types/           # TypeScript type definitions
│   │   ├── config/          # Database and configuration
│   │   ├── utils/           # Utility functions and error handling
│   │   └── index.ts         # Application entry point
│   ├── data/                # Local data storage and uploads
│   └── package.json
├── package.json              # Root monorepo configuration with workspaces
├── AGENT.md                  # Development and architecture documentation
├── CHAT_SCROLL_ENHANCEMENT.md # Chat scroll behavior documentation
└── README.md                # This file
```

## 🚀 Getting Started

### Prerequisites

- **Node.js**: >= 18.0.0 (LTS recommended)
- **npm**: >= 8.0.0 or **yarn**: >= 1.22.0
- **Database**: MongoDB (recommended), PostgreSQL, MySQL, or SQLite for local development

### Quick Start

1. **Clone the repository**:
```bash
git clone https://github.com/erenbertr/op3.git
cd OP3
```

2. **Install dependencies**:
```bash
npm install
```
This installs dependencies for both frontend and backend workspaces using npm workspaces.

3. **Start development servers**:
```bash
npm run dev
```
This starts both frontend (http://localhost:3000) and backend (http://localhost:3006) concurrently.

4. **Complete setup**:
   - Open http://localhost:3000 in your browser
   - Follow the setup wizard to configure your database
   - Create an admin user account
   - Configure AI providers at `/ai-providers`

### Environment Configuration

#### Backend Environment (`.env` in `backend-api/`)

Create a `.env` file in the `backend-api` directory:

```env
# Server Configuration
PORT=3006
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# JWT Secret (generate a secure random string)
JWT_SECRET=your-super-secret-jwt-key-here-change-in-production

# Better Auth Configuration
BETTER_AUTH_SECRET=your-auth-secret-key-change-in-production

# Database Configuration (will be set through setup wizard)
# MONGODB_URI=mongodb://localhost:27017/op3
# DATABASE_URL=postgresql://user:password@localhost:5432/op3
```

#### Frontend Environment (optional, `.env.local` in `frontend-next/`)

```env
# API URL (defaults to http://localhost:3006/api/v1)
NEXT_PUBLIC_API_URL=http://localhost:3006/api/v1

# Better Auth Configuration
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=your-secret-key-change-in-production
```

### Database Setup Options

OP3's universal database layer supports multiple database types. Choose based on your needs:

#### Option 1: MongoDB (Recommended for Production)
```bash
# Local MongoDB
brew install mongodb/brew/mongodb-community  # macOS
sudo apt-get install mongodb  # Ubuntu

# Start MongoDB
brew services start mongodb/brew/mongodb-community  # macOS
sudo systemctl start mongod  # Ubuntu

# Connection string: mongodb://localhost:27017/op3
```

#### Option 2: PostgreSQL (Great for Relational Data)
```bash
# Install PostgreSQL
brew install postgresql  # macOS
sudo apt-get install postgresql postgresql-contrib  # Ubuntu

# Start PostgreSQL
brew services start postgresql  # macOS
sudo systemctl start postgresql  # Ubuntu

# Connection string: postgresql://user:password@localhost:5432/op3
```

#### Option 3: SQLite (Perfect for Development)
No installation required - just specify a file path during setup.
```
# Connection string: ./data/op3.db
```

#### Option 4: Cloud Databases
- **Supabase**: Full PostgreSQL with real-time features
- **PlanetScale**: MySQL-compatible with branching
- **Neon**: Serverless PostgreSQL
- **MongoDB Atlas**: Managed MongoDB service

### Development Commands

```bash
# Start both frontend and backend
npm run dev

# Build both applications
npm run build

# Run in production mode
npm run start

# Type checking
npm run type-check

# Linting
npm run lint
```

### Individual Service Commands

```bash
# Frontend only (Next.js on port 3000)
npm run dev:frontend

# Backend only (Express.js on port 3006)
npm run dev:backend

# Build specific services
npm run build:frontend
npm run build:backend
```

## 🔧 Configuration & Setup

### AI Provider Configuration

After completing the initial setup, configure AI providers at `/ai-providers`:

#### OpenAI Setup
1. **Navigate to** `/ai-providers/openai`
2. **Add API Key**: Enter your OpenAI API key
3. **Select Models**: Choose from GPT-4o, GPT-4o-mini, O1 models, etc.
4. **Configure Capabilities**: Enable search, reasoning, file attachments
5. **Custom Naming**: Give models custom names for easy identification

#### Google Gemini Setup
1. **Navigate to** `/ai-providers/google`
2. **Add API Key**: Enter your Google AI Studio API key
3. **Select Models**: Choose from Gemini Pro, Gemini Flash models
4. **Real-time Fetching**: Models are fetched directly from Google's API

#### Anthropic Claude Setup
1. **Navigate to** `/ai-providers/anthropic`
2. **Add API Key**: Enter your Anthropic API key
3. **Select Models**: Choose from Claude 3.5 Sonnet, Claude 3 Haiku, Claude 3 Opus
4. **Capability Icons**: Models show search, think, and attach capabilities

#### Grok (xAI) Setup
1. **Navigate to** `/ai-providers/grok`
2. **Add API Key**: Enter your xAI API key
3. **Select Models**: Choose from available Grok models including Grok-3
4. **Real-time Integration**: Direct API integration for model fetching

#### OpenRouter Setup
1. **Navigate to** `/ai-providers/openrouter`
2. **Add API Key**: Enter your OpenRouter API key
3. **Browse 100+ Models**: Access models from multiple providers
4. **Unified Interface**: Consistent experience across all models

### Workspace Management

#### Creating and Organizing Workspaces
1. **Create Workspaces**: Click "New Workspace" to create separate contexts
2. **Workspace Groups**: Organize workspaces into vertical groups
3. **Drag & Drop**: Use @dnd-kit for intuitive organization with cross-group functionality
4. **Workspace Settings**: Configure rules, AI preferences, and personality favorites

#### AI Personality Favorites
1. **Access via Workspace Menu**: Click the 3-dots menu → "Personality Favorites"
2. **Search and Add**: Search through available AI personalities and add favorites
3. **Drag to Reorder**: Use drag-and-drop to reorder favorites
4. **Quick Selection**: Favorited personalities appear above chat input for quick selection

### Advanced Configuration

#### Database Connection Examples

```bash
# MongoDB
mongodb://localhost:27017/op3
mongodb+srv://user:pass@cluster.mongodb.net/op3

# PostgreSQL
postgresql://user:password@localhost:5432/op3
postgres://user:pass@host:5432/database

# MySQL
mysql://user:password@localhost:3306/op3

# SQLite
./data/op3.db
/absolute/path/to/database.db

# Cloud Providers
# Supabase: postgresql://postgres:[password]@[host]:5432/postgres
# PlanetScale: mysql://[username]:[password]@[host]/[database]?ssl={"rejectUnauthorized":true}
# Neon: postgresql://[user]:[password]@[endpoint]/[dbname]?sslmode=require
```

#### Environment Variables Reference

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | Backend server port | `3006` | No |
| `NODE_ENV` | Environment mode | `development` | No |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:3000` | No |
| `JWT_SECRET` | JWT signing secret | - | **Yes** |
| `BETTER_AUTH_SECRET` | Auth encryption secret | - | **Yes** |
| `MONGODB_URI` | MongoDB connection string | Set via setup | No |
| `DATABASE_URL` | Generic database URL | Set via setup | No |
| `NEXT_PUBLIC_API_URL` | Frontend API URL | `http://localhost:3006/api/v1` | No |

## 📜 Available Scripts

### Root Level Commands (Monorepo)
```bash
npm run dev          # Start both frontend and backend concurrently
npm run build        # Build both applications for production
npm run start        # Start both applications in production mode
npm run lint         # Lint both frontend and backend
npm run type-check   # TypeScript type checking for both apps

# Individual service commands
npm run dev:frontend    # Start only Next.js frontend
npm run dev:backend     # Start only Express.js backend
npm run build:frontend  # Build only frontend
npm run build:backend   # Build only backend
```

### Frontend Commands (frontend-next/)
```bash
npm run dev          # Next.js development server with Turbopack
npm run build        # Production build with optimizations
npm run start        # Start production server
npm run lint         # ESLint with Next.js configuration
npm run type-check   # TypeScript type checking
```

### Backend Commands (backend-api/)
```bash
npm run dev          # Development server with nodemon and ts-node
npm run build        # Compile TypeScript to JavaScript
npm run start        # Start compiled production server
npm run type-check   # TypeScript type checking without emit
```

## 🏛️ Architecture Overview

### Frontend Architecture (Next.js 15)

**App Router with Modern Patterns**:
- **Server Components**: Static content, initial data loading, and SEO optimization
- **Client Components**: Interactive features, real-time updates, and user interactions
- **Route Groups**: Organized routing with (auth), setup, ws/{workspaceId}, and ai-providers
- **Parallel Routes**: Efficient loading and navigation between workspace contexts

**State Management Strategy**:
- **TanStack Query**: Server state with intelligent caching, background updates, and optimistic updates
- **React Hooks**: Local component state with custom hooks for complex logic
- **URL-based State**: Workspace navigation and chat session state via URL parameters
- **Context Providers**: Auth, theme, and global application state

**Component Architecture**:
- **shadcn/ui Base**: Accessible, customizable UI primitives with consistent design tokens
- **Feature Components**: Workspace management, chat interface, AI provider setup
- **Layout Components**: Application shell, navigation, and responsive layouts
- **Shared Components**: Reusable utilities, modals, and form components

### Backend Architecture (Express.js + TypeScript)

**Unified AI Integration**:
- **Vercel AI SDK**: Single interface for all AI providers with consistent streaming
- **Universal Database Service**: Database-agnostic operations supporting multiple providers
- **Service Layer**: Clean separation of business logic from route handlers
- **Middleware Stack**: Authentication, validation, error handling, and logging

**Core Services**:
- **VercelAIChatService**: Unified streaming chat with web search, reasoning, and file support
- **VercelAIProviderService**: AI provider management with real-time model fetching
- **UniversalDatabaseService**: Single API for MongoDB, PostgreSQL, MySQL, SQLite operations
- **WebSearchService**: Multi-provider web search (DuckDuckGo, Bing, Google)
- **OpenAIFileService**: File upload, processing, and vector store integration
- **ChatServiceNew**: Session management, branching, and sharing functionality

**API Design**:
- **RESTful Endpoints**: Organized by feature with consistent response patterns
- **WebSocket Integration**: Real-time chat updates and streaming responses
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Authentication**: JWT-based auth with Better Auth integration

### Database Architecture

**Universal Database Layer**:
- **Single Interface**: Unified CRUD operations across all database types
- **Automatic Type Conversion**: Seamless data transformation between database formats
- **Connection Management**: Efficient connection pooling and error handling
- **Migration Support**: Schema management across different database systems

**Data Models**:
- **Users**: Authentication, roles, preferences, and AI provider configurations
- **Workspaces**: Workspace settings, rules, AI favorites, and organization
- **Workspace Groups**: Drag-and-drop organization with sort orders
- **Chat Sessions**: Workspace-scoped conversations with branching support
- **Chat Messages**: Messages with AI metadata, reasoning steps, and file attachments
- **AI Provider Configs**: Model configurations, API keys, and capabilities
- **Personality Favorites**: Workspace-specific AI personality preferences
- **Shared Chats**: Public chat sharing with minimal data exposure
- **File Attachments**: File metadata, OpenAI integration, and processing status

## 🔌 API Endpoints

### Authentication & Setup
```
POST   /api/v1/auth/login              # User login with credentials
POST   /api/v1/auth/verify             # JWT token verification
GET    /api/v1/auth/user               # Get current authenticated user
GET    /api/v1/setup/status            # Check if initial setup is complete
POST   /api/v1/setup/database          # Configure database connection
POST   /api/v1/setup/admin             # Create initial admin user
```

### Workspace Management
```
GET    /api/v1/workspace               # Get user's workspaces and groups
POST   /api/v1/workspace               # Create new workspace
PUT    /api/v1/workspace/:id           # Update workspace settings
DELETE /api/v1/workspace/:id           # Delete workspace
POST   /api/v1/workspace/groups        # Create workspace group
PUT    /api/v1/workspace/groups/:id    # Update workspace group
DELETE /api/v1/workspace/groups/:id    # Delete workspace group
POST   /api/v1/workspace/reorder       # Reorder workspaces with drag-and-drop
```

### Chat & Messaging
```
GET    /api/v1/chat/sessions/:workspaceId    # Get chat sessions for workspace
POST   /api/v1/chat/sessions                # Create new chat session
PUT    /api/v1/chat/sessions/:id             # Update chat session
DELETE /api/v1/chat/sessions/:id             # Delete chat session
POST   /api/v1/chat/sessions/branch          # Create branched chat session
GET    /api/v1/chat/messages/:sessionId      # Get messages for session
POST   /api/v1/chat/stream                   # Stream AI responses (SSE)
POST   /api/v1/chat/share/:sessionId         # Share chat session publicly
GET    /api/v1/msg/:shareId                  # Get shared chat (public access)
```

### AI Provider Configuration
```
GET    /api/v1/ai-providers                  # Get all configured AI providers
POST   /api/v1/openai-providers              # Configure OpenAI provider
GET    /api/v1/openai-providers              # Get OpenAI configurations
POST   /api/v1/google-providers              # Configure Google Gemini provider
GET    /api/v1/google-providers              # Get Google configurations
POST   /api/v1/anthropic-providers           # Configure Anthropic Claude provider
GET    /api/v1/anthropic-providers           # Get Anthropic configurations
POST   /api/v1/grok-providers                # Configure Grok (xAI) provider
GET    /api/v1/grok-providers                # Get Grok configurations
POST   /api/v1/openrouter-providers          # Configure OpenRouter provider
GET    /api/v1/openrouter-providers          # Get OpenRouter configurations
```

### AI Personality Favorites
```
GET    /api/v1/workspace-personality-favorites/:workspaceId    # Get workspace AI favorites
POST   /api/v1/workspace-personality-favorites                # Add AI favorite
DELETE /api/v1/workspace-personality-favorites/:favoriteId    # Remove AI favorite
POST   /api/v1/workspace-personality-favorites/reorder        # Reorder AI favorites
GET    /api/v1/workspace-personality-favorites/:workspaceId/check/:personalityId  # Check if favorited
```

### File Management
```
POST   /api/v1/files/upload               # Upload file for AI processing
GET    /api/v1/files/:sessionId           # Get files for chat session
DELETE /api/v1/files/:fileId              # Delete uploaded file
GET    /api/v1/files/:fileId/status       # Get file processing status
```

## 🧪 Development Guidelines

### Code Organization & Best Practices

#### Frontend Development
- **TypeScript First**: Use strict TypeScript for all components, hooks, and utilities
- **React Patterns**: Prefer composition over inheritance, use custom hooks for logic reuse
- **State Management**: Use TanStack Query for server state, avoid useEffect for data fetching
- **Component Structure**: Keep components under 750 lines, separate into smaller files when needed
- **Error Handling**: Implement proper error boundaries and user-friendly error messages
- **Performance**: Use React.memo judiciously, implement proper loading states with skeletons

#### Backend Development
- **Service Layer**: Separate business logic into services, keep route handlers thin
- **Universal Database**: Use the universal database service for all data operations
- **TypeScript Types**: Define proper interfaces for all API requests and responses
- **Error Handling**: Use the error handling middleware for consistent error responses
- **Streaming**: Use Vercel AI SDK for all AI provider integrations
- **Security**: Implement proper authentication, validation, and sanitization

### Architecture Principles

#### Frontend Architecture
- **App Router**: Use Next.js App Router with proper server/client component separation
- **URL-based Routing**: Implement workspace-scoped routing (/ws/{workspaceId})
- **Component Hierarchy**: UI components → Feature components → Page components
- **State Flow**: Props down, events up, with TanStack Query for server synchronization

#### Backend Architecture
- **Layered Architecture**: Routes → Services → Database, with clear separation of concerns
- **Dependency Injection**: Services should be injectable and testable
- **Database Abstraction**: Use universal database service to support multiple database types
- **API Design**: RESTful endpoints with consistent response patterns

### Performance Optimization

#### Frontend Performance
- **Bundle Optimization**: Use dynamic imports for code splitting
- **Image Optimization**: Use Next.js Image component for automatic optimization
- **Loading States**: Implement skeleton loading states that match real content
- **Caching**: Leverage TanStack Query's intelligent caching and background updates
- **Streaming**: Use streaming for AI responses to improve perceived performance

#### Backend Performance
- **Database Optimization**: Use proper indexing and query optimization
- **Connection Pooling**: Implement efficient database connection management
- **Caching Strategies**: Cache frequently accessed data and AI provider responses
- **Streaming Responses**: Use streaming for large responses and AI chat
- **Rate Limiting**: Implement rate limiting to prevent abuse

### Testing Strategy

#### Unit Testing
- **Utility Functions**: Test all utility functions and helper methods
- **Service Logic**: Test business logic in services with mocked dependencies
- **Custom Hooks**: Test React hooks with React Testing Library
- **Database Operations**: Test universal database service with different providers

#### Integration Testing
- **API Endpoints**: Test complete request/response cycles
- **Database Integration**: Test with real database connections
- **AI Provider Integration**: Test with mocked AI provider responses
- **Authentication Flow**: Test complete auth workflows

#### End-to-End Testing
- **Critical User Flows**: Test workspace creation, chat sessions, AI interactions
- **Cross-browser Testing**: Ensure compatibility across different browsers
- **Mobile Responsiveness**: Test on various screen sizes and devices

## 🚀 Deployment

### Production Build

```bash
# Build both applications for production
npm run build

# Start both applications in production mode
npm run start

# Or build and start individually
npm run build:frontend && npm run build:backend
npm run start:frontend & npm run start:backend
```

### Environment Variables for Production

```env
# Server Configuration
NODE_ENV=production
PORT=3006
FRONTEND_URL=https://your-domain.com

# Security
JWT_SECRET=your-super-secure-jwt-secret-change-this
BETTER_AUTH_SECRET=your-super-secure-auth-secret-change-this

# Database (choose one)
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/op3
DATABASE_URL=postgresql://user:pass@host:5432/op3

# Optional: AI Provider API Keys (can be configured via UI)
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
GOOGLE_AI_API_KEY=your-google-ai-api-key
```

### Deployment Platforms

#### Vercel (Recommended for Frontend)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy frontend
cd frontend-next
vercel --prod
```

#### Railway (Full-Stack)
```bash
# Connect your GitHub repo to Railway
# Set environment variables in Railway dashboard
# Deploy automatically on git push
```

#### Docker Deployment

Create `Dockerfile` in project root:

```dockerfile
FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Frontend build
FROM base AS frontend-build
COPY frontend-next/ ./frontend-next/
WORKDIR /app/frontend-next
RUN npm ci && npm run build

# Backend build
FROM base AS backend-build
COPY backend-api/ ./backend-api/
WORKDIR /app/backend-api
RUN npm ci && npm run build

# Production image
FROM node:18-alpine AS production
WORKDIR /app
COPY --from=frontend-build /app/frontend-next/.next ./frontend-next/.next
COPY --from=frontend-build /app/frontend-next/public ./frontend-next/public
COPY --from=backend-build /app/backend-api/dist ./backend-api/dist
COPY --from=base /app/node_modules ./node_modules
COPY package*.json ./

EXPOSE 3000 3006
CMD ["npm", "start"]
```

#### Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
      - "3006:3006"
    environment:
      - NODE_ENV=production
      - JWT_SECRET=${JWT_SECRET}
      - BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET}
      - MONGODB_URI=${MONGODB_URI}
    depends_on:
      - mongodb

  mongodb:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db

volumes:
  mongodb_data:
```

## 🤝 Contributing

We welcome contributions to OP3! Here's how to get started:

### Getting Started
1. **Fork the repository** on GitHub
2. **Clone your fork**: `git clone https://github.com/your-username/op3.git`
3. **Create a feature branch**: `git checkout -b feature/amazing-feature`
4. **Follow the development setup** instructions above

### Development Guidelines
1. **Follow the code organization** guidelines outlined above
2. **Keep files under 750 lines** - split into smaller files when needed
3. **Use TypeScript** for all new code with proper type definitions
4. **Test your changes** thoroughly before submitting
5. **Update documentation** as needed for new features

### Submitting Changes
1. **Commit your changes**: `git commit -m 'feat: add amazing feature'`
2. **Push to your branch**: `git push origin feature/amazing-feature`
3. **Open a Pull Request** with a clear description of changes
4. **Ensure CI passes** and address any review feedback

### Commit Convention
We use conventional commits for clear history:
- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support & Community

- **🌐 Live Demo**: [https://op3.chat](https://op3.chat)
- **📖 Documentation**: This README and inline code comments
- **🐛 Bug Reports**: [GitHub Issues](https://github.com/erenbertr/op3/issues)
- **💡 Feature Requests**: [GitHub Discussions](https://github.com/erenbertr/op3/discussions)
- **❓ Questions**: Join our community discussions

## 🔄 Changelog & Roadmap

### Version 2.0.0 (Current)
- **🤖 Vercel AI SDK Integration**: Unified streaming across all AI providers
- **🎨 Enhanced UI/UX**: Improved chat interface with branching and sharing
- **📁 File Processing**: OpenAI file search API integration with vector stores
- **🔍 Web Search**: Multi-provider web search integration
- **⭐ AI Personality Favorites**: Workspace-scoped AI personality management
- **�️ Universal Database**: Single interface supporting multiple database types
- **🎯 Advanced Features**: Chat branching, sharing, reasoning steps, O1 model support

### Version 1.0.0 (Legacy)
- Initial release with core workspace and chat functionality
- Multi-database support (MongoDB, PostgreSQL, MySQL, SQLite)
- AI provider integrations (OpenAI, OpenRouter)
- Real-time chat with streaming responses
- Drag-and-drop workspace organization
- Better Auth integration
- Modern UI with dark/light theme support

### Upcoming Features
- **🔌 Plugin System**: Extensible plugin architecture for custom integrations
- **📊 Analytics Dashboard**: Usage analytics and insights
- **🌍 Internationalization**: Multi-language support
- **📱 Mobile App**: React Native mobile application
- **🔄 Real-time Collaboration**: Multi-user workspace collaboration
- **🎨 Custom Themes**: User-customizable themes and layouts

---

**🚀 Built with ❤️ using modern web technologies**

*OP3 - Empowering productivity through intelligent AI workspace management*
