# OP3 - AI-Powered Workspace Management Platform

OP3 is a modern, full-stack application that provides AI-powered workspace management with intelligent chat functionality, multi-provider AI integration, and comprehensive workspace organization tools.

## 🚀 Features

### Core Functionality
- **Workspace Management**: Create, organize, and manage multiple workspaces with custom rules and templates
- **AI Chat Integration**: Intelligent chat sessions with support for multiple AI providers (OpenAI, OpenRouter)
- **Multi-Provider AI Support**: Seamless integration with various AI models and providers
- **Real-time Communication**: WebSocket-powered real-time chat and updates
- **File Upload & Processing**: Support for file attachments with AI-powered document analysis
- **Drag & Drop Interface**: Intuitive workspace organization with @dnd-kit
- **Advanced Search**: Web search integration for supported AI models
- **Chat Branching**: Create conversation branches for exploring different discussion paths
- **Personality System**: AI personality favorites and custom configurations per workspace

### User Experience
- **Modern UI**: Built with shadcn/ui components and Tailwind CSS
- **Dark/Light Theme**: Automatic theme switching with system preference detection
- **Responsive Design**: Mobile-first design that works across all devices
- **Internationalization**: Multi-language support with localStorage persistence
- **Real-time Updates**: Live updates across tabs and sessions
- **Progressive Loading**: Skeleton states and delayed spinners for optimal UX

### Enterprise Features
- **Multi-Database Support**: MongoDB, MySQL, PostgreSQL, SQLite, and modern cloud databases
- **Authentication**: Secure authentication with Better Auth
- **Role-Based Access**: Admin and user roles with appropriate permissions
- **Setup Wizard**: Guided initial setup for database and admin configuration
- **Statistics & Analytics**: Comprehensive usage tracking and reporting

## 🏗️ Technology Stack

### Frontend
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui (Radix UI primitives)
- **State Management**: TanStack Query (React Query) for server state
- **Drag & Drop**: @dnd-kit for workspace organization
- **Authentication**: Better Auth client integration
- **Theme**: next-themes for dark/light mode
- **Icons**: Lucide React

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Authentication**: Better Auth with JWT
- **Real-time**: WebSocket (ws library)
- **File Upload**: Multer
- **Security**: Helmet, CORS, bcrypt
- **Logging**: Morgan

### Database Support
- **Primary**: MongoDB (with Mongoose-like operations)
- **Relational**: MySQL, PostgreSQL
- **Local**: SQLite
- **Cloud**: Supabase, PlanetScale, Neon, Turso
- **Modern**: Convex, Firebase Firestore

### AI Integrations
- **OpenAI**: GPT models with function calling, file search, web search
- **OpenRouter**: Access to multiple AI providers through unified API
- **Streaming**: Real-time response streaming
- **File Processing**: Vector stores for document retrieval

## 📁 Project Structure

```
OP3/
├── frontend-next/              # Next.js frontend application
│   ├── src/
│   │   ├── app/               # Next.js App Router pages
│   │   ├── components/        # React components
│   │   │   ├── ui/           # shadcn/ui components
│   │   │   ├── workspace/    # Workspace management components
│   │   │   ├── chat/         # Chat interface components
│   │   │   └── setup/        # Setup wizard components
│   │   ├── lib/              # Utility functions and configurations
│   │   │   ├── api.ts        # API client
│   │   │   ├── hooks/        # Custom React hooks
│   │   │   └── utils.ts      # Helper utilities
│   │   └── types/            # TypeScript type definitions
│   ├── components.json       # shadcn/ui configuration
│   └── package.json
├── backend-api/               # Express.js backend API
│   ├── src/
│   │   ├── routes/           # API route handlers
│   │   ├── services/         # Business logic services
│   │   ├── middleware/       # Express middleware
│   │   ├── types/           # TypeScript type definitions
│   │   ├── config/          # Database and configuration
│   │   └── index.ts         # Application entry point
│   ├── data/                # Local data storage
│   └── package.json
├── package.json              # Root workspace configuration
└── README.md                # This file
```

## 🚀 Getting Started

### Prerequisites

- **Node.js**: >= 18.0.0
- **npm**: >= 8.0.0
- **Database**: MongoDB (recommended) or any supported database

### Installation

1. **Clone the repository**:
```bash
git clone <repository-url>
cd OP3
```

2. **Install dependencies**:
```bash
npm install
```

This will install dependencies for both frontend and backend workspaces.

### Environment Configuration

1. **Backend Environment** (`.env` in `backend-api/`):
```bash
# Copy the example file
cp backend-api/.env.example backend-api/.env
```

2. **Configure required variables**:
```env
# Server Configuration
PORT=3006
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# JWT Secret (generate a secure random string)
JWT_SECRET=your-super-secret-jwt-key-here

# Database will be configured through setup wizard
```

3. **Frontend Environment** (optional, `.env.local` in `frontend-next/`):
```env
# API URL (defaults to http://localhost:3006/api/v1)
NEXT_PUBLIC_API_URL=http://localhost:3006/api/v1

# Better Auth Configuration
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=your-secret-key-change-in-production
```

### Database Setup

OP3 supports multiple database options. Choose one based on your needs:

#### Option 1: MongoDB (Recommended)
```bash
# Local MongoDB
brew install mongodb/brew/mongodb-community  # macOS
# or
sudo apt-get install mongodb  # Ubuntu

# Start MongoDB
brew services start mongodb/brew/mongodb-community  # macOS
# or
sudo systemctl start mongod  # Ubuntu

# MongoDB will be available at: mongodb://localhost:27017
```

#### Option 2: PostgreSQL
```bash
# Install PostgreSQL
brew install postgresql  # macOS
# or
sudo apt-get install postgresql postgresql-contrib  # Ubuntu

# Start PostgreSQL
brew services start postgresql  # macOS
# or
sudo systemctl start postgresql  # Ubuntu
```

#### Option 3: MySQL
```bash
# Install MySQL
brew install mysql  # macOS
# or
sudo apt-get install mysql-server  # Ubuntu

# Start MySQL
brew services start mysql  # macOS
# or
sudo systemctl start mysql  # Ubuntu
```

#### Option 4: SQLite (No setup required)
SQLite requires no additional setup - just specify a file path during configuration.

### Running the Application

1. **Start the development servers**:
```bash
npm run dev
```

This starts both frontend (http://localhost:3000) and backend (http://localhost:3006) concurrently.

2. **Access the application**:
   - Open http://localhost:3000 in your browser
   - Follow the setup wizard to configure your database and create an admin user
   - Complete the workspace setup to start using the application

### Alternative: Run Services Individually

```bash
# Frontend only (http://localhost:3000)
npm run dev:frontend

# Backend only (http://localhost:3006)
npm run dev:backend
```

## 🔧 Configuration

### AI Provider Setup

After initial setup, configure AI providers through the application:

1. **Navigate to AI Providers** (`/ai-providers`)
2. **OpenAI Configuration**:
   - Add your OpenAI API key
   - Select desired models (GPT-4, GPT-3.5-turbo, etc.)
   - Configure capabilities (search, reasoning, file attachments)

3. **OpenRouter Configuration**:
   - Add your OpenRouter API key
   - Browse and select from 100+ available models
   - Configure model-specific settings

### Workspace Configuration

1. **Create Workspaces**: Organize your work into separate contexts
2. **Set Workspace Rules**: Define AI behavior and context for each workspace
3. **Configure AI Favorites**: Set preferred AI personalities per workspace
4. **Organize with Groups**: Use drag-and-drop to organize workspaces into groups

### Advanced Configuration

#### Database Connection Strings

**MongoDB**:
```
mongodb://localhost:27017/op3
mongodb://username:password@host:port/database
```

**PostgreSQL**:
```
postgresql://username:password@localhost:5432/op3
```

**MySQL**:
```
mysql://username:password@localhost:3306/op3
```

**SQLite**:
```
./data/op3.db
```

#### Environment Variables Reference

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Backend server port | `3006` |
| `NODE_ENV` | Environment mode | `development` |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:3000` |
| `JWT_SECRET` | JWT signing secret | Required |
| `MONGODB_URI` | MongoDB connection string | Set via setup |
| `BETTER_AUTH_URL` | Auth service URL | `http://localhost:3000` |
| `BETTER_AUTH_SECRET` | Auth encryption secret | Required |

## 📜 Available Scripts

### Root Level Commands
```bash
npm run dev          # Start both frontend and backend
npm run build        # Build both applications
npm run start        # Start both in production mode
npm run lint         # Lint both applications
npm run type-check   # TypeScript type checking
```

### Frontend Commands
```bash
cd frontend-next
npm run dev          # Development server
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint
npm run type-check   # TypeScript checking
```

### Backend Commands
```bash
cd backend-api
npm run dev          # Development server with nodemon
npm run build        # Compile TypeScript
npm run start        # Start compiled server
npm run type-check   # TypeScript checking
```

## 🏛️ Architecture Overview

### Frontend Architecture

**Next.js App Router**: Modern routing with server and client components
- **Server Components**: For static content and initial data loading
- **Client Components**: For interactive features and real-time updates
- **API Routes**: Better Auth integration and client-side API calls

**State Management**:
- **TanStack Query**: Server state management with caching and synchronization
- **React Hooks**: Local component state with custom hooks
- **URL State**: Navigation and workspace state via URL parameters

**Component Structure**:
- **UI Components**: Reusable shadcn/ui components
- **Feature Components**: Workspace, chat, and setup specific components
- **Layout Components**: Application shell and navigation
- **Provider Components**: Context providers for auth, theme, and queries

### Backend Architecture

**Express.js API**: RESTful API with WebSocket support
- **Route Handlers**: Organized by feature (workspace, chat, auth, etc.)
- **Middleware**: Authentication, error handling, and request validation
- **Services**: Business logic separated from route handlers
- **Database Layer**: Abstracted database operations supporting multiple providers

**Key Services**:
- **AI Chat Service**: Handles streaming responses from multiple AI providers
- **Workspace Service**: Manages workspace CRUD operations and organization
- **Authentication Service**: JWT-based auth with Better Auth integration
- **File Service**: Handles file uploads and AI document processing

### Database Design

**Collections/Tables**:
- **Users**: User accounts with roles and preferences
- **Workspaces**: Workspace configurations and rules
- **Workspace Groups**: Organization and sorting of workspaces
- **Chat Sessions**: Chat conversations scoped to workspaces
- **Chat Messages**: Individual messages with AI provider metadata
- **AI Providers**: Configuration for OpenAI, OpenRouter, etc.
- **Personalities**: AI personality templates and favorites

## 🔌 API Endpoints

### Authentication
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/verify` - Token verification
- `GET /api/v1/auth/user` - Get current user

### Setup
- `GET /api/v1/setup/status` - Check setup completion
- `POST /api/v1/setup/database` - Configure database
- `POST /api/v1/setup/admin` - Create admin user

### Workspaces
- `GET /api/v1/workspace` - Get user workspaces
- `POST /api/v1/workspace` - Create workspace
- `PUT /api/v1/workspace/:id` - Update workspace
- `DELETE /api/v1/workspace/:id` - Delete workspace

### Chat
- `GET /api/v1/chat/sessions/:workspaceId` - Get chat sessions
- `POST /api/v1/chat/sessions` - Create chat session
- `GET /api/v1/chat/messages/:sessionId` - Get chat messages
- `POST /api/v1/chat/stream` - Stream AI responses

### AI Providers
- `GET /api/v1/ai-providers` - Get configured providers
- `POST /api/v1/openai-providers` - Configure OpenAI
- `POST /api/v1/openrouter` - Configure OpenRouter

## 🧪 Development Guidelines

### Code Organization

**Frontend**:
- Use TypeScript for all components and utilities
- Follow React best practices (hooks, composition)
- Implement proper error boundaries
- Use TanStack Query for server state
- Avoid useEffect for data fetching

**Backend**:
- Separate business logic into services
- Use proper TypeScript types for all APIs
- Implement comprehensive error handling
- Follow RESTful API conventions
- Use middleware for cross-cutting concerns

### Performance Best Practices

**Frontend**:
- Use React.memo judiciously
- Implement proper loading states
- Optimize bundle size with dynamic imports
- Use Next.js Image optimization
- Implement skeleton loading states

**Backend**:
- Use database indexing appropriately
- Implement proper caching strategies
- Use streaming for large responses
- Optimize database queries
- Implement rate limiting

### Testing Strategy

**Unit Tests**: Test utility functions and business logic
**Integration Tests**: Test API endpoints and database operations
**Component Tests**: Test React components with React Testing Library
**E2E Tests**: Test critical user flows

## 🚀 Deployment

### Production Build

```bash
# Build both applications
npm run build

# Start in production mode
npm run start
```

### Environment Variables for Production

```env
NODE_ENV=production
PORT=3006
FRONTEND_URL=https://your-domain.com
JWT_SECRET=your-production-jwt-secret
BETTER_AUTH_SECRET=your-production-auth-secret
MONGODB_URI=your-production-mongodb-uri
```

### Docker Deployment (Optional)

Create `Dockerfile` for containerized deployment:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000 3006
CMD ["npm", "start"]
```

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes**: Follow the development guidelines
4. **Test your changes**: Ensure all tests pass
5. **Commit your changes**: `git commit -m 'Add amazing feature'`
6. **Push to the branch**: `git push origin feature/amazing-feature`
7. **Open a Pull Request**

### Development Setup for Contributors

1. Follow the installation steps above
2. Create a new branch for your feature
3. Make changes following the code organization guidelines
4. Test your changes thoroughly
5. Update documentation as needed

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

- **Documentation**: Check this README and inline code comments
- **Issues**: Report bugs and request features via GitHub Issues
- **Discussions**: Join community discussions for questions and ideas

## 🔄 Changelog

### Version 1.0.0
- Initial release with core workspace and chat functionality
- Multi-database support
- AI provider integrations (OpenAI, OpenRouter)
- Real-time chat with streaming responses
- Drag-and-drop workspace organization
- Better Auth integration
- Modern UI with dark/light theme support

---

**Built with ❤️ using modern web technologies**
