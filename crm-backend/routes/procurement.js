import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import Procurement from '../models/Procurement.js';
import Client from '../models/Client.js';

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
      .populate({ path: 'client', select: 'name company', options: { strictPopulate: false } })
      .populate({ path: 'project', select: 'name', options: { strictPopulate: false } })
      .populate({ path: 'requestedBy', select: 'name', options: { strictPopulate: false } })
      .sort({ createdAt: -1 })
      .skip((+page - 1) * +limit)
      .limit(+limit)
      .lean();

    res.json({ success: true, data: { procurements, pagination: { current: +page, pages: Math.ceil(total / limit), total } } });
  } catch (e) {
    console.error('Get procurement error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/procurement
router.post('/', authenticate, authorize(...ADMIN), async (req, res) => {
  try {
    const {
      title, poNumber, clientId, clientName,
      category, description, quantity, unitPrice, totalAmount,
      status, orderDate, expectedDelivery, notes, project,
    } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({ success: false, message: 'Title (service description) is required' });
    }

    // Resolve clientName from DB if not provided
    let resolvedClientName = clientName || '';
    if (!resolvedClientName && clientId) {
      const c = await Client.findById(clientId).select('name company').lean();
      resolvedClientName = c?.company || c?.name || '';
    }

    const procurement = await Procurement.create({
      title: title.trim(),
      poNumber: poNumber || undefined,
      client: clientId || undefined,
      clientName: resolvedClientName,
      category: category || undefined,
      description: description || notes || undefined,
      quantity: Number(quantity) || 1,
      unitPrice: parseFloat(unitPrice) || 0,
      totalAmount: parseFloat(totalAmount) || 0,
      status: status || 'pending',
      orderDate: orderDate ? new Date(orderDate) : undefined,
      expectedDelivery: expectedDelivery ? new Date(expectedDelivery) : undefined,
      requiredBy: expectedDelivery ? new Date(expectedDelivery) : undefined,
      notes: notes || description || undefined,
      project: project || undefined,
      requestedBy: req.user._id,
    });

    res.status(201).json({ success: true, message: 'Purchase order created', data: { procurement } });
  } catch (e) {
    console.error('Create procurement error:', e);
    res.status(500).json({ success: false, message: e.message || 'Server error' });
  }
});

// PUT /api/procurement/:id
router.put('/:id', authenticate, authorize(...ADMIN), async (req, res) => {
  try {
    const updates = { ...req.body };
    if (updates.status === 'approved') updates.approvedBy = req.user._id;
    if (updates.clientId) { updates.client = updates.clientId; delete updates.clientId; }
    if (updates.orderDate) updates.orderDate = new Date(updates.orderDate);
    if (updates.expectedDelivery) updates.expectedDelivery = new Date(updates.expectedDelivery);

    const procurement = await Procurement.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true })
      .populate({ path: 'client', select: 'name company', options: { strictPopulate: false } });
    if (!procurement) return res.status(404).json({ success: false, message: 'Procurement not found' });
    res.json({ success: true, data: { procurement } });
  } catch (e) {
    console.error('Update procurement error:', e);
    res.status(500).json({ success: false, message: e.message || 'Server error' });
  }
});

// DELETE /api/procurement/:id
router.delete('/:id', authenticate, authorize(...ADMIN), async (req, res) => {
  try {
    const procurement = await Procurement.findByIdAndDelete(req.params.id);
    if (!procurement) return res.status(404).json({ success: false, message: 'Procurement not found' });
    res.json({ success: true, message: 'Purchase order deleted' });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
