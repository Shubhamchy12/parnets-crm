# CRM System - Development Setup Guide

## 🚀 Quick Start

The CRM system is now running with a working authentication system!

### Default Admin Account
- **Email**: `admin@crm.com`
- **Password**: `admin123`

### Login Process (Development Mode)

1. **Start the backend server**:
   ```bash
   cd parnets-crm/crm-backend
   npm start
   ```

2. **Login via API or Frontend**:
   - Send POST request to `/api/auth/login` with email and password
   - System will generate an OTP and log it to the console (since SMTP is not configured)
   - Look for the OTP in the server console output like this:
     ```
     📧 ===== MOCK EMAIL =====
     🔐 OTP CODE: 123456
     ========================
     ```
   - Use the OTP to complete login via `/api/auth/verify-otp`

## 📧 Email Configuration (Production)

To enable real email sending, update these environment variables in `.env`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-actual-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your-email@gmail.com
```

### Gmail Setup
1. Enable 2-factor authentication on your Gmail account
2. Generate an "App Password" for the CRM system
3. Use the app password (not your regular password) in `SMTP_PASS`

## 🔐 Authentication System

### Features Implemented
- ✅ **Multi-factor Authentication**: Email + Password + OTP
- ✅ **Role-based Access Control**: Super Admin, Admin, Sales, Employee, Client
- ✅ **Permission Management**: Granular permissions per module and action
- ✅ **Session Management**: Secure JWT tokens with refresh capability
- ✅ **Account Security**: Login attempt limits, account locking
- ✅ **Admin User Management**: Create/edit users with role restrictions

### API Endpoints

#### Authentication
- `POST /api/auth/login` - Step 1: Email/password login
- `POST /api/auth/verify-otp` - Step 2: OTP verification
- `POST /api/auth/resend-otp` - Resend OTP
- `POST /api/auth/refresh-token` - Refresh access token
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user profile

#### Enhanced Authentication (v2)
- `POST /api/v2/auth/login` - Enhanced login with device tracking
- `POST /api/v2/auth/verify-otp` - Enhanced OTP verification
- `GET /api/v2/auth/sessions` - Get user sessions
- `DELETE /api/v2/auth/sessions/:id` - Terminate specific session

#### User Management (Admin only)
- `GET /api/users` - List all users
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user (Super Admin only)
- `PUT /api/users/:id/permissions` - Update user permissions

#### Role Management
- `GET /api/roles` - List all roles
- `POST /api/roles` - Create custom role (Super Admin only)
- `PUT /api/roles/:name` - Update role permissions
- `GET /api/roles/permissions/my` - Get current user permissions

## 🏗️ System Architecture

### Role Hierarchy
1. **Super Admin** (hierarchy: 1) - Full system access
2. **Admin** (hierarchy: 2) - User management, most features
3. **Sales** (hierarchy: 10) - Client/project management
4. **Employee** (hierarchy: 20) - Basic access, attendance
5. **Client** (hierarchy: 30) - Own projects and invoices only

### Permission System
- **Modules**: dashboard, clients, projects, employees, attendance, etc.
- **Actions**: create, read, update, delete, export, import, approve, reject
- **Caching**: Permissions are cached for 5 minutes for performance

## 🧪 Testing the System

### Test Login Flow
```bash
# Step 1: Login
curl -X POST http://localhost:5002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@crm.com","password":"admin123"}'

# Check server console for OTP, then:
# Step 2: Verify OTP (replace 123456 with actual OTP from console)
curl -X POST http://localhost:5002/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@crm.com","otp":"123456"}'
```

### Test User Creation
```bash
# Create a new user (requires admin token)
curl -X POST http://localhost:5002/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "role": "employee"
  }'
```

## 🔧 Development Notes

### Current Status
- **Backend**: ✅ Fully functional authentication and user management
- **Frontend**: ⚠️ Needs integration with new permission system
- **Database**: ✅ MongoDB with proper indexing and relationships
- **Email**: ✅ Mock service for development, ready for production SMTP

### Next Steps
1. **Frontend Integration**: Update frontend to use role-based navigation
2. **Session Management**: Implement automatic logout and session monitoring
3. **Real-time Updates**: Add WebSocket support for permission changes
4. **Testing**: Add comprehensive test suite

### Known Issues
- Some duplicate MongoDB index warnings (cosmetic, doesn't affect functionality)
- Frontend may need updates to use new permission endpoints

## 📝 Environment Variables

```env
# Server Configuration
PORT=5002
FRONTEND_URL=http://localhost:5173
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/crm-database

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-here-change-in-production
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# Email Configuration (Optional for development)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your-email@gmail.com
```

## 🆘 Troubleshooting

### Common Issues

1. **"Failed to send OTP"**: 
   - In development: Check if server console shows mock email logs
   - In production: Verify SMTP credentials in .env file

2. **"Invalid or expired refresh token"**:
   - Clear localStorage and login again
   - Check if JWT secrets are consistent

3. **Permission denied errors**:
   - Verify user role and permissions
   - Check if role hierarchy allows the action

4. **Database connection issues**:
   - Ensure MongoDB is running
   - Check MONGODB_URI in .env file

### Getting Help
- Check server console logs for detailed error messages
- Verify API endpoints are being called correctly
- Ensure proper authentication headers are included