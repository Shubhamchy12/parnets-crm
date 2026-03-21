import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

let payments = [];
let paymentIdCounter = 1;

// GET /api/payments
router.get('/', authenticate, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const { page = 1, limit = 20, status, client } = req.query;
    let result = [...payments];
    if (status) result = result.filter(p => p.status === status);
    if (client) result = result.filter(p => p.client === client || p.clientName?.toLowerCase().includes(client.toLowerCase()));
    const total = result.length;
    const paginated = result.slice((page - 1) * limit, page * limit);
    res.json({ success: true, data: { payments: paginated, pagination: { current: +page, pages: Math.ceil(total / limit), total } } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/payments
router.post('/', authenticate, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const { client, clientName, project, amount, method, date, reference, notes } = req.body;
    if (!amount) return res.status(400).json({ success: false, message: 'Amount is required' });
    const payment = {
      _id: String(paymentIdCounter++),
      client, clientName, project, amount: parseFloat(amount), method: method || 'bank_transfer',
      date: date || new Date().toISOString(), reference, notes,
      status: 'completed',
      recordedBy: req.user._id.toString(),
      createdAt: new Date().toISOString(),
    };
    payments.push(payment);
    res.status(201).json({ success: true, message: 'Payment recorded', data: { payment } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/payments/:id
router.get('/:id', authenticate, authorize('super_admin', 'admin'), async (req, res) => {
  const payment = payments.find(p => p._id === req.params.id);
  if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
  res.json({ success: true, data: { payment } });
});

// DELETE /api/payments/:id
router.delete('/:id', authenticate, authorize('super_admin', 'admin'), async (req, res) => {
  const idx = payments.findIndex(p => p._id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Payment not found' });
  payments.splice(idx, 1);
  res.json({ success: true, message: 'Payment deleted' });
});

export default router;
