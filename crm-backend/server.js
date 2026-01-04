import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Import routes
import authRoutes from './routes/auth.js';
import enhancedAuthRoutes from './routes/enhancedAuth.js';
import adminRegistrationRoutes from './routes/adminRegistration.js';
import userRoutes from './routes/users.js';
import roleRoutes from './routes/roles.js';
import clientRoutes from './routes/clients.js';
import projectRoutes from './routes/projects.js';
import employeeRoutes from './routes/employees.js';
import attendanceRoutes from './routes/attendance.js';
import activityRoutes from './routes/activities.js';

// Import models
import User from './models/User.js';
import OTP from './models/OTP.js';
import Session from './models/Session.js';
import RoleConfig from './models/RoleConfig.js';
import AdminRegistration from './models/AdminRegistration.js';

// Import services
import cleanupService from './services/cleanupService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5002;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/crm-system')
  .then(async () => {
    console.log('✅ Connected to MongoDB');
    
    // Initialize default roles
    try {
      await RoleConfig.initializeDefaultRoles();
      console.log('✅ Default roles initialized');
    } catch (error) {
      console.error('❌ Error initializing roles:', error.message);
    }
    
    // Check if admin registration is completed, if not, don't create default admin
    try {
      const isRegistrationCompleted = await AdminRegistration.isRegistrationCompleted();
      
      if (!isRegistrationCompleted) {
        console.log('⚠️  Admin registration not completed - admin registration will be available on login page');
      } else {
        console.log('✅ Admin registration already completed');
        
        // Only create default super admin if registration is completed but no admin exists
        // This handles migration from old system
        const superAdminExists = await User.findOne({ role: 'super_admin' });
        if (!superAdminExists) {
          const superAdmin = await User.createSuperAdmin({
            name: process.env.SUPER_ADMIN_NAME || 'Super Admin',
            email: process.env.SUPER_ADMIN_EMAIL || 'admin@crm.com',
            password: process.env.SUPER_ADMIN_PASSWORD || 'admin123'
          });
          console.log('✅ Super Admin created for migration:', superAdmin.email);
        }
      }
    } catch (error) {
      console.error('❌ Error checking admin registration status:', error.message);
    }
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    console.log('⚠️  Running without MongoDB - some features may not work');
  });

// Routes
app.use('/api/auth', authRoutes); // Legacy auth routes
app.use('/api/v2/auth', enhancedAuthRoutes); // Enhanced auth routes
app.use('/api/auth', adminRegistrationRoutes); // Admin registration routes
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/activities', activityRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'CRM Backend API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler - must be last
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'API endpoint not found' 
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
  console.log(`🔐 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Start cleanup service
  cleanupService.start();
});