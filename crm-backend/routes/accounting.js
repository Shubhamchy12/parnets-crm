import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import Transaction from '../models/Transaction.js';

const router = express.Router();
const ADMIN = ['super_admin', 'admin'];

// GET /api/accounting/transactions
router.get('/transactions', authenticate, authorize(...ADMIN), async (req, res) => {
  try {
    const { page = 1, limit = 20, type, category } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (category) filter.category = category;

    const total = await Transaction.countDocuments(filter);
    const transactions = await Transaction.find(filter)
      .populate('invoice', 'invoiceNumber')
      .populate('project', 'name')
      .populate('recordedBy', 'name')
      .sort({ date: -1 })
      .skip((+page - 1) * +limit)
      .limit(+limit)
      .lean();

    const all = await Transaction.find(filter).lean();
    const totalIncome = all.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
    const totalExpense = all.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);

    res.json({
      success: true,
      data: {
        transactions,
        summary: { totalIncome, totalExpense, balance: totalIncome - totalExpense },
        pagination: { current: +page, pages: Math.ceil(total / limit), total },
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/accounting/transactions
router.post('/transactions', authenticate, authorize(...ADMIN), async (req, res) => {
  try {
    const { type, category, amount, description, date, reference, invoice, project } = req.body;
    if (!type || !amount) return res.status(400).json({ success: false, message: 'type and amount required' });

    const tx = await Transaction.create({
      type, category, amount: parseFloat(amount), description, reference,
      date: date ? new Date(date) : new Date(),
      invoice: invoice || undefined,
      project: project || undefined,
      recordedBy: req.user._id,
    });

    res.status(201).json({ success: true, message: 'Transaction recorded', data: { transaction: tx } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/accounting/transactions/:id
router.delete('/transactions/:id', authenticate, authorize(...ADMIN), async (req, res) => {
  try {
    const tx = await Transaction.findByIdAndDelete(req.params.id);
    if (!tx) return res.status(404).json({ success: false, message: 'Transaction not found' });
    res.json({ success: true, message: 'Transaction deleted' });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
