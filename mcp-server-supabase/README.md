# SpareFinderAI Database Migrations

## Overview
This package manages database migrations for the SpareFinderAI Vision application using Supabase PostgreSQL.

## Prerequisites
- Node.js (v16+)
- Supabase Account
- `.env` file with Supabase credentials

## Setup
1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file with the following variables:
```
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Migration Commands
- List available migrations:
```bash
npm run migrate:list
```

- Apply all migrations:
```bash
npm run migrate
```

- Create a new migration file:
```bash
npm run migrate:create
```

## Migration Best Practices
- Name migrations descriptively
- Keep migrations small and focused
- Always test migrations in a staging environment first

## Tables Created
- `part_analyses`: Stores detailed Manufacturing part analysis results
- `search_history`: Tracks user search activities
- `user_preferences`: Manages user-specific settings
- `subscriptions`: Handles billing and subscription information

## Security Features
- Row Level Security (RLS) enabled on all tables
- User-specific data access controls
- Automatic user preferences creation

## Troubleshooting
- Ensure Supabase credentials are correct
- Check network connectivity
- Verify Node.js version compatibility

## License
MIT License 