# Database Models and Migrations

This directory contains the database schema, migrations, and data models for the StepFlow API.

## Overview

The database is designed to support the core functionality of StepFlow:
- User management and authentication
- Recording capture and storage
- Guide creation and management  
- Sharing and permissions

## Database Schema

### Core Tables

1. **users** - User accounts and preferences
2. **subscriptions** - User subscription information
3. **recording_sessions** - Active recording sessions
4. **recordings** - Completed recordings with metadata
5. **captured_steps** - Individual steps captured during recording
6. **guides** - Published guides created from recordings
7. **processed_steps** - Individual steps in a guide with AI-generated content
8. **annotations** - Visual annotations on guide steps
9. **guide_analytics** - Analytics data for guides
10. **sharing_settings** - Sharing configuration for guides
11. **share_permissions** - User permissions for shared guides
12. **share_access_logs** - Access logs for shared guides

### Relationships

```
users (1) -----> (n) recordings
users (1) -----> (n) guides
users (1) -----> (1) subscriptions
recordings (1) -> (n) captured_steps
recordings (1) -> (1) guides
guides (1) -----> (n) processed_steps
guides (1) -----> (1) sharing_settings
guides (1) -----> (1) guide_analytics
processed_steps (1) -> (n) annotations
sharing_settings (1) -> (n) share_permissions
sharing_settings (1) -> (n) share_access_logs
```

## Running Migrations

### Prerequisites

1. PostgreSQL database running
2. Environment variables configured (see `.env.example`)

### Commands

```bash
# Run all pending migrations
npm run migrate:up

# Check migration status
npm run migrate:status

# Rollback last migration (development only)
npm run migrate:down
```

### Migration Files

Migration files are located in `src/database/migrations/` and follow the naming convention:
`{number}_{description}.sql`

Example: `001_create_users_table.sql`

## Data Models

### TypeScript Interfaces

All data models are defined with TypeScript interfaces and Zod validation schemas:

- **User Models** (`src/models/user.model.ts`)
- **Recording Models** (`src/models/recording.model.ts`)  
- **Guide Models** (`src/models/guide.model.ts`)
- **Sharing Models** (`src/models/sharing.model.ts`)

### Validation

All models include comprehensive validation using Zod schemas:

```typescript
import { validateData } from '../utils/validation.js';
import { CreateUserSchema } from '../models/user.model.js';

// Validate user input
const userData = validateData(CreateUserSchema, requestBody);
```

### Example Usage

```typescript
import { 
  User, 
  CreateUserInput, 
  UserSchema, 
  CreateUserSchema 
} from '../models/user.model.js';

// Create a new user
const newUserData: CreateUserInput = {
  email: 'user@example.com',
  password: 'SecurePass123',
  firstName: 'John',
  lastName: 'Doe'
};

// Validate the input
const validatedData = validateData(CreateUserSchema, newUserData);

// Use in database operations...
```

## Database Connection

The database connection is managed through the configuration system:

```typescript
import { 
  initializeDatabase, 
  getDatabaseConfigFromEnv,
  executeQuery 
} from '../config/database.js';

// Initialize connection
const config = getDatabaseConfigFromEnv();
initializeDatabase(config);

// Execute queries
const users = await executeQuery('SELECT * FROM users WHERE email = $1', [email]);
```

## Testing

Run the model validation tests:

```bash
npm test
```

The tests verify:
- Schema validation for all models
- Input validation for create/update operations
- Edge cases and error handling
- Data type constraints

## Development Guidelines

### Adding New Models

1. Create the TypeScript interface and Zod schema
2. Add validation tests
3. Create database migration
4. Update this documentation

### Migration Best Practices

1. Always create reversible migrations when possible
2. Use transactions for complex schema changes
3. Test migrations on a copy of production data
4. Include proper indexes for performance
5. Document any breaking changes

### Validation Guidelines

1. Use Zod schemas for all input validation
2. Include appropriate constraints (min/max length, format validation)
3. Provide clear error messages
4. Test edge cases thoroughly
5. Use TypeScript types derived from Zod schemas

## Troubleshooting

### Common Issues

1. **Migration fails**: Check database connection and permissions
2. **Validation errors**: Verify input data matches schema requirements
3. **Connection timeout**: Adjust connection timeout settings
4. **Performance issues**: Check query indexes and optimization

### Debugging

Enable detailed logging by setting environment variables:

```bash
NODE_ENV=development
DB_LOG_QUERIES=true
```

This will log all database queries and their execution times.