import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { logActivity } from '../middleware/activity.js';
import Ticket from '../models/Ticket.js';

const router = express.Router();

// GET /api/tickets
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, priority, all } = req.query;
    const isAdmin = ['super_admin', 'admin', 'support_executive', 'manager'].includes(req.user.role);

    const filter = {};
    if (!isAdmin && all !== 'true') filter.raisedBy = req.user._id;
    if (status)   filter.status   = status;
    if (priority) filter.priority = priority;

    const total   = await Ticket.countDocuments(filter);
    const tickets = await Ticket.find(filter)
      .populate('client', 'name company email')
      .sort({ createdAt: -1 })
      .skip((+page - 1) * +limit)
      .limit(+limit)
      .lean();

    res.json({ success: true, data: { tickets, pagination: { current: +page, pages: Math.ceil(total / limit), total } } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/tickets
router.post('/', authenticate, logActivity('Ticket created', 'ticket', 'medium'), async (req, res) => {
  try {
    const { subject, description, priority = 'medium', category, client, clientName } = req.body;
    if (!subject || !description)
      return res.status(400).json({ success: false, message: 'Subject and description are required' });

    const ticket = await Ticket.create({
      subject, description, priority, category,
      client, clientName,
      raisedBy: req.user._id,
      raisedByName: req.user.name,
    });
    res.status(201).json({ success: true, message: 'Ticket created', data: { ticket } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/tickets/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate('client', 'name company email phone')
      .lean();
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
    res.json({ success: true, data: { ticket } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/tickets/:id
router.put('/:id', authenticate, logActivity('Ticket updated', 'ticket', 'medium'), async (req, res) => {
  try {
    const ticket = await Ticket.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
    res.json({ success: true, message: 'Ticket updated', data: { ticket } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/tickets/:id
router.delete('/:id', authenticate, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const ticket = await Ticket.findByIdAndDelete(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
    res.json({ success: true, message: 'Ticket deleted' });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/tickets/:id/replies
router.post('/:id/replies', authenticate, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

    const reply = {
      message: req.body.message,
      author: { _id: req.user._id, name: req.user.name, role: req.user.role },
    };
    ticket.replies.push(reply);

    if (['super_admin', 'admin', 'support_executive'].includes(req.user.role) && ticket.status === 'open') {
      ticket.status = 'in_progress';
    }
    await ticket.save();
    res.json({ success: true, data: { reply: ticket.replies[ticket.replies.length - 1] } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
