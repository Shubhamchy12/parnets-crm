import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import Procurement from '../models/Procurement.js';
import Vendor from '../models/Vendor.js';

const router = express.Router();
const ADMIN = ['super_admin', 'admin'];

// GET /api/procurement
router.get('/', authenticate, authorize(...ADMIN), async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const total = await Procurement.countDocuments(filter);
    const procurements = await Procurement.find(filter)
      .populate('vendor', 'name email phone')
      .populate('project', 'name')
      .populate('requestedBy', 'name')
      .populate('approvedBy', 'name')
      .sort({ createdAt: -1 })
      .skip((+page - 1) * +limit)
      .limit(+limit)
      .lean();

    res.json({ success: true, data: { procurements, pagination: { current: +page, pages: Math.ceil(total / limit), total } } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/procurement
router.post('/', authenticate, authorize(...ADMIN), async (req, res) => {
  try {
    const { title, vendor, items, totalAmount, requiredBy, notes, project } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Title required' });

    // Resolve vendor name for denormalization
    let vendorName = '';
    if (vendor) {
      const v = await Vendor.findById(vendor).select('name').lean();
      vendorName = v?.name || '';
    }

    const procurement = await Procurement.create({
      title,
      vendor: vendor || undefined,
      vendorName,
      items: items || [],
      totalAmount: parseFloat(totalAmount) || 0,
      requiredBy: requiredBy ? new Date(requiredBy) : undefined,
      notes,
      project: project || undefined,
      requestedBy: req.user._id,
    });

    res.status(201).json({ success: true, message: 'Procurement request created', data: { procurement } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/procurement/:id
router.put('/:id', authenticate, authorize(...ADMIN), async (req, res) => {
  try {
    if (req.body.status === 'approved') req.body.approvedBy = req.user._id;
    const procurement = await Procurement.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('vendor', 'name').populate('project', 'name');
    if (!procurement) return res.status(404).json({ success: false, message: 'Procurement not found' });
    res.json({ success: true, data: { procurement } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/procurement/:id
router.delete('/:id', authenticate, authorize(...ADMIN), async (req, res) => {
  try {
    const procurement = await Procurement.findByIdAndDelete(req.params.id);
    if (!procurement) return res.status(404).json({ success: false, message: 'Procurement not found' });
    res.json({ success: true, message: 'Procurement deleted' });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
