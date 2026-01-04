import express from 'express';
import User from '../models/User.js';
import { authenticate, authorize } from '../middleware/auth.js';
import crypto from 'crypto';

const router = express.Router();

/**
 * Employee Routes
 * 
 * These routes handle employee management operations.
 * IMPORTANT: Admin users (super_admin, admin) are excluded from employee operations.
 * Admin users are managed through separate admin management interfaces.
 * 
 * Employee roles include: sub_admin, manager, team_lead, developer, designer, 
 * tester, qa_engineer, business_analyst, etc.
 */

// @route   GET /api/employees
// @desc    Get all employees (excludes admin users)
// @access  Private
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10, search, department, role } = req.query;
    
    const query = {
      // Exclude admin roles - only show actual employees
      role: { $nin: ['super_admin', 'admin'] }
    };
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } },
        { designation: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (department) query.department = department;
    if (role && !['super_admin', 'admin'].includes(role)) {
      query.role = role; // Only allow non-admin roles to be filtered
    }

    const employees = await User.find(query)
      .select('-password')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    // Get department and role statistics (excluding admin roles)
    const departments = await User.distinct('department', { role: { $nin: ['super_admin', 'admin'] } });
    const roles = await User.distinct('role', { role: { $nin: ['super_admin', 'admin'] } });

    res.json({
      success: true,
      data: {
        employees,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        },
        filters: {
          departments: departments.filter(d => d),
          roles
        }
      }
    });
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching employees'
    });
  }
});

// @route   GET /api/employees/stats
// @desc    Get employee statistics (excludes admin users)
// @access  Private (Admin only)
router.get('/stats', authenticate, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    // Only count actual employees, not admin users
    const employeeQuery = { role: { $nin: ['super_admin', 'admin'] } };
    
    const totalEmployees = await User.countDocuments(employeeQuery);
    const activeEmployees = await User.countDocuments({ ...employeeQuery, isActive: true });
    
    const employeesByDepartment = await User.aggregate([
      { $match: employeeQuery },
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const employeesByRole = await User.aggregate([
      { $match: employeeQuery },
      { $group: { _id: '$role', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const recentJoinees = await User.find(employeeQuery)
      .select('name email department joiningDate')
      .sort({ joiningDate: -1 })
      .limit(5);

    const salaryStats = await User.aggregate([
      { $match: { ...employeeQuery, salary: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: null,
          avgSalary: { $avg: '$salary' },
          minSalary: { $min: '$salary' },
          maxSalary: { $max: '$salary' },
          totalSalary: { $sum: '$salary' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        totalEmployees,
        activeEmployees,
        inactiveEmployees: totalEmployees - activeEmployees,
        employeesByDepartment,
        employeesByRole,
        recentJoinees,
        salaryStats: salaryStats[0] || {
          avgSalary: 0,
          minSalary: 0,
          maxSalary: 0,
          totalSalary: 0
        }
      }
    });
  } catch (error) {
    console.error('Get employee stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching employee statistics'
    });
  }
});

// @route   GET /api/employees/:id
// @desc    Get employee by ID (excludes admin users)
// @access  Private
router.get('/:id', authenticate, async (req, res) => {
  try {
    // Only allow access to actual employees, not admin users
    const employee = await User.findOne({ 
      _id: req.params.id, 
      role: { $nin: ['super_admin', 'admin'] } 
    }).select('-password');
    
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Users can only view their own profile unless they're admin
    if (req.user._id.toString() !== req.params.id && !['super_admin', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: { employee }
    });
  } catch (error) {
    console.error('Get employee error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching employee'
    });
  }
});

// @route   POST /api/employees
// @desc    Create new employee (Admin only)
// @access  Private (Admin only)
router.post('/', authenticate, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      role,
      department,
      designation,
      salary,
      address,
      joiningDate,
      documents
    } = req.body;

    // Validation
    if (!name || !email || !role || !department) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, role, and department are required'
      });
    }

    // Prevent creation of admin roles through employee endpoint
    if (['super_admin', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot create admin users through employee endpoint. Use admin management instead.'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Generate temporary password
    const tempPassword = crypto.randomBytes(8).toString('hex');

    // Create employee user
    const employee = new User({
      name: name.trim(),
      email: email.toLowerCase(),
      password: tempPassword,
      role,
      department,
      designation,
      phone,
      salary: typeof salary === 'object' ? salary.total : salary,
      address,
      joiningDate: joiningDate || new Date(),
      status: 'active',
      createdBy: req.user._id,
      profile: {
        department,
        designation,
        joiningDate: joiningDate || new Date(),
        salary,
        address,
        documents
      }
    });

    // Set default permissions based on role
    employee.setDefaultPermissions();

    await employee.save();

    // Send welcome email with temporary password (if email service is configured)
    try {
      // Import the email service
      const enhancedOtpService = (await import('../services/enhancedOtpService.js')).default;
      const emailResult = await enhancedOtpService.sendWelcomeEmail(
        employee.email,
        employee.name,
        tempPassword,
        employee.role
      );

      if (!emailResult.success) {
        console.error('Failed to send welcome email:', emailResult.error);
      }
    } catch (emailError) {
      console.error('Email service error:', emailError);
    }

    // Remove password from response
    const employeeResponse = employee.toObject();
    delete employeeResponse.password;

    res.status(201).json({
      success: true,
      message: 'Employee created successfully. Welcome email sent with temporary password.',
      data: { employee: employeeResponse }
    });

  } catch (error) {
    console.error('Create employee error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating employee'
    });
  }
});

// @route   PUT /api/employees/:id
// @desc    Update employee (Admin only)
// @access  Private (Admin only)
router.put('/:id', authenticate, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      role,
      department,
      designation,
      salary,
      address,
      status
    } = req.body;

    // Find employee (exclude admin users)
    const employee = await User.findOne({ 
      _id: req.params.id, 
      role: { $nin: ['super_admin', 'admin'] } 
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Prevent changing to admin roles
    if (role && ['super_admin', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot change employee to admin role through this endpoint'
      });
    }

    // Update fields
    if (name) employee.name = name.trim();
    if (email) {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email format'
        });
      }
      
      // Check if email is already taken by another user
      const existingUser = await User.findOne({ 
        email: email.toLowerCase(),
        _id: { $ne: req.params.id }
      });
      
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email is already taken by another user'
        });
      }
      
      employee.email = email.toLowerCase();
    }
    
    if (phone) employee.phone = phone;
    if (role) employee.role = role;
    if (department) employee.department = department;
    if (designation) employee.designation = designation;
    if (salary) employee.salary = typeof salary === 'object' ? salary.total : salary;
    if (address) employee.address = address;
    if (status) employee.status = status;

    // Update profile
    employee.profile = {
      ...employee.profile,
      department: department || employee.department,
      designation: designation || employee.designation,
      salary: salary || employee.profile?.salary,
      address: address || employee.address
    };

    // Update permissions if role changed
    if (role) {
      employee.setDefaultPermissions();
    }

    await employee.save();

    // Remove password from response
    const employeeResponse = employee.toObject();
    delete employeeResponse.password;

    res.json({
      success: true,
      message: 'Employee updated successfully',
      data: { employee: employeeResponse }
    });

  } catch (error) {
    console.error('Update employee error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating employee'
    });
  }
});

// @route   DELETE /api/employees/:id
// @desc    Delete employee (Admin only)
// @access  Private (Admin only)
router.delete('/:id', authenticate, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    // Find employee (exclude admin users)
    const employee = await User.findOne({ 
      _id: req.params.id, 
      role: { $nin: ['super_admin', 'admin'] } 
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Soft delete - just deactivate the user
    employee.status = 'inactive';
    employee.isActive = false;
    await employee.save();

    res.json({
      success: true,
      message: 'Employee deactivated successfully'
    });

  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting employee'
    });
  }
});

export default router;