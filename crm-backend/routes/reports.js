import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import User from '../models/User.js';
import Client from '../models/Client.js';
import Project from '../models/Project.js';
import Attendance from '../models/Attendance.js';

const router = express.Router();

const adminRoles = ['super_admin', 'admin', 'manager', 'accounts_manager'];

function dateRange(from, to) {
  const start = from ? new Date(from) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const end = to ? new Date(to) : new Date();
  return { start, end };
}

// GET /api/reports/sales
router.get('/sales', authenticate, authorize(...adminRoles), async (req, res) => {
  try {
    const { from, to } = req.query;
    const { start, end } = dateRange(from, to);

    const clients = await Client.countDocuments({ createdAt: { $gte: start, $lte: end } });
    const totalClients = await Client.countDocuments();
    const activeClients = await Client.countDocuments({ status: 'active' });

    // Monthly client acquisition
    const monthly = await Client.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    const chartData = monthly.map(m => ({
      label: `${m._id.year}-${String(m._id.month).padStart(2, '0')}`,
      value: m.count,
    }));

    res.json({
      success: true,
      data: {
        summary: { newClients: clients, totalClients, activeClients, conversionRate: totalClients > 0 ? Math.round((activeClients / totalClients) * 100) : 0 },
        chartData,
      }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/reports/finance
router.get('/finance', authenticate, authorize(...adminRoles), async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        summary: { totalRevenue: 0, pendingInvoices: 0, paidInvoices: 0, overdueInvoices: 0 },
        chartData: [],
      }
    });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/reports/attendance
router.get('/attendance', authenticate, authorize(...adminRoles), async (req, res) => {
  try {
    const { from, to } = req.query;
    const { start, end } = dateRange(from, to);

    const total = await Attendance.countDocuments({ date: { $gte: start, $lte: end } });
    const present = await Attendance.countDocuments({ date: { $gte: start, $lte: end }, status: 'present' });
    const absent = await Attendance.countDocuments({ date: { $gte: start, $lte: end }, status: 'absent' });
    const late = await Attendance.countDocuments({ date: { $gte: start, $lte: end }, status: 'late' });

    const monthly = await Attendance.aggregate([
      { $match: { date: { $gte: start, $lte: end } } },
      { $group: { _id: { year: { $year: '$date' }, month: { $month: '$date' } }, count: { $sum: 1 }, present: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    const chartData = monthly.map(m => ({
      label: `${m._id.year}-${String(m._id.month).padStart(2, '0')}`,
      value: m.present,
    }));

    res.json({
      success: true,
      data: {
        summary: { totalRecords: total, present, absent, late, attendanceRate: total > 0 ? Math.round((present / total) * 100) : 0 },
        chartData,
      }
    });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/reports/leave
router.get('/leave', authenticate, authorize(...adminRoles), async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        summary: { totalApplications: 0, approved: 0, pending: 0, rejected: 0 },
        chartData: [],
      }
    });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/reports/projects
router.get('/projects', authenticate, authorize(...adminRoles), async (req, res) => {
  try {
    const { from, to } = req.query;
    const { start, end } = dateRange(from, to);

    const total = await Project.countDocuments();
    const active = await Project.countDocuments({ status: 'in_progress' });
    const completed = await Project.countDocuments({ status: 'completed' });
    const onHold = await Project.countDocuments({ status: 'on_hold' });

    const byStatus = await Project.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const chartData = byStatus.map(s => ({ label: s._id, value: s.count }));

    res.json({
      success: true,
      data: {
        summary: { total, active, completed, onHold },
        chartData,
      }
    });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/reports/support
router.get('/support', authenticate, authorize(...adminRoles), async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        summary: { totalTickets: 0, open: 0, resolved: 0, avgResolutionTime: 0 },
        chartData: [],
      }
    });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
