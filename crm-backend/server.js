import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import path from 'path';

// Load environment variables FIRST before any other imports
dotenv.config();

import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import employeeRoutes from './routes/employees.js';
import clientRoutes from './routes/clients.js';
import projectRoutes from './routes/projects.js';
import attendanceRoutes from './routes/attendance.js';
import activityRoutes from './routes/activities.js';
import leaveRoutes from './routes/leaves.js';
import taskRoutes from './routes/tasks.js';
import ticketRoutes from './routes/tickets.js';
import leadRoutes from './routes/leads.js';
import invoiceRoutes from './routes/invoices.js';
import contractRoutes from './routes/contracts.js';
import timelogRoutes from './routes/timelogs.js';
import documentRoutes from './routes/documents.js';
import reportRoutes from './routes/reports.js';
import assignmentRoutes from './routes/assignments.js';
import progressRoutes from './routes/progress.js';
import notificationRoutes from './routes/notifications.js';
import roleRoutes from './routes/roles.js';
import paymentRoutes from './routes/payments.js';
import procurementRoutes from './routes/procurement.js';
import vendorRoutes from './routes/vendors.js';
import amcRoutes from './routes/amc.js';
import accountingRoutes from './routes/accounting.js';
import departmentRoutes from './routes/departments.js';
import serviceRoutes from './routes/services.js';
import quotationRoutes from './routes/quotations.js';
import quoteRoutes from './routes/quotes.js';
import emailService from './services/emailService.js';
import whatsappService from './services/whatsappService.js';

// Initialize services
console.log('📧 Initializing email service...');
console.log('📱 Initializing WhatsApp service...');
whatsappService.initialize();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 5002;

// Connect to MongoDB then start server
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📋 Roles: admin | employee | sales`);
      console.log(`   Create users via POST /api/auth/register or User Management UI`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });

const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  process.env.FRONTEND_URL_PROD || 'https://parnetscrm.onrender.com',
  'http://localhost:5173',
  'http://localhost:5174',
];
app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded employee documents
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/timelogs', timelogRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/procurement', procurementRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/amc', amcRoutes);
app.use('/api/accounting', accountingRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/quotations', quotationRoutes);
app.use('/api/quotes', quoteRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'CRM Backend is running',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Email service test endpoint
app.get('/api/test-email', async (req, res) => {
  try {
    const testEmail = process.env.SMTP_USER;
    
    if (!testEmail) {
      return res.status(500).json({
        success: false,
        message: 'SMTP_USER not configured'
      });
    }

    const result = await emailService.sendMail({
      to: testEmail,
      subject: 'CRM Email Service Test',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb;">✅ Email Service Test</h2>
          <p>This is a test email from your CRM system.</p>
          <p>If you're reading this, your email service is working correctly!</p>
          <hr style="border: 1px solid #e2e8f0; margin: 20px 0;">
          <p style="color: #64748b; font-size: 14px;">
            Sent at: ${new Date().toLocaleString('en-IN')}
          </p>
        </div>
      `
    });

    if (result.success) {
      res.json({
        success: true,
        message: `Test email sent successfully to ${testEmail}`,
        messageId: result.messageId
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error || 'Failed to send email'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'API endpoint not found' });
});
