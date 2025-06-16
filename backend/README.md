# SpareFinder Backend

This is the main backend service for SpareFinder, handling authentication, user management, and business logic.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase project setup

### Installation

1. **Install dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your actual values
   ```

3. **Start development server:**
   ```bash
   npm run dev
   # OR
   node start.js
   ```

The server will start on `http://localhost:3000`

## 📋 Environment Variables

Create a `.env` file with the following variables:

```env
# Backend Service Configuration
NODE_ENV=development
PORT=3000

# Security
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# Supabase Configuration
SUPABASE_URL=your-supabase-project-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_KEY=your-supabase-service-role-key

# AI Service Integration
AI_SERVICE_URL=http://localhost:8000
AI_SERVICE_API_KEY=your-ai-service-api-key

# Frontend URL (for password reset redirects)
FRONTEND_URL=http://localhost:5173
```

## 🔌 API Endpoints

### Authentication (`/api/auth`)
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/google` - Google OAuth login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh JWT token
- `POST /api/auth/reset-password` - Send password reset email
- `GET /api/auth/me` - Get current user info

### User Management (`/api/user`)
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update user profile
- `GET /api/user/searches` - Get user's search history
- `DELETE /api/user/account` - Delete user account

### Search & AI (`/api/search`)
- `POST /api/search/predict` - AI part prediction from image
- `GET /api/search/parts/:partNumber` - Search parts by number
- `GET /api/search/parts/search?description=...` - Search parts by description
- `GET /api/search/parts/:partNumber/details` - Get part details
- `GET /api/search/:searchId` - Get search by ID

### Admin (`/api/admin`)
- `GET /api/admin/users` - Get all users (admin only)
- `PATCH /api/admin/users/:userId/role` - Update user role (admin only)
- `GET /api/admin/stats` - Get system statistics (admin only)

### General
- `GET /health` - Health check endpoint

## 🛡️ Authentication

The backend uses JWT tokens for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Protected Routes
Most endpoints require authentication. Admin endpoints require admin role.

## 🏗️ Architecture

```
backend/
├── src/
│   ├── routes/          # API route definitions
│   │   ├── auth.ts      # Authentication routes
│   │   ├── user.ts      # User management routes
│   │   ├── search.ts    # Search & AI integration routes
│   │   ├── admin.ts     # Admin routes
│   │   └── upload.ts    # File upload routes
│   ├── middleware/      # Express middleware
│   │   └── auth.ts      # Authentication middleware
│   ├── types/           # TypeScript type definitions
│   │   └── auth.ts      # Authentication types
│   ├── services/        # Business logic services
│   │   └── aiIntegration.ts
│   └── server.ts        # Main server file
├── package.json
├── tsconfig.json
├── .env                 # Environment variables
└── README.md
```

## 🔧 Development

### Available Scripts
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm test` - Run tests

### Database Integration
The backend integrates with Supabase for:
- User authentication and profiles
- Search history storage
- Admin user management

### AI Service Integration
The backend acts as a proxy to the AI service, handling:
- Authentication before AI requests
- Storing search results in database
- Error handling and response formatting

## 🚀 Deployment

### Production Setup

1. **Build the application:**
   ```bash
   npm run build
   ```

2. **Set production environment variables:**
   ```bash
   NODE_ENV=production
   JWT_SECRET=strong-production-secret
   # ... other production values
   ```

3. **Start the server:**
   ```bash
   npm start
   ```

### Docker (Optional)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist/ ./dist/
EXPOSE 3000
CMD ["npm", "start"]
```

## 🔒 Security Features

- JWT token authentication
- CORS protection
- Rate limiting
- Helmet security headers
- Input validation
- SQL injection prevention (via Supabase)
- XSS protection

## 📊 Monitoring

### Health Check
GET `/health` returns:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0",
  "environment": "development"
}
```

### Logging
The backend uses structured logging with:
- Request/response logging (Morgan)
- Error logging
- Authentication events
- Database operation logs

## 🐛 Troubleshooting

### Common Issues

1. **Port already in use:**
   ```bash
   # Kill process on port 3000
   lsof -ti:3000 | xargs kill -9
   ```

2. **Dependencies issues:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Environment variables:**
   - Make sure `.env` file exists
   - Check Supabase credentials
   - Verify AI service URL and API key

4. **Database connection:**
   - Verify Supabase URL and keys
   - Check if database tables exist
   - Ensure RLS policies are properly set

### Debug Mode
Set `DEBUG=*` environment variable for verbose logging:
```bash
DEBUG=* npm run dev
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License. 