# API Routes Summary

This document provides a comprehensive overview of all API routes created for the SpareFinder dashboard pages.

## Authentication Routes (`/api/auth`)
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout
- `POST /api/auth/google` - Google OAuth login
- `POST /api/auth/refresh` - Refresh JWT token
- `POST /api/auth/reset-password` - Password reset
- `GET /api/auth/me` - Get current user

## Dashboard Routes (`/api/dashboard`)
- `GET /api/dashboard/stats` - Get dashboard statistics
- `GET /api/dashboard/recent-uploads` - Get recent uploads
- `GET /api/dashboard/recent-activities` - Get recent activities
- `GET /api/dashboard/performance-metrics` - Get performance metrics
- `GET /api/dashboard/usage-stats` - Get user usage statistics

## History Routes (`/api/history`)
- `GET /api/history/uploads` - Get upload history with pagination and filters
- `DELETE /api/history/uploads/:uploadId` - Delete a specific upload
- `GET /api/history/export` - Export history data (CSV/JSON)

## Profile Routes (`/api/profile`)
- `GET /api/profile` - Get user profile
- `PATCH /api/profile` - Update user profile
- `POST /api/profile/change-password` - Change user password
- `DELETE /api/profile/delete-account` - Delete user account

## Settings Routes (`/api/settings`)
- `GET /api/settings` - Get user settings
- `PATCH /api/settings` - Update user settings
- `POST /api/settings/reset` - Reset settings to default

## Notifications Routes (`/api/notifications`)
- `GET /api/notifications` - Get notifications with pagination
- `PATCH /api/notifications/:id/read` - Mark notification as read
- `PATCH /api/notifications/mark-all-read` - Mark all notifications as read
- `DELETE /api/notifications/:id` - Delete a notification
- `POST /api/notifications` - Create a notification
- `GET /api/notifications/stats` - Get notification statistics

## Billing Routes (`/api/billing`)
- `GET /api/billing` - Get billing information
- `POST /api/billing/subscription` - Update subscription
- `POST /api/billing/subscription/cancel` - Cancel subscription
- `GET /api/billing/invoices` - Get invoices with pagination

## Upload Routes (`/api/upload`)
- `GET /api/upload/status` - Get upload service status
- `POST /api/upload/image` - Upload and analyze image
- `GET /api/upload/history` - Get upload history (alias for history routes)

## User Routes (`/api/user`)
- `PATCH /api/user/profile` - Update user profile (alias for profile routes)
- `POST /api/user/avatar` - Upload user avatar

## Search Routes (`/api/search`)
- `GET /api/search/parts` - Search for parts
- `GET /api/search/history` - Get search history

## Admin Routes (`/api/admin`)
- `GET /api/admin/users` - Get all users (admin only)
- `PATCH /api/admin/users/:id` - Update user (admin only)
- `DELETE /api/admin/users/:id` - Delete user (admin only)
- `GET /api/admin/analytics` - Get system analytics (admin only)

## Health Check
- `GET /api/health` - Health check endpoint

## Request/Response Formats

### Authentication
All protected routes require a JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

### Error Responses
All endpoints return consistent error responses:
```json
{
  "error": "Error type",
  "message": "Detailed error message",
  "details": [] // Optional validation details
}
```

### Success Responses
Most endpoints return data in this format:
```json
{
  "success": true,
  "data": {}, // Response data
  "message": "Success message" // Optional
}
```

### Pagination
Endpoints that support pagination use this format:
```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

## Database Tables Used

- `profiles` - User profile information
- `part_searches` - Upload and search history
- `user_activities` - User activity logs
- `notifications` - User notifications
- `subscriptions` - User subscription information
- `usage_tracking` - Monthly usage statistics

## Environment Variables Required

- `JWT_SECRET` - Secret for JWT token signing
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_KEY` - Supabase service role key
- `AI_SERVICE_URL` - AI service endpoint URL
- `AI_SERVICE_API_KEY` - AI service API key
- `FRONTEND_URL` - Frontend application URL

## Security Features

- JWT-based authentication
- Role-based access control (RBAC)
- Row Level Security (RLS) on database tables
- Input validation using express-validator
- Rate limiting
- CORS protection
- Helmet security headers

## API Client Usage

The frontend uses a centralized API client (`src/lib/api.ts`) that:
- Handles JWT token management
- Provides type-safe method calls
- Manages request/response formatting
- Handles error states consistently

Example usage:
```typescript
import { apiClient } from '@/lib/api';

// Get dashboard stats
const response = await apiClient.getDashboardStats();
if (response.success) {
  console.log(response.data);
}

// Get upload history with filters
const history = await apiClient.getUploadHistory(1, 20, {
  date_from: '2024-01-01',
  min_confidence: 0.7
});
``` 