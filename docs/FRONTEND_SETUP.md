# Frontend Setup Guide

This guide will help you set up the SpareFinder frontend that now integrates with the backend API.

## Prerequisites

- Node.js 18+ 
- npm or yarn
- The backend server running on port 4000

## Environment Configuration

1. Copy the environment file:
```bash
cp .env.example .env
```

2. Update your `.env` file with these settings:
```env
# Backend API Configuration
VITE_API_URL=http://localhost:4000

# Clerk Authentication (required)
VITE_CLERK_PUBLISHABLE_KEY=pk_test_********

# Supabase Configuration (for database)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional: Google OAuth
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

## Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

## Backend Integration

The frontend now uses your Node.js/Express backend for:

### Authentication
- **Identity**: Clerk (frontend) issues session JWTs
- **API auth**: Frontend sends `Authorization: Bearer <clerk_session_jwt>` to the backend
- **Linking existing users**: Backend links Clerk users to existing `profiles` rows by email and persists `profiles.clerk_user_id`
- **User Management**: Profile data still lives in `profiles` and is served from `/api/auth/current-user` and `/api/user/profile`

### File Uploads
- **Image Upload**: Uses `/api/upload/image` for part analysis
- **Progress Tracking**: Real-time upload and analysis progress

### API Communication
- **Base URL**: Configured via `VITE_API_URL` environment variable
- **Authentication**: Bearer token in Authorization header
- **Error Handling**: Centralized error handling with toast notifications

## Key Changes Made

### 1. API Client (`src/lib/api.ts`)
- Centralized API communication
- JWT token management
- Type-safe request/response handling

### 2. Auth Context (`src/contexts/AuthContext.tsx`)
- Updated to use backend API instead of direct Supabase
- Maintains compatibility with existing components
- Handles login, registration, and profile management

### 3. Upload Functionality (`src/pages/Upload.tsx`)
- Uses backend `/api/upload/image` endpoint
- Real-time progress tracking
- Type-safe analysis results

### 4. Environment Configuration
- Updated `.env` for backend integration
- Proper port configuration (backend: 4000, frontend: 5173)

## Authentication Flow

1. **Sign up / Sign in** (Clerk UI):
   - Frontend uses Clerk `<SignUp />` / `<SignIn />`
   - Clerk manages sessions and token rotation

2. **Backend profile sync**:
   - After sign-in, frontend calls `/api/auth/current-user`
   - Backend verifies the Clerk session JWT and maps it to `profiles.id` (link by `clerk_user_id` or email)

3. **Protected Routes**:
   - Clerk session JWT is attached to each request by the API client interceptor
   - Backend middleware validates token and sets `req.user.userId` to your internal `profiles.id`

## File Upload Flow

1. **File Selection**: User selects image file
2. **Validation**: Frontend validates file type and size
3. **Upload**: File sent to `/api/upload/image` endpoint
4. **Analysis**: Backend processes with AI service
5. **Results**: Analysis results returned to frontend

## Troubleshooting

### Backend Connection Issues
- Ensure backend server is running on port 4000
- Check `VITE_API_URL` in `.env` file
- Verify CORS settings in backend allow frontend origin

### Authentication Issues
- Confirm `VITE_CLERK_PUBLISHABLE_KEY` is set (Vite requires `VITE_` prefix)
- Confirm backend has `CLERK_SECRET_KEY`
- Ensure the DB migration adding `profiles.clerk_user_id` has been applied

### Upload Issues
- Check file size limits (10MB default)
- Verify supported file types (JPEG, PNG, WebP)
- Ensure AI service is running and accessible

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript checking

## Next Steps

1. **OAuth Integration**: Implement Google OAuth flow
2. **Real-time Features**: Add WebSocket for live updates
3. **Caching**: Implement Redis caching for better performance
4. **Testing**: Add unit and integration tests