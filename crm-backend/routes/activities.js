import express from 'express';
import Activity from '../models/Activity.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/activities
// @desc    Get activity logs
// @access  Private (Super Admin only)
router.get('/', authenticate, authorize('super_admin'), async (req, res) => {
  try {
    const { page = 1, limit = 20, user, entity, severity, startDate, endDate } = req.query;
    
    const query = {};
    
    if (user) query.user = user;
    if (entity) query.entity = entity;
    if (severity) query.severity = severity;
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const activities = await Activity.find(query)
      .populate('user', 'name email role')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await Activity.countDocuments(query);

    res.json({
      success: true,
      data: {
        activities,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Get activities error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching activities'
    });
  }
});

// @route   GET /api/activities/stats
// @desc    Get activity statistics
// @access  Private (Super Admin only)
router.get('/stats', authenticate, authorize('super_admin'), async (req, res) => {
  try {
    const totalActivities = await Activity.countDocuments();
    
    const activitiesByEntity = await Activity.aggregate([
      { $group: { _id: '$entity', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const activitiesBySeverity = await Activity.aggregate([
      { $group: { _id: '$severity', count: { $sum: 1 } } }
    ]);

    const recentActivities = await Activity.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(10);

    const topUsers = await Activity.aggregate([
      { $group: { _id: '$user', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          count: 1,
          'user.name': 1,
          'user.email': 1,
          'user.role': 1
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        totalActivities,
        activitiesByEntity,
        activitiesBySeverity,
        recentActivities,
        topUsers
      }
    });
  } catch (error) {
    console.error('Get activity stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching activity statistics'
    });
  }
});

// @route   GET /api/activities/my
// @desc    Get current user's activities
// @access  Private
router.get('/my', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, entity, startDate, endDate } = req.query;
    
    const query = { user: req.user._id };
    
    if (entity) query.entity = entity;
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const activities = await Activity.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await Activity.countDocuments(query);

    res.json({
      success: true,
      data: {
        activities,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Get my activities error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching your activities'
    });
  }
});

export default router;