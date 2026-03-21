import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { logActivity } from '../middleware/activity.js';

const router = express.Router();

let tickets = [];
let ticketCounter = 1000;

function nextTicketNumber() {
  return `TKT-${++ticketCounter}`;
}

// GET /api/tickets
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, priority } = req.query;
    let result = [...tickets];

    // Non-admins only see their own tickets
    if (!['super_admin', 'admin', 'support_executive'].includes(req.user.role)) {
      result = result.filter(t => t.raisedBy === req.user._id.toString());
    }

    if (status) result = result.filter(t => t.status === status);
    if (priority) result = result.filter(t => t.priority === priority);

    const total = result.length;
    const paginated = result.slice((page - 1) * limit, page * limit);

    res.json({ success: true, data: { tickets: paginated, pagination: { current: +page, pages: Math.ceil(total / limit), total } } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/tickets
router.post('/', authenticate, logActivity('Ticket created', 'ticket', 'medium'), async (req, res) => {
  try {
    const { subject, description, priority = 'medium', category } = req.body;
    if (!subject || !description) {
      return res.status(400).json({ success: false, message: 'Subject and description are required' });
    }
    const ticket = {
      _id: String(ticketCounter + 1),
      ticketNumber: nextTicketNumber(),
      subject, description, priority, category,
      status: 'open',
      replies: [],
      raisedBy: req.user._id.toString(),
      raisedByName: req.user.name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    tickets.push(ticket);
    res.status(201).json({ success: true, message: 'Ticket created', data: { ticket } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/tickets/:id
router.get('/:id', authenticate, async (req, res) => {
  const ticket = tickets.find(t => t._id === req.params.id);
  if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
  res.json({ success: true, data: { ticket } });
});

// PUT /api/tickets/:id
router.put('/:id', authenticate, logActivity('Ticket updated', 'ticket', 'medium'), async (req, res) => {
  const idx = tickets.findIndex(t => t._id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Ticket not found' });
  tickets[idx] = { ...tickets[idx], ...req.body, _id: tickets[idx]._id, updatedAt: new Date().toISOString() };
  res.json({ success: true, message: 'Ticket updated', data: { ticket: tickets[idx] } });
});

// DELETE /api/tickets/:id
router.delete('/:id', authenticate, authorize('super_admin', 'admin'), async (req, res) => {
  const idx = tickets.findIndex(t => t._id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Ticket not found' });
  tickets.splice(idx, 1);
  res.json({ success: true, message: 'Ticket deleted' });
});

// POST /api/tickets/:id/replies
router.post('/:id/replies', authenticate, async (req, res) => {
  const ticket = tickets.find(t => t._id === req.params.id);
  if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
  const reply = {
    _id: String(Date.now()),
    message: req.body.message,
    author: { _id: req.user._id, name: req.user.name, role: req.user.role },
    createdAt: new Date().toISOString(),
  };
  ticket.replies.push(reply);
  ticket.updatedAt = new Date().toISOString();
  // Auto-set to in_progress when support replies
  if (['super_admin', 'admin', 'support_executive'].includes(req.user.role) && ticket.status === 'open') {
    ticket.status = 'in_progress';
  }
  res.json({ success: true, data: { reply } });
});

export default router;
