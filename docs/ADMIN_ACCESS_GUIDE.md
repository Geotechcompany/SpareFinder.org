# 🔐 Admin Access Guide

## Quick Access Links

### **Direct Admin URLs:**
- **Admin Dashboard**: `http://localhost:5173/admin/dashboard`
- **User Management**: `http://localhost:5173/admin/user-management`
- **System Analytics**: `http://localhost:5173/admin/system-analytics`
- **System Settings**: `http://localhost:5173/admin/system-settings`
- **Audit Logs**: `http://localhost:5173/admin/audit-logs`
- **Admin Login**: `http://localhost:5173/admin/login`

## 🚀 How to Access Admin Pages

### **Step 1: Create an Admin User**

1. **Register a regular user** at: `http://localhost:5173/register`
2. **Make them admin** by running this SQL in your database:

```sql
-- Replace 'your-email@example.com' with your actual email
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'your-email@example.com';

-- For super admin privileges:
UPDATE profiles 
SET role = 'super_admin' 
WHERE email = 'your-email@example.com';
```

### **Step 2: Login and Access Admin Panel**

1. **Login** at: `http://localhost:5173/login`
2. **Navigate to admin** via:
   - **Sidebar**: Look for "Administration" section in the sidebar
   - **Direct URL**: Go to `http://localhost:5173/admin/dashboard`

## 🎯 Admin Navigation

Once you're logged in as an admin, you'll see an **"Administration"** section in your sidebar with:

- **🛡️ Admin Panel** - Main admin dashboard
- **👥 Users** - User management interface  
- **📊 Analytics** - System analytics and reports

## 🔧 Database Setup

### **Check Current User Roles:**
```sql
SELECT email, role, full_name, created_at 
FROM profiles 
ORDER BY created_at DESC;
```

### **Make User Admin:**
```sql
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'your-email@example.com';
```

### **Make User Super Admin:**
```sql
UPDATE profiles 
SET role = 'super_admin' 
WHERE email = 'your-email@example.com';
```

## 🔒 Admin Features

### **Admin Dashboard** (`/admin/dashboard`)
- Real-time system statistics
- Recent searches overview
- Top users by activity
- Quick action buttons

### **User Management** (`/admin/user-management`)
- View all users with pagination
- Update user roles
- Delete user accounts
- Search and filter users

### **System Analytics** (`/admin/system-analytics`)
- Time-based analytics charts
- Search performance metrics
- User registration trends
- System health monitoring

### **System Settings** (`/admin/system-settings`)
- System configuration (super admin only)
- Feature toggles
- Performance settings

### **Audit Logs** (`/admin/audit-logs`)
- System activity logs
- User action tracking
- Security monitoring

## 🚨 Troubleshooting

### **Can't See Admin Menu?**
1. Check your user role: `SELECT role FROM profiles WHERE email = 'your-email@example.com';`
2. Make sure you're logged in with the admin account
3. Try refreshing the page after updating the role

### **Access Denied Error?**
1. Verify your role is set to 'admin' or 'super_admin'
2. Check that you're logged in
3. Clear browser cache and try again

### **Admin Routes Not Working?**
1. Make sure the backend server is running on port 4000
2. Check that admin routes are properly configured in App.tsx
3. Verify the ProtectedRoute component supports admin roles

## 📋 Admin Permissions

### **Admin Role (`admin`):**
- ✅ View admin dashboard
- ✅ Manage users
- ✅ View analytics
- ✅ Access audit logs
- ❌ System settings (super admin only)

### **Super Admin Role (`super_admin`):**
- ✅ All admin permissions
- ✅ System settings management
- ✅ Advanced configuration
- ✅ Full system control

## 🎨 Admin UI Features

- **Modern glassmorphism design** with dark theme
- **Responsive layout** works on mobile and desktop
- **Real-time statistics** with live updates
- **Interactive charts** and analytics
- **Smooth animations** and transitions
- **Role-based navigation** shows only relevant options

---

**🔗 Quick Start:** Register → Update role in DB → Login → Go to `/admin/dashboard` 