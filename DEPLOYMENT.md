# CRM System - Complete Deployment Guide

## 🎉 System Overview

This is a complete, production-ready CRM (Customer Relationship Management) system with:

- **Frontend**: React 18 + Vite + Tailwind CSS
- **Backend**: Node.js + Express + MongoDB
- **Authentication**: JWT with role-based access control
- **Real-time Features**: Activity logging, attendance tracking
- **Responsive Design**: Works on desktop, tablet, and mobile

## 🚀 Quick Start (5 Minutes)

### Prerequisites
- Node.js (v16+)
- MongoDB (local or Atlas)
- Git

### 1. Clone & Setup
```bash
git clone <your-repo>
cd crm-system
```

### 2. Backend Setup
```bash
cd crm-backend
npm install
```

Create `.env` file:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/crm_database
JWT_SECRET=your_super_secret_jwt_key_change_in_production
JWT_EXPIRE=7d
FRONTEND_URL=http://localhost:5173
```

### 3. Frontend Setup
```bash
cd ../crm-frontent
npm install
```

Create `.env` file:
```env
VITE_API_URL=http://localhost:5000/api
```

### 4. Start Everything
```bash
# Option 1: Use the startup script (Windows)
double-click start-crm.bat

# Option 2: Manual start
# Terminal 1 - Backend
cd crm-backend
npm run seed    # Creates sample data
npm run dev

# Terminal 2 - Frontend
cd crm-frontent
npm run dev
```

### 5. Access the System
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000/api

## 🔐 Login Credentials

| Email | Password | Role | Access Level |
|-------|----------|------|--------------|
| admin@crm.com | admin123 | super_admin | Full system access |
| manager@crm.com | manager123 | admin | Administrative access |
| alice@crm.com | alice123 | developer | Development access |
| bob@crm.com | bob123 | developer | Development access |
| sarah@crm.com | sarah123 | support_executive | Support access |
| mike@crm.com | mike123 | accounts_manager | Accounting access |

**OTP for all users**: `123456`

## 📋 Features Implemented

### ✅ Authentication & Security
- JWT-based authentication
- Role-based access control (6 roles)
- Password hashing with bcrypt
- Rate limiting and security headers
- Activity logging for audit trails

### ✅ User Management
- Complete CRUD operations
- Role-based permissions
- User statistics and analytics
- Profile management

### ✅ Client Management
- Client information tracking
- Contact management
- Notes and communication history
- Search and filtering

### ✅ Project Management
- Project lifecycle tracking
- Team assignment and management
- Progress monitoring
- Milestone tracking
- Technology stack management
- Budget tracking

### ✅ Employee Management
- Employee profiles and information
- Department and role management
- Salary information (admin only)
- Performance tracking

### ✅ Attendance System
- Real-time check-in/check-out
- Location tracking (optional)
- Attendance statistics
- Monthly reports
- Late arrival tracking

### ✅ Dashboard & Analytics
- Real-time statistics
- Activity feeds
- Charts and visualizations
- Performance metrics

### ✅ Activity Logging
- Comprehensive audit trail
- User action tracking
- System event logging
- Security monitoring

## 🎨 UI/UX Features

### ✅ Design System
- Consistent branding with company logo
- Primary color scheme (#2563eb)
- Responsive design (mobile-first)
- Loading states and error handling
- Toast notifications

### ✅ User Experience
- Intuitive navigation
- Search and filtering
- Modal dialogs
- Form validation
- Accessibility compliance

## 🔧 Technical Architecture

### Backend (Node.js/Express)
```
crm-backend/
├── models/          # MongoDB schemas
├── routes/          # API endpoints
├── middleware/      # Authentication, logging
├── server.js        # Main server file
└── seed.js         # Database seeding
```

### Frontend (React/Vite)
```
crm-frontent/
├── src/
│   ├── components/  # Reusable components
│   ├── pages/       # Page components
│   ├── contexts/    # React contexts
│   ├── services/    # API services
│   └── main.jsx     # Entry point
└── public/         # Static assets
```

## 📊 Database Schema

### Collections
- **users** - Employee/user information
- **clients** - Client management
- **projects** - Project tracking
- **attendance** - Attendance records
- **activities** - Audit logs

### Relationships
- Projects → Clients (many-to-one)
- Projects → Users (many-to-many)
- Attendance → Users (many-to-one)
- Activities → Users (many-to-one)

## 🔒 Security Features

- **Authentication**: JWT tokens with expiration
- **Authorization**: Role-based access control
- **Input Validation**: Server-side validation
- **Rate Limiting**: API abuse prevention
- **CORS**: Cross-origin protection
- **Helmet**: Security headers
- **Password Hashing**: bcrypt with salt

## 📱 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Current user
- `POST /api/auth/logout` - Logout

### Users
- `GET /api/users` - List users
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Clients
- `GET /api/clients` - List clients
- `POST /api/clients` - Create client
- `PUT /api/clients/:id` - Update client
- `DELETE /api/clients/:id` - Delete client

### Projects
- `GET /api/projects` - List projects
- `POST /api/projects` - Create project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Attendance
- `POST /api/attendance/checkin` - Check in
- `POST /api/attendance/checkout` - Check out
- `GET /api/attendance` - Attendance records
- `GET /api/attendance/stats` - Statistics

## 🚀 Production Deployment

### Backend Deployment (Heroku/DigitalOcean/AWS)
1. Set environment variables
2. Configure MongoDB Atlas
3. Deploy with `npm start`

### Frontend Deployment (Vercel/Netlify)
1. Build: `npm run build`
2. Deploy `dist` folder
3. Configure environment variables

### Environment Variables

**Backend (.env)**
```env
PORT=5000
NODE_ENV=production
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/crm
JWT_SECRET=your_production_secret_key
FRONTEND_URL=https://your-frontend-domain.com
```

**Frontend (.env)**
```env
VITE_API_URL=https://your-backend-domain.com/api
```

## 🔧 Development

### Adding New Features
1. Backend: Add routes in `routes/`
2. Frontend: Add components in `components/`
3. Update API service in `services/api.js`
4. Test with sample data

### Database Changes
1. Update models in `models/`
2. Run seed script: `npm run seed`
3. Update API endpoints

### UI Changes
1. Follow existing design patterns
2. Use Tailwind CSS classes
3. Maintain responsive design
4. Test on mobile devices

## 🐛 Troubleshooting

### Common Issues

**MongoDB Connection Error**
```bash
# Check if MongoDB is running
mongod --version
# Or use MongoDB Atlas connection string
```

**Port Already in Use**
```bash
# Kill process on port 5000
npx kill-port 5000
# Or change PORT in .env
```

**CORS Errors**
- Check FRONTEND_URL in backend .env
- Verify API_URL in frontend .env

**Authentication Issues**
- Clear localStorage in browser
- Check JWT_SECRET in backend
- Verify token expiration

## 📈 Performance Optimization

### Backend
- Database indexing
- Query optimization
- Caching strategies
- Rate limiting

### Frontend
- Code splitting
- Lazy loading
- Image optimization
- Bundle analysis

## 🔄 Backup & Maintenance

### Database Backup
```bash
mongodump --uri="mongodb://localhost:27017/crm_database"
```

### Log Monitoring
- Check server logs
- Monitor API response times
- Track user activities
- Security audit logs

## 📞 Support

### Getting Help
1. Check console errors
2. Verify environment variables
3. Test API endpoints
4. Check database connections

### Contributing
1. Fork repository
2. Create feature branch
3. Make changes
4. Submit pull request

---

## 🎊 Congratulations!

You now have a complete, production-ready CRM system with:
- ✅ Full authentication system
- ✅ Role-based access control
- ✅ Complete CRUD operations
- ✅ Real-time features
- ✅ Responsive design
- ✅ Security best practices
- ✅ Comprehensive documentation

**Happy managing! 🚀**