import express from 'express';
import ProjectAssignment from '../models/ProjectAssignment.js';
import Project from '../models/Project.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { authenticate, authorize } from '../middleware/auth.js';
import Invoice from '../models/Invoice.js';

const router = express.Router();
const ADMIN = ['super_admin', 'admin', 'sub_admin', 'manager'];

// GET /api/assignments — list all (admin) or own (employee)
router.get('/', authenticate, async (req, res) => {
  try {
    const { projectId, employeeId, status = 'active' } = req.query;
    const query = {};
    if (status) query.status = status;
    if (projectId) query.project = projectId;
    if (employeeId) query.employee = employeeId;
    // Employees can only see their own
    if (!ADMIN.includes(req.user.role)) query.employee = req.user._id;

    const assignments = await ProjectAssignment.find(query)
      .populate({ path: 'project', select: 'name status endDate client priority', populate: { path: 'client', select: 'name company' } })
      .populate({ path: 'employee', select: 'name email department designation' })
      .populate({ path: 'assignedBy', select: 'name' })
      .sort({ createdAt: -1 });

    res.json({ success: true, data: { assignments } });
  } catch (e) {
    console.error('Get assignments error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/assignments — assign employee to project
router.post('/', authenticate, authorize(...ADMIN), async (req, res) => {
  try {
    const { projectId, employeeId, note } = req.body;
    if (!projectId || !employeeId) return res.status(400).json({ success: false, message: 'projectId and employeeId required' });

    const project = await Project.findById(projectId).populate('client', 'name');
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const employee = await User.findById(employeeId).select('name email');
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

    // Check if already assigned
    const existing = await ProjectAssignment.findOne({ project: projectId, employee: employeeId, status: 'active' });
    if (existing) return res.status(400).json({ success: false, message: 'Employee already assigned to this project' });

    // Check payment: at least one invoice for this project must be paid or partial
    const paidInvoice = await Invoice.findOne({ project: projectId, status: { $in: ['paid', 'partial'] } }).lean();
    if (!paidInvoice) {
      return res.status(402).json({
        success: false,
        message: 'Payment has not been received yet. Please ensure the invoice payment is approved before assigning the project.',
      });
    }

    const assignment = await ProjectAssignment.create({
      project: projectId,
      employee: employeeId,
      assignedBy: req.user._id,
      note,
    });

    // Update project status to in_progress if planning
    if (project.status === 'planning') {
      await Project.findByIdAndUpdate(projectId, { status: 'in_progress' });
    }

    // Add to project teamMembers if not already there
    const alreadyMember = project.teamMembers?.some(m => m.user?.toString() === employeeId);
    if (!alreadyMember) {
      await Project.findByIdAndUpdate(projectId, {
        $push: { teamMembers: { user: employeeId, role: 'developer', assignedAt: new Date() } }
      });
    }

    // Create in-app notification
    await Notification.create({
      recipient: employeeId,
      type: 'project_assigned',
      title: 'New Project Assignment',
      message: `You have been assigned to project "${project.name}"${project.endDate ? ` (Deadline: ${new Date(project.endDate).toLocaleDateString('en-IN')})` : ''}`,
      link: `/projects/${projectId}`,
      data: { projectId, projectName: project.name },
    });

    const populated = await ProjectAssignment.findById(assignment._id)
      .populate({ path: 'project', select: 'name status endDate', populate: { path: 'client', select: 'name' } })
      .populate({ path: 'employee', select: 'name email' })
      .populate({ path: 'assignedBy', select: 'name' });

    res.status(201).json({ success: true, message: 'Employee assigned successfully', data: { assignment: populated } });
  } catch (e) {
    console.error('Assign error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/assignments/:id — remove assignment
router.delete('/:id', authenticate, authorize(...ADMIN), async (req, res) => {
  try {
    const assignment = await ProjectAssignment.findByIdAndUpdate(req.params.id, { status: 'removed' }, { new: true });
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });
    res.json({ success: true, message: 'Assignment removed' });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/assignments/project/:projectId
router.get('/project/:projectId', authenticate, async (req, res) => {
  try {
    const assignments = await ProjectAssignment.find({ project: req.params.projectId, status: 'active' })
      .populate({ path: 'employee', select: 'name email department designation' })
      .populate({ path: 'assignedBy', select: 'name' });
    res.json({ success: true, data: { assignments } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
