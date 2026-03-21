import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// GET /api/users
router.get('/', authenticate, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const { search, role, status, page = 1, limit = 10 } = req.query;
    const query = {};
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [{ name: { $regex: escaped, $options: 'i' } }, { email: { $regex: escaped, $options: 'i' } }];
    }
    if (role) query.role = role;
    if (status) query.status = status;
    const users = await User.find(query).select('-password').sort({ createdAt: -1 }).limit(limit * 1).skip((page - 1) * limit);
    const total = await User.countDocuments(query);
    res.json({ success: true, data: { users, pagination: { current: +page, pages: Math.ceil(total / limit), total } } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/users/roles/available
router.get('/roles/available', authenticate, authorize('super_admin', 'admin'), (req, res) => {
  const roles = ['admin', 'employee', 'sales'];
  res.json({ success: true, data: { roles } });
});

// GET /api/users/stats/overview
router.get('/stats/overview', authenticate, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ status: 'active' });
    const roleStats = await User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]);
    res.json({ success: true, data: { totalUsers, activeUsers, recentUsers: 0, roleStats, statusStats: [] } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/users/:id
router.get('/:id', authenticate, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: { user } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/users
router.post('/', authenticate, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const { name, email, role, password } = req.body;
    if (!name || !email || !role) return res.status(400).json({ success: false, message: 'Name, email, role required' });
    if (await User.findOne({ email: email.toLowerCase() })) return res.status(400).json({ success: false, message: 'Email already exists' });
    const user = new User({ name, email: email.toLowerCase(), password: password || 'temp123', role, status: 'active', createdBy: req.user._id });
    await user.save();
    const safe = user.toObject(); delete safe.password;
    res.status(201).json({ success: true, message: 'User created', data: { user: safe } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/users/:id
router.put('/:id', authenticate, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const updates = { ...req.body };
    delete updates.password;
    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: { user } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/users/:id
router.delete('/:id', authenticate, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, message: 'User deleted' });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
