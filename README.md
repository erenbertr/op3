# OP3 Monorepo

A modern monorepo structure containing a Next.js frontend and Node.js/Express backend.

## Project Structure

```
OP3/
├── frontend-next/          # Next.js TypeScript frontend
├── backend-api/           # Node.js/Express TypeScript backend
├── package.json           # Root workspace configuration
└── README.md             # This file
```

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 8.0.0

### Installation

1. Install dependencies for all workspaces:
```bash
npm install
```

2. Install dependencies for individual workspaces:
```bash
# Frontend
cd frontend-next && npm install

# Backend
cd backend-api && npm install
```

### Development

Run both frontend and backend in development mode:
```bash
npm run dev
```

Or run them individually:
```bash
# Frontend only (runs on http://localhost:3000)
npm run dev:frontend

# Backend only (runs on http://localhost:3001)
npm run dev:backend
```

### Building

Build both applications:
```bash
npm run build
```

### Features

#### Frontend (Next.js)
- TypeScript support
- shadcn/ui components
- Dark/Light theme support
- Internationalization (i18n) with localStorage
- Multi-step setup wizard

#### Backend (Node.js/Express)
- TypeScript support
- Multiple database support (MongoDB, MySQL, PostgreSQL, LocalDB)
- RESTful API endpoints
- Proper error handling and validation

## Available Scripts

- `npm run dev` - Start both frontend and backend in development mode
- `npm run build` - Build both applications
- `npm run start` - Start both applications in production mode
- `npm run lint` - Lint both applications
- `npm run type-check` - Type check both applications

## Database Support

The application supports the following databases:
- MongoDB
- MySQL
- PostgreSQL
- LocalDB

Configuration is handled through the setup wizard in the frontend.
