# Admin Login System Documentation

## Overview

The application now features a **separate admin login system** that is completely independent from the regular user login. This provides enhanced security and clear separation between user and administrative access.

## Key Features

### 🔐 **Separate Authentication**
- **Admin Login URL**: `http://localhost:5173/admin/login`
- **User Login URL**: `http://localhost:5173/login`
- Independent authentication flows
- Different JWT tokens with admin-specific flags

### 🛡️ **Enhanced Security**
- Admin sessions have shorter expiration (12 hours vs 7 days for users)
- Admin login attempts are logged and monitored
- Role verification at login (only `admin` and `super_admin` roles allowed)
- Optional admin session validation for console access

### 🎨 **Professional Admin UI**
- Dedicated admin login page with red/orange theme
- Security notices and warnings
- Professional admin console branding
- Animated background and modern design

## API Endpoints

### Backend Routes

#### Admin Login
```
POST /api/auth/admin/login
```

#### Admin Logout
```
POST /api/auth/admin/logout
Authorization: Bearer <admin_token>
```

## Access Control

### Role Requirements
- **Admin Console Access**: `admin` or `super_admin` role required
- **User Dashboard**: Any authenticated user
- **Admin Pages**: Admin role + admin login session

## Usage Guide

### For Administrators

1. **Access Admin Login**
   - Navigate to `http://localhost:5173/admin/login`
   - Enter your admin credentials (must have `admin` or `super_admin` role)
   - Click "Access Admin Console"

2. **Admin Console Navigation**
   - After successful login, you'll be automatically redirected to `/admin/dashboard`
   - Use the admin sidebar to navigate between admin pages
   - All admin pages are protected and require admin login session

3. **Admin Pages Access Levels**
   - **Admin Level**: Dashboard, User Management, Analytics, Audit Logs, Payment Management
   - **Super Admin Level**: System Settings, Database Console, Email SMTP, AI Models

4. **Logout**
   - Click the "Logout" button in the admin sidebar
   - You'll be redirected back to the admin login page
   - Admin session will be cleared from browser storage

### For Regular Users

1. **Regular User Access**
   - Navigate to `http://localhost:5173/login`
   - Use regular user credentials
   - Access user dashboard and features

## Database Setup

Make a user an admin:
```sql
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'admin@company.com';
```

Make a user a super admin:
```sql
UPDATE profiles 
SET role = 'super_admin' 
WHERE email = 'superadmin@company.com';
```

## Automatic Redirect Flow

### After Successful Admin Login
1. **Token Storage**: JWT token is stored in localStorage as `auth_token`
2. **Session Storage**: Admin session info is stored in localStorage as `admin_session`
3. **Automatic Redirect**: User is automatically redirected to `/admin/dashboard`
4. **Protected Routes**: All admin pages verify both token and admin session

### Admin Session Structure
```json
{
  "isAdminLogin": true,
  "user": {
    "id": "user_id",
    "email": "admin@company.com",
    "role": "admin",
    "full_name": "Admin User"
  },
  "loginTime": "2024-01-01T12:00:00.000Z"
}
```

### Route Protection
- **AdminProtectedRoute**: Custom component that verifies admin authentication
- **Role-based Access**: Different admin pages require different permission levels
- **Automatic Fallback**: Unauthenticated users are redirected to admin login
- **Error Handling**: Clear error messages for insufficient permissions 