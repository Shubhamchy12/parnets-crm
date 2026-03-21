import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { logActivity } from '../middleware/activity.js';

const router = express.Router();

let contracts = [];
let contractIdCounter = 1;

// GET /api/contracts
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, client } = req.query;
    let result = [...contracts];
    if (status) result = result.filter(c => c.status === status);
    if (client) result = result.filter(c => c.client === client || c.clientName?.toLowerCase().includes(client.toLowerCase()));
    const total = result.length;
    const paginated = result.slice((page - 1) * limit, page * limit);
    res.json({ success: true, data: { contracts: paginated, pagination: { current: +page, pages: Math.ceil(total / limit), total } } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/contracts
router.post('/', authenticate, authorize('super_admin', 'admin', 'sub_admin'), logActivity('Contract created', 'contract', 'medium'), async (req, res) => {
  try {
    const { title, client, clientName, startDate, endDate, value, terms, description } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Title is required' });

    const contract = {
      _id: String(contractIdCounter++),
      title, client, clientName, startDate, endDate, value, terms, description,
      status: 'draft',
      createdBy: req.user._id.toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    contracts.push(contract);
    res.status(201).json({ success: true, message: 'Contract created', data: { contract } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/contracts/:id
router.get('/:id', authenticate, async (req, res) => {
  const contract = contracts.find(c => c._id === req.params.id);
  if (!contract) return res.status(404).json({ success: false, message: 'Contract not found' });
  res.json({ success: true, data: { contract } });
});

// PUT /api/contracts/:id
router.put('/:id', authenticate, authorize('super_admin', 'admin', 'sub_admin'), logActivity('Contract updated', 'contract', 'medium'), async (req, res) => {
  const idx = contracts.findIndex(c => c._id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Contract not found' });
  contracts[idx] = { ...contracts[idx], ...req.body, _id: contracts[idx]._id, updatedAt: new Date().toISOString() };
  res.json({ success: true, message: 'Contract updated', data: { contract: contracts[idx] } });
});

// DELETE /api/contracts/:id
router.delete('/:id', authenticate, authorize('super_admin', 'admin'), logActivity('Contract deleted', 'contract', 'high'), async (req, res) => {
  const idx = contracts.findIndex(c => c._id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Contract not found' });
  contracts.splice(idx, 1);
  res.json({ success: true, message: 'Contract deleted' });
});

// POST /api/contracts/:id/send
router.post('/:id/send', authenticate, authorize('super_admin', 'admin', 'sub_admin'), async (req, res) => {
  const contract = contracts.find(c => c._id === req.params.id);
  if (!contract) return res.status(404).json({ success: false, message: 'Contract not found' });
  contract.status = 'sent';
  contract.sentAt = new Date().toISOString();
  res.json({ success: true, message: 'Contract sent', data: { contract } });
});

export default router;
