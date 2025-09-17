# StepFlow Platform

AI-powered workflow documentation platform that enables businesses and teams to create step-by-step video documentation, onboarding materials, and training guides with minimal effort.

## Architecture

This is a monorepo containing:

- **Web Application** (`packages/web`) - React-based web interface
- **Browser Extension** (`packages/extension`) - Chrome extension for workflow capture
- **API Services** (`packages/api`) - Node.js backend services
- **Shared Package** (`packages/shared`) - Common types and utilities

## Quick Start

### Prerequisites

- Node.js 18+ and npm 9+
- Docker and Docker Compose (for local development)

### Installation

1. Clone the repository and install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Start the development environment:
```bash
# Start database and services
npm run docker:dev

# Start all applications
npm run dev
```

This will start:
- Web application at http://localhost:3000
- API server at http://localhost:3001
- PostgreSQL at localhost:5432
- Redis at localhost:6379
- MinIO (S3-compatible storage) at http://localhost:9001

### Development Commands

```bash
# Install dependencies
npm install

# Start all services in development mode
npm run dev

# Start individual services
npm run dev:web      # Web application only
npm run dev:api      # API server only
npm run dev:extension # Extension build watch

# Build all packages
npm run build

# Run tests
npm run test

# Lint and format code
npm run lint
npm run format

# Clean all build artifacts
npm run clean
```

### Browser Extension Development

1. Build the extension:
```bash
npm run build --workspace=@stepflow/extension
```

2. Load the extension in Chrome:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select `packages/extension/dist`

## Project Structure

```
stepflow-platform/
├── packages/
│   ├── web/                 # React web application
│   │   ├── src/
│   │   ├── public/
│   │   └── package.json
│   ├── api/                 # Node.js backend services
│   │   ├── src/
│   │   └── package.json
│   ├── extension/           # Chrome browser extension
│   │   ├── src/
│   │   └── package.json
│   └── shared/              # Shared types and utilities
│       ├── src/
│       └── package.json
├── docker-compose.dev.yml   # Development services
├── package.json             # Root package configuration
└── README.md
```

## Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL, Redis
- **File Storage**: AWS S3 / MinIO
- **AI Services**: OpenAI GPT-4, ElevenLabs
- **Extension**: Chrome Manifest V3, TypeScript

## Contributing

1. Follow the existing code style and formatting
2. Write tests for new functionality
3. Update documentation as needed
4. Ensure all linting and tests pass before submitting

## License

Private - All rights reserved