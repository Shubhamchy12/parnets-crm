import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

let amcContracts = [];
let amcIdCounter = 1;

// GET /api/amc
router.get('/', authenticate, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    let result = [...amcContracts];
    if (status) result = result.filter(a => a.status === status);
    const total = result.length;
    const paginated = result.slice((page - 1) * limit, page * limit);
    res.json({ success: true, data: { contracts: paginated, pagination: { current: +page, pages: Math.ceil(total / limit), total } } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/amc
router.post('/', authenticate, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const { client, clientName, description, startDate, endDate, value, renewalDate, notes } = req.body;
    if (!client && !clientName) return res.status(400).json({ success: false, message: 'Client is required' });
    const amc = {
      _id: String(amcIdCounter++),
      client, clientName, description, startDate, endDate, value: parseFloat(value) || 0,
      renewalDate, notes, status: 'active',
      createdBy: req.user._id.toString(),
      createdAt: new Date().toISOString(),
    };
    amcContracts.push(amc);
    res.status(201).json({ success: true, message: 'AMC contract created', data: { contract: amc } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/amc/:id
router.put('/:id', authenticate, authorize('super_admin', 'admin'), async (req, res) => {
  const idx = amcContracts.findIndex(a => a._id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'AMC contract not found' });
  amcContracts[idx] = { ...amcContracts[idx], ...req.body, _id: amcContracts[idx]._id };
  res.json({ success: true, data: { contract: amcContracts[idx] } });
});

// DELETE /api/amc/:id
router.delete('/:id', authenticate, authorize('super_admin', 'admin'), async (req, res) => {
  const idx = amcContracts.findIndex(a => a._id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'AMC contract not found' });
  amcContracts.splice(idx, 1);
  res.json({ success: true, message: 'AMC contract deleted' });
});

export default router;
