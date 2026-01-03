# CRM System - Complete Full-Stack Application

A comprehensive Customer Relationship Management (CRM) system built with React frontend and Node.js backend.

## 🚀 Features

### Core Modules
- **Dashboard** - Overview with analytics and quick stats
- **Clients Management** - Complete client lifecycle management
- **Projects Management** - Project tracking with developer assignments
- **Employees Management** - HR management with document uploads
- **Payments** - Payment tracking with installment support
- **Procurement** - Purchase order management with auto-calculations
- **Invoices** - Invoice generation and management
- **AMC** - Annual Maintenance Contract management
- **Support Tickets** - Customer support ticket system
- **Accounting** - Financial transaction management
- **Activity Logs** - System activity tracking
- **Attendance** - Employee attendance management

### Advanced Features
- **Auto-Generated Numbers** - Invoice numbers, PO numbers
- **Document Upload** - File management with validation
- **Installment Payments** - Flexible payment terms
- **Developer Assignment** - Multi-developer project assignments
- **Address Management** - Complete address handling
- **Salary Breakdown** - Detailed salary components
- **Vendor Management** - Service provider management
- **Real-time Calculations** - Auto-calculating totals

## 🛠️ Technology Stack

### Frontend (crm-frontent)
- **React 18** - Modern React with hooks
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Beautiful icons
- **React Hot Toast** - Toast notifications
- **Vite** - Fast build tool

### Backend (crm-backend)
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling
- **JWT** - Authentication
- **Bcrypt** - Password hashing
- **CORS** - Cross-origin resource sharing

## 📁 Project Structure

```
crm-system/
├── crm-frontent/          # React frontend application
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── contexts/      # React contexts
│   │   ├── pages/         # Page components
│   │   ├── services/      # API services
│   │   └── assets/        # Static assets
│   ├── public/            # Public assets
│   └── package.json       # Frontend dependencies
├── crm-backend/           # Node.js backend application
│   ├── models/            # Database models
│   ├── routes/            # API routes
│   ├── middleware/        # Custom middleware
│   ├── server.js          # Main server file
│   ├── test-server.js     # Development test server
│   └── package.json       # Backend dependencies
└── README.md              # Project documentation
```

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or cloud)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd crm-system
   ```

2. **Setup Backend**
   ```bash
   cd crm-backend
   npm install
   cp .env.example .env
   # Configure your environment variables
   npm run dev
   ```

3. **Setup Frontend**
   ```bash
   cd crm-frontent
   npm install
   npm run dev
   ```

4. **Quick Start (Both servers)**
   ```bash
   # From root directory
   ./start-crm.bat  # Windows
   # or
   ./start-crm.sh   # Linux/Mac
   ```

### Environment Variables

**Backend (.env)**
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/crm
JWT_SECRET=your-jwt-secret
NODE_ENV=development
```

**Frontend (.env)**
```
VITE_API_URL=http://localhost:5000/api
```

## 🔐 Authentication

### Default Login Credentials
- **Email**: admin@crm.com
- **Password**: admin123
- **OTP**: 123456

### User Roles
- **Super Admin** - Full system access
- **Admin** - Administrative access
- **Sub Admin** - Limited administrative access
- **Developer** - Project-specific access
- **Employee** - Basic access

## 📊 Key Features Details

### Client Management
- Individual and Company client types
- Complete address management
- Document upload (GST, PAN, Aadhaar)
- Client type filtering and search

### Project Management
- Multi-developer assignment
- Project progress tracking
- Budget management
- Technology stack tracking
- Client and manager assignment

### Employee Management
- Complete HR information
- Document management (mandatory Aadhaar)
- Salary breakdown (monthly/yearly)
- Address and contact information
- Attendance tracking

### Payment System
- Auto-generated invoice numbers
- Installment payment support
- Client and project integration
- Multiple payment methods
- Payment status tracking

### Procurement System
- Auto-generated PO numbers
- Service-based categories
- Vendor management
- Auto-calculating totals
- Delivery tracking

## 🔧 Development

### Running in Development Mode

**Backend Development Server**
```bash
cd crm-backend
npm run dev          # Main server on port 5000
node test-server.js  # Test server on port 5001
```

**Frontend Development Server**
```bash
cd crm-frontent
npm run dev          # Vite dev server on port 5173
```

### Building for Production

**Frontend Build**
```bash
cd crm-frontent
npm run build
```

**Backend Build**
```bash
cd crm-backend
npm run build
```

## 📝 API Documentation

### Authentication Endpoints
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - User logout

### Core Endpoints
- `GET /api/clients` - Get all clients
- `POST /api/clients` - Create new client
- `GET /api/projects` - Get all projects
- `POST /api/projects` - Create new project
- `GET /api/employees` - Get all employees
- `POST /api/employees` - Create new employee
- `GET /api/payments` - Get all payments
- `POST /api/payments` - Create new payment

## 🎨 UI/UX Features

- **Responsive Design** - Works on all devices
- **Modern Interface** - Clean, professional design
- **Toast Notifications** - User feedback system
- **Loading States** - Smooth user experience
- **Form Validation** - Client and server-side validation
- **Search & Filtering** - Easy data discovery
- **Pagination** - Efficient data handling

## 🔒 Security Features

- **JWT Authentication** - Secure token-based auth
- **Password Hashing** - Bcrypt encryption
- **Role-based Access** - Permission system
- **Input Validation** - XSS and injection prevention
- **CORS Configuration** - Cross-origin security
- **File Upload Security** - File type and size validation

## 📱 Mobile Responsiveness

The application is fully responsive and works seamlessly on:
- Desktop computers
- Tablets
- Mobile phones
- Different screen orientations

## 🚀 Deployment

### Frontend Deployment
- Build the React app: `npm run build`
- Deploy the `dist` folder to your hosting service
- Configure environment variables

### Backend Deployment
- Set up Node.js environment
- Configure MongoDB connection
- Set environment variables
- Start the server: `npm start`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the feature documentation files

## 📈 Version History

- **v1.0.0** - Initial release with core CRM features
- **v1.1.0** - Added document upload and address management
- **v1.2.0** - Enhanced payments with installment support
- **v1.3.0** - Improved procurement with auto-calculations
- **v1.4.0** - Added developer assignment and employee enhancements

---

**Built with ❤️ for efficient business management**