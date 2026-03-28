import express from 'express';
import Contract from '../models/Contract.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { logActivity } from '../middleware/activity.js';

const router = express.Router();

// GET /api/contracts
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, client } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (client) filter.$or = [
      { client: client },
      { clientName: { $regex: client, $options: 'i' } },
    ];

    const total = await Contract.countDocuments(filter);
    const contracts = await Contract.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(+limit)
      .populate('client', 'name')
      .populate('createdBy', 'name');

    res.json({ success: true, data: { contracts, pagination: { current: +page, pages: Math.ceil(total / limit), total } } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/contracts
router.post('/', authenticate, logActivity('Contract created', 'contract', 'medium'), async (req, res) => {
  try {
    const { title, client, clientName, startDate, endDate, value, terms, description } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Title is required' });

    const contract = await Contract.create({
      title, client, clientName, startDate, endDate, value, terms, description,
      status: 'draft',
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, message: 'Contract created', data: { contract } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/contracts/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id)
      .populate('client', 'name email')
      .populate('createdBy', 'name');
    if (!contract) return res.status(404).json({ success: false, message: 'Contract not found' });
    res.json({ success: true, data: { contract } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/contracts/:id
router.put('/:id', authenticate, authorize('super_admin', 'admin', 'sub_admin'), logActivity('Contract updated', 'contract', 'medium'), async (req, res) => {
  try {
    const contract = await Contract.findByIdAndUpdate(req.params.id, { ...req.body }, { new: true, runValidators: true });
    if (!contract) return res.status(404).json({ success: false, message: 'Contract not found' });
    res.json({ success: true, message: 'Contract updated', data: { contract } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/contracts/:id
router.delete('/:id', authenticate, authorize('super_admin', 'admin'), logActivity('Contract deleted', 'contract', 'high'), async (req, res) => {
  try {
    const contract = await Contract.findByIdAndDelete(req.params.id);
    if (!contract) return res.status(404).json({ success: false, message: 'Contract not found' });
    res.json({ success: true, message: 'Contract deleted' });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/contracts/:id/send
router.post('/:id/send', authenticate, authorize('super_admin', 'admin', 'sub_admin'), async (req, res) => {
  try {
    const contract = await Contract.findByIdAndUpdate(
      req.params.id,
      { status: 'sent', sentAt: new Date() },
      { new: true }
    );
    if (!contract) return res.status(404).json({ success: false, message: 'Contract not found' });
    res.json({ success: true, message: 'Contract sent', data: { contract } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
