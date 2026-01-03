# CRM Backend API

A comprehensive CRM (Customer Relationship Management) backend API built with Node.js, Express, and MongoDB.

## Features

- **Authentication & Authorization**: JWT-based auth with role-based access control
- **User Management**: Complete user CRUD with different roles
- **Client Management**: Client information and relationship tracking
- **Project Management**: Project tracking with team assignments and milestones
- **Attendance System**: Employee attendance tracking with check-in/out
- **Activity Logging**: Comprehensive audit trail of all system activities
- **Security**: Rate limiting, input validation, and security headers

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Express Validator
- **Security**: Helmet, CORS, Rate Limiting
- **Password Hashing**: bcryptjs

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd crm-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   ```
   Update the `.env` file with your configuration:
   ```env
   PORT=5000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/crm_database
   JWT_SECRET=your_super_secret_jwt_key_here
   JWT_EXPIRE=7d
   FRONTEND_URL=http://localhost:5173
   ```

4. **Start MongoDB**
   Make sure MongoDB is running on your system.

5. **Seed the database** (Optional)
   ```bash
   npm run seed
   ```

6. **Start the server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - Register new user (Admin only)
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout user
- `POST /api/auth/change-password` - Change password

### Users
- `GET /api/users` - Get all users (Admin only)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user (Admin only)
- `GET /api/users/stats/overview` - Get user statistics

### Clients
- `GET /api/clients` - Get all clients
- `POST /api/clients` - Create new client
- `GET /api/clients/:id` - Get client by ID
- `PUT /api/clients/:id` - Update client
- `DELETE /api/clients/:id` - Delete client (Admin only)
- `POST /api/clients/:id/notes` - Add note to client

### Projects
- `GET /api/projects` - Get all projects
- `POST /api/projects` - Create new project
- `GET /api/projects/:id` - Get project by ID
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project (Admin only)
- `POST /api/projects/:id/team` - Add team member to project

### Employees
- `GET /api/employees` - Get all employees
- `GET /api/employees/:id` - Get employee by ID
- `GET /api/employees/stats` - Get employee statistics

### Attendance
- `GET /api/attendance` - Get attendance records
- `POST /api/attendance/checkin` - Check in attendance
- `POST /api/attendance/checkout` - Check out attendance
- `GET /api/attendance/today` - Get today's attendance
- `GET /api/attendance/stats` - Get attendance statistics

### Activities
- `GET /api/activities` - Get activity logs (Super Admin only)
- `GET /api/activities/stats` - Get activity statistics
- `GET /api/activities/my` - Get current user's activities

## User Roles

1. **super_admin**: Full system access
2. **admin**: Administrative access (cannot manage super admins)
3. **sub_admin**: Limited administrative access
4. **accounts_manager**: Financial and accounting access
5. **support_executive**: Customer support access
6. **developer**: Basic project and development access

## Default Users (After Seeding)

| Email | Password | Role |
|-------|----------|------|
| admin@crm.com | admin123 | super_admin |
| manager@crm.com | manager123 | admin |
| alice@crm.com | alice123 | developer |
| bob@crm.com | bob123 | developer |
| sarah@crm.com | sarah123 | support_executive |
| mike@crm.com | mike123 | accounts_manager |

**Note**: Default OTP for all users is `123456`

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Role-based Access Control**: Different permission levels
- **Rate Limiting**: Prevents API abuse
- **Input Validation**: Validates all incoming data
- **Password Hashing**: Secure password storage
- **CORS Protection**: Cross-origin request security
- **Security Headers**: Helmet.js for security headers

## Development

```bash
# Install dependencies
npm install

# Start development server with auto-reload
npm run dev

# Seed database with sample data
npm run seed

# Start production server
npm start
```

## Project Structure

```
crm-backend/
├── models/           # Database models
├── routes/           # API routes
├── middleware/       # Custom middleware
├── .env             # Environment variables
├── server.js        # Main server file
├── seed.js          # Database seeding script
└── package.json     # Dependencies and scripts
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the ISC License.