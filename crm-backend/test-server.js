import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 5001;

app.use(cors());
app.use(express.json());

// Mock data storage
let mockProjects = [
  {
    _id: '1',
    name: 'E-commerce Website',
    description: 'Complete e-commerce solution with payment gateway',
    client: { _id: '1', company: 'TechCorp Solutions' },
    projectManager: { _id: '1', name: 'Super Admin' },
    developers: [
      { _id: '2', name: 'Rahul Sharma' },
      { _id: '3', name: 'Priya Patel' },
      { _id: '4', name: 'Amit Kumar' }
    ],
    status: 'in_progress',
    priority: 'high',
    startDate: '2024-01-15',
    endDate: '2024-04-15',
    progress: 65,
    technology: ['React', 'Node.js', 'MongoDB'],
    budget: { estimated: 500000 }
  },
  {
    _id: '2',
    name: 'Mobile App Development',
    description: 'Cross-platform mobile application for client management',
    client: { _id: '2', company: 'InnovateSoft Pvt Ltd' },
    projectManager: { _id: '5', name: 'Sneha Singh' },
    developers: [
      { _id: '6', name: 'Vikash Gupta' },
      { _id: '2', name: 'Rahul Sharma' }
    ],
    status: 'planning',
    priority: 'medium',
    startDate: '2024-02-01',
    endDate: '2024-06-30',
    progress: 15,
    technology: ['React Native', 'Firebase', 'Redux'],
    budget: { estimated: 750000 }
  }
];

let mockClients = [
  {
    _id: '1',
    clientType: 'company',
    name: 'Rajesh Kumar',
    email: 'rajesh@techcorp.com',
    phone: '+91-9876543220',
    company: 'TechCorp Solutions',
    status: 'active',
    industry: 'Technology',
    website: 'https://techcorp.com',
    source: 'referral',
    address: {
      street: '123 Tech Park, Sector 18',
      city: 'Gurgaon',
      state: 'Haryana',
      zipCode: '122015',
      country: 'India'
    },
    contactPerson: {
      name: 'Rajesh Kumar',
      designation: 'CTO',
      phone: '+91-9876543220',
      email: 'rajesh@techcorp.com'
    },
    documents: {
      gst: {
        name: 'GST_Certificate_TechCorp.pdf',
        type: 'application/pdf',
        size: 245760,
        uploadedAt: '2024-01-15T10:30:00Z'
      },
      pan: {
        name: 'PAN_TechCorp.pdf',
        type: 'application/pdf',
        size: 156432,
        uploadedAt: '2024-01-15T10:32:00Z'
      },
      companyRegistration: {
        name: 'Company_Registration_TechCorp.pdf',
        type: 'application/pdf',
        size: 512000,
        uploadedAt: '2024-01-15T10:35:00Z'
      },
      other: [
        {
          id: 1,
          name: 'MOA_TechCorp.pdf',
          type: 'application/pdf',
          size: 324567,
          uploadedAt: '2024-01-15T10:40:00Z'
        }
      ]
    }
  },
  {
    _id: '2',
    clientType: 'individual',
    name: 'Priya Sharma',
    email: 'priya@gmail.com',
    phone: '+91-9876543221',
    company: '',
    status: 'prospect',
    industry: '',
    website: '',
    source: 'website',
    address: {
      street: '456 Green Avenue, Apartment 3B',
      city: 'Mumbai',
      state: 'Maharashtra',
      zipCode: '400001',
      country: 'India'
    },
    contactPerson: {
      name: 'Priya Sharma',
      designation: '',
      phone: '+91-9876543221',
      email: 'priya@gmail.com'
    },
    documents: {
      pan: {
        name: 'PAN_Priya_Sharma.jpg',
        type: 'image/jpeg',
        size: 187432,
        uploadedAt: '2024-01-20T14:15:00Z'
      },
      aadhaar: {
        name: 'Aadhaar_Priya_Sharma.pdf',
        type: 'application/pdf',
        size: 298765,
        uploadedAt: '2024-01-20T14:18:00Z'
      },
      other: []
    }
  },
  {
    _id: '3',
    clientType: 'company',
    name: 'Amit Patel',
    email: 'amit@innovatesoft.com',
    phone: '+91-9876543222',
    company: 'InnovateSoft Pvt Ltd',
    status: 'active',
    industry: 'Software Development',
    website: 'https://innovatesoft.com',
    source: 'cold_call',
    address: {
      street: '789 Business Hub, Floor 5',
      city: 'Bangalore',
      state: 'Karnataka',
      zipCode: '560001',
      country: 'India'
    },
    contactPerson: {
      name: 'Amit Patel',
      designation: 'CEO',
      phone: '+91-9876543222',
      email: 'amit@innovatesoft.com'
    },
    documents: {
      gst: null,
      pan: {
        name: 'PAN_InnovateSoft.pdf',
        type: 'application/pdf',
        size: 145632,
        uploadedAt: '2024-01-25T09:20:00Z'
      },
      companyRegistration: null,
      other: []
    }
  }
];

let mockEmployees = [
  {
    _id: '1',
    name: 'Super Admin',
    email: 'admin@crm.com',
    phone: '+91-9876543210',
    role: 'super_admin',
    department: 'Management',
    designation: 'Administrator',
    joiningDate: '2023-01-01',
    salary: {
      total: 100000,
      type: 'monthly',
      breakdown: {
        basic: 60000,
        hra: 25000,
        allowances: 15000,
        deductions: 0
      }
    },
    address: {
      street: '123 Admin Street',
      city: 'Delhi',
      state: 'Delhi',
      zipCode: '110001',
      country: 'India'
    },
    isActive: true,
    attendance: {
      percentage: 95,
      totalDays: 20,
      presentDays: 19
    },
    timeline: {
      delayedTasks: 0,
      completedTasks: 15,
      totalTasks: 15
    },
    documents: {
      aadhaar: {
        name: 'Aadhaar_Admin.pdf',
        type: 'application/pdf',
        size: 245760,
        uploadedAt: '2023-01-01T10:00:00Z'
      },
      pan: {
        name: 'PAN_Admin.pdf',
        type: 'application/pdf',
        size: 156432,
        uploadedAt: '2023-01-01T10:05:00Z'
      },
      photo: {
        name: 'Photo_Admin.jpg',
        type: 'image/jpeg',
        size: 187432,
        uploadedAt: '2023-01-01T10:10:00Z'
      },
      other: []
    }
  },
  {
    _id: '2',
    name: 'Rahul Sharma',
    email: 'rahul@crm.com',
    phone: '+91-9876543211',
    role: 'developer',
    department: 'Development',
    designation: 'Senior Developer',
    joiningDate: '2023-02-15',
    salary: {
      total: 75000,
      type: 'monthly',
      breakdown: {
        basic: 45000,
        hra: 18000,
        allowances: 12000,
        deductions: 0
      }
    },
    address: {
      street: '456 Developer Lane',
      city: 'Bangalore',
      state: 'Karnataka',
      zipCode: '560001',
      country: 'India'
    },
    isActive: true,
    attendance: {
      percentage: 88,
      totalDays: 20,
      presentDays: 17
    },
    timeline: {
      delayedTasks: 1,
      completedTasks: 12,
      totalTasks: 13
    },
    documents: {
      aadhaar: {
        name: 'Aadhaar_Rahul.pdf',
        type: 'application/pdf',
        size: 298765,
        uploadedAt: '2023-02-15T14:15:00Z'
      },
      pan: null,
      photo: {
        name: 'Photo_Rahul.jpg',
        type: 'image/jpeg',
        size: 234567,
        uploadedAt: '2023-02-15T14:20:00Z'
      },
      other: []
    }
  },
  {
    _id: '3',
    name: 'Priya Patel',
    email: 'priya@crm.com',
    phone: '+91-9876543212',
    role: 'developer',
    department: 'Development',
    designation: 'Frontend Developer',
    joiningDate: '2023-03-10',
    salary: {
      total: 780000,
      type: 'yearly',
      breakdown: {
        basic: 468000,
        hra: 187200,
        allowances: 124800,
        deductions: 0
      }
    },
    address: {
      street: '789 Frontend Avenue',
      city: 'Mumbai',
      state: 'Maharashtra',
      zipCode: '400001',
      country: 'India'
    },
    isActive: true,
    attendance: {
      percentage: 92,
      totalDays: 20,
      presentDays: 18
    },
    timeline: {
      delayedTasks: 0,
      completedTasks: 10,
      totalTasks: 10
    },
    documents: {
      aadhaar: {
        name: 'Aadhaar_Priya.pdf',
        type: 'application/pdf',
        size: 276543,
        uploadedAt: '2023-03-10T11:30:00Z'
      },
      pan: {
        name: 'PAN_Priya.pdf',
        type: 'application/pdf',
        size: 145632,
        uploadedAt: '2023-03-10T11:35:00Z'
      },
      photo: null,
      other: [
        {
          id: 1,
          name: 'Resume_Priya.pdf',
          type: 'application/pdf',
          size: 324567,
          uploadedAt: '2023-03-10T11:40:00Z'
        }
      ]
    }
  },
  {
    _id: '4',
    name: 'Amit Kumar',
    email: 'amit@crm.com',
    phone: '+91-9876543213',
    role: 'developer',
    department: 'Development',
    designation: 'Backend Developer',
    joiningDate: '2023-04-05',
    salary: {
      total: 70000,
      type: 'monthly',
      breakdown: {
        basic: 42000,
        hra: 16800,
        allowances: 11200,
        deductions: 0
      }
    },
    address: {
      street: '321 Backend Road',
      city: 'Pune',
      state: 'Maharashtra',
      zipCode: '411001',
      country: 'India'
    },
    isActive: true,
    attendance: {
      percentage: 85,
      totalDays: 20,
      presentDays: 17
    },
    timeline: {
      delayedTasks: 2,
      completedTasks: 8,
      totalTasks: 10
    },
    documents: {
      aadhaar: {
        name: 'Aadhaar_Amit.pdf',
        type: 'application/pdf',
        size: 287654,
        uploadedAt: '2023-04-05T09:15:00Z'
      },
      pan: null,
      photo: null,
      other: []
    }
  },
  {
    _id: '5',
    name: 'Sneha Singh',
    email: 'sneha@crm.com',
    phone: '+91-9876543214',
    role: 'sub_admin',
    department: 'Development',
    designation: 'Team Lead',
    joiningDate: '2023-01-20',
    salary: {
      total: 85000,
      type: 'monthly',
      breakdown: {
        basic: 51000,
        hra: 20400,
        allowances: 13600,
        deductions: 0
      }
    },
    address: {
      street: '654 Team Lead Plaza',
      city: 'Hyderabad',
      state: 'Telangana',
      zipCode: '500001',
      country: 'India'
    },
    isActive: true,
    attendance: {
      percentage: 96,
      totalDays: 20,
      presentDays: 19
    },
    timeline: {
      delayedTasks: 0,
      completedTasks: 18,
      totalTasks: 18
    },
    documents: {
      aadhaar: {
        name: 'Aadhaar_Sneha.pdf',
        type: 'application/pdf',
        size: 312456,
        uploadedAt: '2023-01-20T16:20:00Z'
      },
      pan: {
        name: 'PAN_Sneha.pdf',
        type: 'application/pdf',
        size: 167890,
        uploadedAt: '2023-01-20T16:25:00Z'
      },
      photo: {
        name: 'Photo_Sneha.jpg',
        type: 'image/jpeg',
        size: 198765,
        uploadedAt: '2023-01-20T16:30:00Z'
      },
      other: []
    }
  },
  {
    _id: '6',
    name: 'Vikash Gupta',
    email: 'vikash@crm.com',
    phone: '+91-9876543215',
    role: 'developer',
    department: 'Development',
    designation: 'Full Stack Developer',
    joiningDate: '2023-05-12',
    salary: {
      total: 68000,
      type: 'monthly',
      breakdown: {
        basic: 40800,
        hra: 16320,
        allowances: 10880,
        deductions: 0
      }
    },
    address: {
      street: '987 Full Stack Street',
      city: 'Chennai',
      state: 'Tamil Nadu',
      zipCode: '600001',
      country: 'India'
    },
    isActive: true,
    attendance: {
      percentage: 90,
      totalDays: 20,
      presentDays: 18
    },
    timeline: {
      delayedTasks: 1,
      completedTasks: 14,
      totalTasks: 15
    },
    documents: {
      aadhaar: {
        name: 'Aadhaar_Vikash.pdf',
        type: 'application/pdf',
        size: 289123,
        uploadedAt: '2023-05-12T12:45:00Z'
      },
      pan: {
        name: 'PAN_Vikash.pdf',
        type: 'application/pdf',
        size: 154321,
        uploadedAt: '2023-05-12T12:50:00Z'
      },
      photo: null,
      other: []
    }
  }
];

let mockAttendance = [
  {
    _id: '1',
    employee: { _id: '1', name: 'Super Admin', email: 'admin@crm.com' },
    date: new Date().toISOString().split('T')[0],
    checkIn: { time: new Date().toISOString() },
    checkOut: { time: null },
    status: 'present',
    totalHours: 0
  }
];

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Test server is running',
    timestamp: new Date().toISOString()
  });
});

// Auth endpoints
app.post('/api/auth/login', (req, res) => {
  const { email, password, otp } = req.body;
  
  if (email === 'admin@crm.com' && password === 'admin123' && otp === '123456') {
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          _id: '1',
          name: 'Super Admin',
          email: 'admin@crm.com',
          role: 'super_admin'
        },
        token: 'mock-jwt-token-' + Date.now()
      }
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }
});

app.get('/api/auth/me', (req, res) => {
  res.json({
    success: true,
    data: {
      user: {
        _id: '1',
        name: 'Super Admin',
        email: 'admin@crm.com',
        role: 'super_admin'
      }
    }
  });
});

// Projects endpoints
app.get('/api/projects', (req, res) => {
  res.json({
    success: true,
    data: { projects: mockProjects }
  });
});

app.post('/api/projects', (req, res) => {
  const newProject = {
    _id: Date.now().toString(),
    ...req.body,
    client: mockClients.find(c => c._id === req.body.client) || { _id: req.body.client, company: 'Unknown Client' },
    projectManager: mockEmployees.find(e => e._id === req.body.projectManager) || { _id: req.body.projectManager, name: 'Unknown Manager' },
    developers: req.body.developers ? req.body.developers.map(devId => {
      const dev = mockEmployees.find(e => e._id === devId);
      return dev ? { _id: dev._id, name: dev.name } : { _id: devId, name: 'Unknown Developer' };
    }) : []
  };
  mockProjects.push(newProject);
  res.json({
    success: true,
    message: 'Project created successfully',
    data: { project: newProject }
  });
});

app.put('/api/projects/:id', (req, res) => {
  const projectId = req.params.id;
  const projectIndex = mockProjects.findIndex(p => p._id === projectId);
  
  if (projectIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Project not found'
    });
  }
  
  const updatedProject = {
    ...mockProjects[projectIndex],
    ...req.body,
    client: req.body.client ? (mockClients.find(c => c._id === req.body.client) || { _id: req.body.client, company: 'Unknown Client' }) : mockProjects[projectIndex].client,
    projectManager: req.body.projectManager ? (mockEmployees.find(e => e._id === req.body.projectManager) || { _id: req.body.projectManager, name: 'Unknown Manager' }) : mockProjects[projectIndex].projectManager,
    developers: req.body.developers ? req.body.developers.map(devId => {
      const dev = mockEmployees.find(e => e._id === devId);
      return dev ? { _id: dev._id, name: dev.name } : { _id: devId, name: 'Unknown Developer' };
    }) : mockProjects[projectIndex].developers
  };
  
  mockProjects[projectIndex] = updatedProject;
  
  res.json({
    success: true,
    message: 'Project updated successfully',
    data: { project: updatedProject }
  });
});

app.delete('/api/projects/:id', (req, res) => {
  const projectId = req.params.id;
  const projectIndex = mockProjects.findIndex(p => p._id === projectId);
  
  if (projectIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Project not found'
    });
  }
  
  mockProjects.splice(projectIndex, 1);
  
  res.json({
    success: true,
    message: 'Project deleted successfully'
  });
});

// Clients endpoints
app.get('/api/clients', (req, res) => {
  res.json({
    success: true,
    data: { clients: mockClients }
  });
});

app.post('/api/clients', (req, res) => {
  const newClient = {
    _id: Date.now().toString(),
    ...req.body
  };
  mockClients.push(newClient);
  res.json({
    success: true,
    message: 'Client created successfully',
    data: { client: newClient }
  });
});

app.put('/api/clients/:id', (req, res) => {
  const clientId = req.params.id;
  const clientIndex = mockClients.findIndex(c => c._id === clientId);
  
  if (clientIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Client not found'
    });
  }
  
  mockClients[clientIndex] = {
    ...mockClients[clientIndex],
    ...req.body
  };
  
  res.json({
    success: true,
    message: 'Client updated successfully',
    data: { client: mockClients[clientIndex] }
  });
});

app.delete('/api/clients/:id', (req, res) => {
  const clientId = req.params.id;
  const clientIndex = mockClients.findIndex(c => c._id === clientId);
  
  if (clientIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Client not found'
    });
  }
  
  mockClients.splice(clientIndex, 1);
  
  res.json({
    success: true,
    message: 'Client deleted successfully'
  });
});

// Employees endpoints
app.get('/api/employees', (req, res) => {
  res.json({
    success: true,
    data: { 
      employees: mockEmployees,
      filters: {
        departments: ['Management', 'Development', 'Design'],
        roles: ['super_admin', 'admin', 'developer']
      }
    }
  });
});

app.get('/api/employees/stats', (req, res) => {
  res.json({
    success: true,
    data: {
      totalEmployees: mockEmployees.length,
      activeEmployees: mockEmployees.filter(e => e.isActive).length,
      employeesByDepartment: [
        { _id: 'Management', count: 1 },
        { _id: 'Development', count: 2 }
      ],
      salaryStats: {
        avgSalary: 75000,
        minSalary: 50000,
        maxSalary: 100000
      }
    }
  });
});

app.post('/api/employees', (req, res) => {
  const newEmployee = {
    _id: Date.now().toString(),
    ...req.body,
    isActive: true
  };
  mockEmployees.push(newEmployee);
  res.json({
    success: true,
    message: 'Employee created successfully',
    data: { employee: newEmployee }
  });
});

// Attendance endpoints
app.get('/api/attendance', (req, res) => {
  res.json({
    success: true,
    data: { attendance: mockAttendance }
  });
});

app.get('/api/attendance/today', (req, res) => {
  const today = mockAttendance.find(a => a.date === new Date().toISOString().split('T')[0]);
  res.json({
    success: true,
    data: { attendance: today }
  });
});

app.post('/api/attendance/checkin', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  let attendance = mockAttendance.find(a => a.date === today);
  
  if (!attendance) {
    attendance = {
      _id: Date.now().toString(),
      employee: { _id: '1', name: 'Super Admin', email: 'admin@crm.com' },
      date: today,
      checkIn: { time: new Date().toISOString() },
      checkOut: { time: null },
      status: 'present',
      totalHours: 0
    };
    mockAttendance.push(attendance);
  } else {
    attendance.checkIn = { time: new Date().toISOString() };
  }
  
  res.json({
    success: true,
    message: 'Checked in successfully',
    data: { attendance }
  });
});

app.post('/api/attendance/checkout', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const attendance = mockAttendance.find(a => a.date === today);
  
  if (attendance) {
    attendance.checkOut = { time: new Date().toISOString() };
    const checkInTime = new Date(attendance.checkIn.time);
    const checkOutTime = new Date(attendance.checkOut.time);
    attendance.totalHours = (checkOutTime - checkInTime) / (1000 * 60 * 60);
  }
  
  res.json({
    success: true,
    message: 'Checked out successfully',
    data: { attendance }
  });
});

app.get('/api/attendance/stats', (req, res) => {
  res.json({
    success: true,
    data: {
      totalRecords: mockAttendance.length,
      avgHours: 8.5,
      lateArrivals: 0,
      statusStats: [
        { _id: 'present', count: 1 }
      ]
    }
  });
});

// Dashboard endpoints
app.get('/api/users/stats/overview', (req, res) => {
  res.json({
    success: true,
    data: {
      totalUsers: mockEmployees.length,
      activeUsers: mockEmployees.filter(e => e.isActive).length
    }
  });
});

app.get('/api/activities/my', (req, res) => {
  res.json({
    success: true,
    data: {
      activities: [
        {
          _id: '1',
          action: 'Logged into system',
          entity: 'user',
          createdAt: new Date().toISOString(),
          user: { name: 'Super Admin' }
        }
      ]
    }
  });
});

// Dashboard endpoints
app.get('/api/users/stats/overview', (req, res) => {
  res.json({
    success: true,
    data: {
      totalUsers: mockEmployees.length,
      activeUsers: mockEmployees.filter(e => e.isActive).length
    }
  });
});

app.get('/api/activities/my', (req, res) => {
  res.json({
    success: true,
    data: {
      activities: [
        {
          _id: '1',
          action: 'Logged into system',
          entity: 'user',
          createdAt: new Date().toISOString(),
          user: { name: 'Super Admin' }
        }
      ]
    }
  });
});

// Additional endpoints for new pages
app.get('/api/payments', (req, res) => {
  res.json({
    success: true,
    data: { payments: [] }
  });
});

app.get('/api/procurement', (req, res) => {
  res.json({
    success: true,
    data: { procurements: [] }
  });
});

app.get('/api/invoices', (req, res) => {
  res.json({
    success: true,
    data: { invoices: [] }
  });
});

app.get('/api/amc', (req, res) => {
  res.json({
    success: true,
    data: { contracts: [] }
  });
});

app.get('/api/support-tickets', (req, res) => {
  res.json({
    success: true,
    data: { tickets: [] }
  });
});

app.get('/api/accounting/transactions', (req, res) => {
  res.json({
    success: true,
    data: { transactions: [] }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Test server running on port ${PORT}`);
});