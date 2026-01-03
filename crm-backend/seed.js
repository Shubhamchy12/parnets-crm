import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Client from './models/Client.js';
import Project from './models/Project.js';

dotenv.config();

const seedData = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Client.deleteMany({});
    await Project.deleteMany({});
    console.log('🗑️ Cleared existing data');

    // Create users
    const users = await User.create([
      {
        name: 'Super Admin',
        email: 'admin@crm.com',
        password: 'admin123',
        role: 'super_admin',
        department: 'Management',
        designation: 'Super Administrator',
        phone: '+91-9876543210'
      },
      {
        name: 'John Manager',
        email: 'manager@crm.com',
        password: 'manager123',
        role: 'admin',
        department: 'Management',
        designation: 'Project Manager',
        phone: '+91-9876543211',
        salary: 80000
      },
      {
        name: 'Alice Developer',
        email: 'alice@crm.com',
        password: 'alice123',
        role: 'developer',
        department: 'Development',
        designation: 'Senior Developer',
        phone: '+91-9876543212',
        salary: 60000
      },
      {
        name: 'Bob Designer',
        email: 'bob@crm.com',
        password: 'bob123',
        role: 'developer',
        department: 'Design',
        designation: 'UI/UX Designer',
        phone: '+91-9876543213',
        salary: 55000
      },
      {
        name: 'Sarah Support',
        email: 'sarah@crm.com',
        password: 'sarah123',
        role: 'support_executive',
        department: 'Support',
        designation: 'Support Executive',
        phone: '+91-9876543214',
        salary: 35000
      },
      {
        name: 'Mike Accounts',
        email: 'mike@crm.com',
        password: 'mike123',
        role: 'accounts_manager',
        department: 'Accounts',
        designation: 'Accounts Manager',
        phone: '+91-9876543215',
        salary: 50000
      }
    ]);

    console.log('👥 Created users');

    // Create clients
    const clients = await Client.create([
      {
        name: 'Rajesh Kumar',
        email: 'rajesh@techcorp.com',
        phone: '+91-9876543220',
        company: 'TechCorp Solutions',
        address: {
          street: '123 Business Park',
          city: 'Mumbai',
          state: 'Maharashtra',
          zipCode: '400001',
          country: 'India'
        },
        industry: 'Technology',
        website: 'https://techcorp.com',
        gstNumber: '27ABCDE1234F1Z5',
        contactPerson: {
          name: 'Rajesh Kumar',
          designation: 'CTO',
          phone: '+91-9876543220',
          email: 'rajesh@techcorp.com'
        },
        status: 'active',
        source: 'referral',
        assignedTo: users[1]._id
      },
      {
        name: 'Priya Sharma',
        email: 'priya@innovate.com',
        phone: '+91-9876543221',
        company: 'Innovate Digital',
        address: {
          street: '456 Tech Hub',
          city: 'Bangalore',
          state: 'Karnataka',
          zipCode: '560001',
          country: 'India'
        },
        industry: 'Digital Marketing',
        website: 'https://innovatedigital.com',
        contactPerson: {
          name: 'Priya Sharma',
          designation: 'Marketing Head',
          phone: '+91-9876543221',
          email: 'priya@innovate.com'
        },
        status: 'active',
        source: 'website',
        assignedTo: users[1]._id
      },
      {
        name: 'Amit Patel',
        email: 'amit@startup.com',
        phone: '+91-9876543222',
        company: 'StartupXYZ',
        address: {
          street: '789 Innovation Center',
          city: 'Pune',
          state: 'Maharashtra',
          zipCode: '411001',
          country: 'India'
        },
        industry: 'E-commerce',
        website: 'https://startupxyz.com',
        contactPerson: {
          name: 'Amit Patel',
          designation: 'Founder',
          phone: '+91-9876543222',
          email: 'amit@startup.com'
        },
        status: 'prospect',
        source: 'social_media',
        assignedTo: users[2]._id
      }
    ]);

    console.log('🏢 Created clients');

    // Create projects
    const projects = await Project.create([
      {
        name: 'E-commerce Website Development',
        description: 'Complete e-commerce solution with payment gateway integration',
        client: clients[0]._id,
        projectManager: users[1]._id,
        teamMembers: [
          { user: users[2]._id, role: 'developer' },
          { user: users[3]._id, role: 'designer' }
        ],
        status: 'in_progress',
        priority: 'high',
        startDate: new Date('2024-01-15'),
        endDate: new Date('2024-04-15'),
        budget: {
          estimated: 500000,
          actual: 250000
        },
        technology: ['React', 'Node.js', 'MongoDB', 'Stripe'],
        progress: 65,
        milestones: [
          {
            name: 'UI/UX Design',
            description: 'Complete website design and user experience',
            dueDate: new Date('2024-02-15'),
            status: 'completed',
            completedAt: new Date('2024-02-10')
          },
          {
            name: 'Frontend Development',
            description: 'React frontend implementation',
            dueDate: new Date('2024-03-15'),
            status: 'in_progress'
          },
          {
            name: 'Backend API',
            description: 'REST API development',
            dueDate: new Date('2024-03-30'),
            status: 'pending'
          }
        ]
      },
      {
        name: 'Mobile App Development',
        description: 'Cross-platform mobile application for client management',
        client: clients[1]._id,
        projectManager: users[1]._id,
        teamMembers: [
          { user: users[2]._id, role: 'developer' }
        ],
        status: 'planning',
        priority: 'medium',
        startDate: new Date('2024-03-01'),
        endDate: new Date('2024-07-01'),
        budget: {
          estimated: 300000,
          actual: 0
        },
        technology: ['React Native', 'Firebase'],
        progress: 15,
        milestones: [
          {
            name: 'Requirements Analysis',
            description: 'Gather and analyze requirements',
            dueDate: new Date('2024-03-15'),
            status: 'in_progress'
          }
        ]
      },
      {
        name: 'Website Redesign',
        description: 'Complete website redesign with modern UI/UX',
        client: clients[2]._id,
        projectManager: users[1]._id,
        teamMembers: [
          { user: users[3]._id, role: 'designer' }
        ],
        status: 'completed',
        priority: 'low',
        startDate: new Date('2023-11-01'),
        endDate: new Date('2024-01-01'),
        actualEndDate: new Date('2023-12-28'),
        budget: {
          estimated: 150000,
          actual: 145000
        },
        technology: ['HTML', 'CSS', 'JavaScript', 'WordPress'],
        progress: 100,
        milestones: [
          {
            name: 'Design Mockups',
            description: 'Create design mockups and prototypes',
            dueDate: new Date('2023-11-15'),
            status: 'completed',
            completedAt: new Date('2023-11-12')
          },
          {
            name: 'Development',
            description: 'Implement the new design',
            dueDate: new Date('2023-12-15'),
            status: 'completed',
            completedAt: new Date('2023-12-20')
          },
          {
            name: 'Testing & Launch',
            description: 'Test and deploy the website',
            dueDate: new Date('2024-01-01'),
            status: 'completed',
            completedAt: new Date('2023-12-28')
          }
        ]
      }
    ]);

    console.log('📋 Created projects');

    console.log('\n🎉 Seed data created successfully!');
    console.log('\n📧 Login credentials:');
    console.log('Super Admin: admin@crm.com / admin123');
    console.log('Manager: manager@crm.com / manager123');
    console.log('Developer: alice@crm.com / alice123');
    console.log('Designer: bob@crm.com / bob123');
    console.log('Support: sarah@crm.com / sarah123');
    console.log('Accounts: mike@crm.com / mike123');
    console.log('\n🔐 OTP for all users: 123456');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
};

seedData();