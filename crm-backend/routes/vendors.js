import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import Vendor from '../models/Vendor.js';

const router = express.Router();
const ADMIN = ['super_admin', 'admin'];

// GET /api/vendors
router.get('/', authenticate, authorize(...ADMIN), async (req, res) => {
  try {
    const vendors = await Vendor.find().sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: { vendors } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/vendors
router.post('/', authenticate, authorize(...ADMIN), async (req, res) => {
  try {
    const { name, email, phone, address, category } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Vendor name required' });
    const vendor = await Vendor.create({ name, email, phone, address, category, createdBy: req.user._id });
    res.status(201).json({ success: true, message: 'Vendor created', data: { vendor } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/vendors/:id
router.put('/:id', authenticate, authorize(...ADMIN), async (req, res) => {
  try {
    const vendor = await Vendor.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });
    res.json({ success: true, data: { vendor } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/vendors/:id
router.delete('/:id', authenticate, authorize(...ADMIN), async (req, res) => {
  try {
    const vendor = await Vendor.findByIdAndDelete(req.params.id);
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });
    res.json({ success: true, message: 'Vendor deleted' });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
