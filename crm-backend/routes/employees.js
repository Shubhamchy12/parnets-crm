import express from 'express';
import User from '../models/User.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/employees
// @desc    Get all employees (alias for users)
// @access  Private
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10, search, department, role } = req.query;
    
    const query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } },
        { designation: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (department) query.department = department;
    if (role) query.role = role;

    const employees = await User.find(query)
      .select('-password')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    // Get department and role statistics
    const departments = await User.distinct('department');
    const roles = await User.distinct('role');

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
// @desc    Get employee statistics
// @access  Private (Admin only)
router.get('/stats', authenticate, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const totalEmployees = await User.countDocuments();
    const activeEmployees = await User.countDocuments({ isActive: true });
    
    const employeesByDepartment = await User.aggregate([
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const employeesByRole = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const recentJoinees = await User.find()
      .select('name email department joiningDate')
      .sort({ joiningDate: -1 })
      .limit(5);

    const salaryStats = await User.aggregate([
      { $match: { salary: { $exists: true, $ne: null } } },
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
// @desc    Get employee by ID
// @access  Private
router.get('/:id', authenticate, async (req, res) => {
  try {
    const employee = await User.findById(req.params.id).select('-password');
    
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

export default router;