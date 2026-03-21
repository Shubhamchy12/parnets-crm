import express from 'express';
import Activity from '../models/Activity.js';
import { authenticate, authorize } from '../middleware/auth.js';
import mongoose from 'mongoose';

const router = express.Router();

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id) && /^[a-f\d]{24}$/i.test(String(id));
}

// GET /api/activities
router.get('/', authenticate, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const { page = 1, limit = 20, entity, severity } = req.query;
    const query = {};
    if (entity) query.entity = entity;
    if (severity) query.severity = severity;
    const activities = await Activity.find(query).populate({ path: 'user', select: 'name email role', options: { strictPopulate: false } }).sort({ createdAt: -1 }).limit(limit * 1).skip((page - 1) * limit);
    const total = await Activity.countDocuments(query);
    res.json({ success: true, data: { activities, pagination: { current: +page, pages: Math.ceil(total / limit), total } } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/activities/stats
router.get('/stats', authenticate, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const totalActivities = await Activity.countDocuments();
    const byEntity = await Activity.aggregate([{ $group: { _id: '$entity', count: { $sum: 1 } } }, { $sort: { count: -1 } }]);
    const bySeverity = await Activity.aggregate([{ $group: { _id: '$severity', count: { $sum: 1 } } }]);
    const recentActivities = await Activity.find().populate({ path: 'user', select: 'name email', options: { strictPopulate: false } }).sort({ createdAt: -1 }).limit(10);
    res.json({ success: true, data: { totalActivities, activitiesByEntity: byEntity, activitiesBySeverity: bySeverity, recentActivities, topUsers: [] } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/activities/my
router.get('/my', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user._id;
    if (!isValidObjectId(userId)) {
      return res.json({ success: true, data: { activities: [], pagination: { current: 1, pages: 0, total: 0 } } });
    }
    const query = { user: userId };
    const activities = await Activity.find(query).sort({ createdAt: -1 }).limit(limit * 1).skip((page - 1) * limit);
    const total = await Activity.countDocuments(query);
    res.json({ success: true, data: { activities, pagination: { current: +page, pages: Math.ceil(total / limit), total } } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
