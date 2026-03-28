import express from 'express';
import Lead from '../models/Lead.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { logActivity } from '../middleware/activity.js';

const router = express.Router();

// GET /api/leads
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 50, search, stage, source } = req.query;
    const filter = {};

    if (!['super_admin', 'admin'].includes(req.user.role)) {
      filter.$or = [{ assignedTo: req.user._id }, { createdBy: req.user._id }];
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    if (stage) filter.stage = stage;
    if (source) filter.source = source;

    const total = await Lead.countDocuments(filter);
    const leads = await Lead.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(+limit)
      .populate('assignedTo', 'name')
      .populate('createdBy', 'name');

    res.json({ success: true, data: { leads, pagination: { current: +page, pages: Math.ceil(total / limit), total } } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/leads
router.post('/', authenticate, logActivity('Lead created', 'lead', 'medium'), async (req, res) => {
  try {
    const { name, email, phone, company, source, value, stage = 'new' } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name is required' });

    const lead = await Lead.create({
      name, email, phone, company, source, value, stage,
      createdBy: req.user._id,
      assignedTo: req.body.assignedTo || req.user._id,
    });

    res.status(201).json({ success: true, message: 'Lead created', data: { lead } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/leads/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name');
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
    res.json({ success: true, data: { lead } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/leads/:id
router.put('/:id', authenticate, logActivity('Lead updated', 'lead', 'medium'), async (req, res) => {
  try {
    const lead = await Lead.findByIdAndUpdate(req.params.id, { ...req.body }, { new: true, runValidators: true });
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
    res.json({ success: true, message: 'Lead updated', data: { lead } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/leads/:id
router.delete('/:id', authenticate, logActivity('Lead deleted', 'lead', 'high'), async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

    const isAdmin = ['super_admin', 'admin'].includes(req.user.role);
    if (!isAdmin && lead.createdBy?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }

    await lead.deleteOne();
    res.json({ success: true, message: 'Lead deleted' });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/leads/:id/activities
router.post('/:id/activities', authenticate, async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
    const activity = {
      type: req.body.type || 'note',
      note: req.body.note,
      by: { _id: req.user._id, name: req.user.name },
      createdAt: new Date(),
    };
    lead.activities.push(activity);
    await lead.save();
    res.json({ success: true, data: { activity } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/leads/:id/stage
router.put('/:id/stage', authenticate, async (req, res) => {
  try {
    const lead = await Lead.findByIdAndUpdate(req.params.id, { stage: req.body.stage }, { new: true });
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
    res.json({ success: true, message: 'Stage updated', data: { lead } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
