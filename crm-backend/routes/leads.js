import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { logActivity } from '../middleware/activity.js';

const router = express.Router();

let leads = [];
let leadIdCounter = 1;

// GET /api/leads
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 50, search, stage, source } = req.query;
    let result = [...leads];

    if (!['super_admin', 'admin'].includes(req.user.role)) {
      result = result.filter(l => l.assignedTo === req.user._id.toString() || l.createdBy === req.user._id.toString());
    }

    if (search) {
      const s = search.toLowerCase();
      result = result.filter(l => l.name?.toLowerCase().includes(s) || l.company?.toLowerCase().includes(s) || l.email?.toLowerCase().includes(s));
    }
    if (stage) result = result.filter(l => l.stage === stage);
    if (source) result = result.filter(l => l.source === source);

    const total = result.length;
    const paginated = result.slice((page - 1) * limit, page * limit);

    res.json({ success: true, data: { leads: paginated, pagination: { current: +page, pages: Math.ceil(total / limit), total } } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/leads
router.post('/', authenticate, logActivity('Lead created', 'lead', 'medium'), async (req, res) => {
  try {
    const { name, email, phone, company, source, value, stage = 'new' } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name is required' });

    const lead = {
      _id: String(leadIdCounter++),
      name, email, phone, company, source, value, stage,
      activities: [],
      createdBy: req.user._id.toString(),
      assignedTo: req.body.assignedTo || req.user._id.toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    leads.push(lead);
    res.status(201).json({ success: true, message: 'Lead created', data: { lead } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/leads/:id
router.get('/:id', authenticate, async (req, res) => {
  const lead = leads.find(l => l._id === req.params.id);
  if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
  res.json({ success: true, data: { lead } });
});

// PUT /api/leads/:id
router.put('/:id', authenticate, logActivity('Lead updated', 'lead', 'medium'), async (req, res) => {
  const idx = leads.findIndex(l => l._id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Lead not found' });
  leads[idx] = { ...leads[idx], ...req.body, _id: leads[idx]._id, updatedAt: new Date().toISOString() };
  res.json({ success: true, message: 'Lead updated', data: { lead: leads[idx] } });
});

// DELETE /api/leads/:id
router.delete('/:id', authenticate, logActivity('Lead deleted', 'lead', 'high'), async (req, res) => {
  const idx = leads.findIndex(l => l._id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Lead not found' });
  // Only allow owner or admin to delete
  const lead = leads[idx];
  const isAdmin = ['super_admin', 'admin'].includes(req.user.role);
  if (!isAdmin && lead.createdBy !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: 'Insufficient permissions' });
  }
  leads.splice(idx, 1);
  res.json({ success: true, message: 'Lead deleted' });
});

// POST /api/leads/:id/activities
router.post('/:id/activities', authenticate, async (req, res) => {
  const lead = leads.find(l => l._id === req.params.id);
  if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
  const activity = {
    _id: String(Date.now()),
    type: req.body.type || 'note',
    note: req.body.note,
    by: { _id: req.user._id, name: req.user.name },
    createdAt: new Date().toISOString(),
  };
  lead.activities.push(activity);
  res.json({ success: true, data: { activity } });
});

// PUT /api/leads/:id/stage
router.put('/:id/stage', authenticate, async (req, res) => {
  const lead = leads.find(l => l._id === req.params.id);
  if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
  lead.stage = req.body.stage;
  lead.updatedAt = new Date().toISOString();
  res.json({ success: true, message: 'Stage updated', data: { lead } });
});

export default router;
