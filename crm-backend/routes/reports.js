import express from 'express';
import { authenticate } from '../middleware/auth.js';
import Client from '../models/Client.js';
import Project from '../models/Project.js';
import Attendance from '../models/Attendance.js';
import Invoice from '../models/Invoice.js';
import Ticket from '../models/Ticket.js';
import Leave from '../models/Leave.js';

const router = express.Router();

function dateRange(from, to) {
  const start = from ? new Date(from) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const end   = to   ? new Date(to)   : new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

// ── SALES — list = ALL clients, summary = date-filtered counts ────────────────
router.get('/sales', authenticate, async (req, res) => {
  try {
    const { from, to } = req.query;
    const { start, end } = dateRange(from, to);

    const [newClients, totalClients, activeClients, prospects] = await Promise.all([
      Client.countDocuments({ createdAt: { $gte: start, $lte: end } }),
      Client.countDocuments(),
      Client.countDocuments({ status: 'active' }),
      Client.countDocuments({ status: 'prospect' }),
    ]);

    // Show ALL clients sorted newest first — no date filter on list
    const list = await Client.find({})
      .select('name company email phone status source createdAt')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: {
        summary: { newClients, totalClients, activeClients, prospects },
        list,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── FINANCE — list = ALL invoices, summary = date-filtered ───────────────────
router.get('/finance', authenticate, async (req, res) => {
  try {
    const { from, to } = req.query;
    const { start, end } = dateRange(from, to);

    // Summary from date range
    const rangeInvoices = await Invoice.find({ createdAt: { $gte: start, $lte: end } })
      .select('total paidAmount remainingAmount status').lean();

    const totalRevenue   = rangeInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.total || 0), 0);
    const totalCollected = rangeInvoices.reduce((s, i) => s + (i.paidAmount || 0), 0);
    const totalPending   = rangeInvoices.reduce((s, i) => s + (i.remainingAmount || 0), 0);
    const paidInvoices   = rangeInvoices.filter(i => i.status === 'paid').length;
    const pendingInvoices = rangeInvoices.filter(i => ['sent', 'draft', 'partial'].includes(i.status)).length;
    const overdueInvoices = rangeInvoices.filter(i => i.status === 'overdue').length;

    // List = ALL invoices
    const list = await Invoice.find({})
      .select('invoiceNumber clientName total paidAmount remainingAmount status dueDate createdAt')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: {
        summary: { totalRevenue, totalCollected, totalPending, paidInvoices, pendingInvoices, overdueInvoices },
        list,
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── ATTENDANCE — list = date-filtered (makes sense for attendance) ────────────
router.get('/attendance', authenticate, async (req, res) => {
  try {
    const { from, to } = req.query;
    const { start, end } = dateRange(from, to);

    const [total, present, absent, late, halfDay] = await Promise.all([
      Attendance.countDocuments({ date: { $gte: start, $lte: end } }),
      Attendance.countDocuments({ date: { $gte: start, $lte: end }, status: 'present' }),
      Attendance.countDocuments({ date: { $gte: start, $lte: end }, status: 'absent' }),
      Attendance.countDocuments({ date: { $gte: start, $lte: end }, status: 'late' }),
      Attendance.countDocuments({ date: { $gte: start, $lte: end }, status: 'half_day' }),
    ]);

    const list = await Attendance.find({ date: { $gte: start, $lte: end } })
      .populate('employee', 'name email')
      .sort({ date: -1 })
      .limit(500)
      .lean();

    res.json({
      success: true,
      data: {
        summary: {
          totalRecords: total, present, absent, late, halfDay,
          attendanceRate: total > 0 ? Math.round((present / total) * 100) : 0,
        },
        list,
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── LEAVE ─────────────────────────────────────────────────────────────────────
router.get('/leave', authenticate, async (req, res) => {
  try {
    const { from, to } = req.query;
    const { start, end } = dateRange(from, to);

    const inRange = await Leave.find({ createdAt: { $gte: start, $lte: end } }).sort({ createdAt: -1 }).lean();
    const displayList = inRange.length > 0 ? inRange : await Leave.find({}).sort({ createdAt: -1 }).lean();

    const approved = displayList.filter(l => l.status === 'approved').length;
    const pending  = displayList.filter(l => l.status === 'pending').length;
    const rejected = displayList.filter(l => l.status === 'rejected').length;

    res.json({
      success: true,
      data: {
        summary: { totalApplications: displayList.length, approved, pending, rejected },
        list: displayList,
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── PROJECTS — list = ALL projects ────────────────────────────────────────────
router.get('/projects', authenticate, async (req, res) => {
  try {
    const [total, active, completed, onHold, planning, cancelled] = await Promise.all([
      Project.countDocuments(),
      Project.countDocuments({ status: 'in_progress' }),
      Project.countDocuments({ status: 'completed' }),
      Project.countDocuments({ status: 'on_hold' }),
      Project.countDocuments({ status: 'planning' }),
      Project.countDocuments({ status: 'cancelled' }),
    ]);

    const list = await Project.find({})
      .populate('client', 'name company')
      .select('name status priority startDate endDate progress budget createdAt')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: {
        summary: { total, active, completed, onHold, planning, cancelled },
        list,
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── SUPPORT ───────────────────────────────────────────────────────────────────
router.get('/support', authenticate, async (req, res) => {
  try {
    const list = await Ticket.find({}).sort({ createdAt: -1 }).lean();
    const open       = list.filter(t => t.status === 'open').length;
    const inProgress = list.filter(t => t.status === 'in_progress').length;
    const resolved   = list.filter(t => t.status === 'resolved').length;
    const closed     = list.filter(t => t.status === 'closed').length;

    res.json({
      success: true,
      data: {
        summary: { totalTickets: list.length, open, inProgress, resolved, closed },
        list,
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
