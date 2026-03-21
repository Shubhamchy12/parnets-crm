import express from 'express';
import Department from '../models/Department.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// GET /api/departments — all authenticated users (needed for employee registration dropdown)
router.get('/', authenticate, async (req, res) => {
  try {
    const departments = await Department.find().sort({ name: 1 }).select('_id name description');
    res.json({ success: true, data: { departments } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/departments — admin only
router.post('/', authenticate, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name?.trim()) return res.status(400).json({ success: false, message: 'Department name is required' });
    const exists = await Department.findOne({ name: { $regex: `^${name.trim()}$`, $options: 'i' } });
    if (exists) return res.status(400).json({ success: false, message: 'Department already exists' });
    const dept = await Department.create({ name: name.trim(), description: description?.trim(), createdBy: req.user._id });
    res.status(201).json({ success: true, message: 'Department created', data: { department: dept } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/departments/:id — admin only
router.put('/:id', authenticate, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name?.trim()) return res.status(400).json({ success: false, message: 'Department name is required' });
    const duplicate = await Department.findOne({ name: { $regex: `^${name.trim()}$`, $options: 'i' }, _id: { $ne: req.params.id } });
    if (duplicate) return res.status(400).json({ success: false, message: 'Department name already in use' });
    const dept = await Department.findByIdAndUpdate(
      req.params.id,
      { name: name.trim(), description: description?.trim() },
      { new: true }
    );
    if (!dept) return res.status(404).json({ success: false, message: 'Department not found' });
    res.json({ success: true, message: 'Department updated', data: { department: dept } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/departments/:id — admin only
router.delete('/:id', authenticate, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const dept = await Department.findByIdAndDelete(req.params.id);
    if (!dept) return res.status(404).json({ success: false, message: 'Department not found' });
    res.json({ success: true, message: 'Department deleted' });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
