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
    const { projectId, employeeId, status, page = 1, limit = 20 } = req.query;
    const query = {};

    // Default to active only if explicitly passed; if not passed, show all statuses for employee
    if (status) query.status = status;
    else query.status = 'active'; // default active

    if (projectId) query.project = projectId;
    if (employeeId && ADMIN.includes(req.user.role)) query.employee = employeeId;

    // Non-admin: always filter to own assignments only
    if (!ADMIN.includes(req.user.role)) {
      query.employee = req.user._id;
    }

    const total = await ProjectAssignment.countDocuments(query);
    const assignments = await ProjectAssignment.find(query)
      .populate({ path: 'project', select: 'name status startDate endDate client priority', populate: { path: 'client', select: 'name company' } })
      .populate({ path: 'employee', select: 'name email department designation' })
      .populate({ path: 'assignedBy', select: 'name' })
      .sort({ createdAt: -1 })
      .skip((+page - 1) * +limit)
      .limit(+limit);

    res.json({ 
      success: true, 
      data: { 
        assignments, 
        pagination: { 
          current: +page, 
          pages: Math.ceil(total / limit), 
          total 
        } 
      } 
    });
  } catch (e) {
    console.error('Get assignments error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/assignments — assign employee to project
router.post('/', authenticate, authorize(...ADMIN), async (req, res) => {
  try {
    const { projectId, employeeId, note, assignedDate, workPlan } = req.body;
    console.log('Assignment request body:', JSON.stringify(req.body, null, 2));
    console.log('WorkPlan received:', workPlan);
    
    if (!projectId || !employeeId) return res.status(400).json({ success: false, message: 'projectId and employeeId required' });

    const project = await Project.findById(projectId).populate('client', 'name');
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const employee = await User.findById(employeeId).select('name email');
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

    // Allow same employee to be assigned to same project multiple times (different work plans)
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
      ...(assignedDate ? { assignedDate: new Date(assignedDate) } : {}),
      ...(workPlan ? { workPlan } : {}),
    });
    
    console.log('Assignment created:', assignment);

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
      .populate({ path: 'employee', select: 'name email department designation' })
      .populate({ path: 'assignedBy', select: 'name' });

    res.status(201).json({ success: true, message: 'Employee assigned successfully', data: { assignment: populated } });
  } catch (e) {
    console.error('Assign error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PATCH /api/assignments/:id/workplan — update workPlan (status, date, remark) — employee or admin
router.patch('/:id/workplan', authenticate, async (req, res) => {
  try {
    const { status, taskDescription, remark, date } = req.body;
    const assignment = await ProjectAssignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });

    // Employee can only update their own
    if (!ADMIN.includes(req.user.role) && assignment.employee.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const wp = assignment.workPlan ? { ...assignment.workPlan.toObject() } : {};
    if (status)                        wp.status          = status;
    if (taskDescription !== undefined && taskDescription !== '') wp.taskDescription = taskDescription;
    if (remark !== undefined && remark !== '')  wp.remark = remark;

    // Add developer feedback entry if date + remark provided
    if (date && remark && remark.trim()) {
      if (!wp.developerFeedback) wp.developerFeedback = [];
      wp.developerFeedback.push({ date: new Date(date), text: remark.trim() });
    }

    assignment.workPlan = wp;
    await assignment.save();

    const populated = await ProjectAssignment.findById(assignment._id)
      .populate({ path: 'project', select: 'name status endDate client priority', populate: { path: 'client', select: 'name company' } })
      .populate({ path: 'employee', select: 'name email department designation' })
      .populate({ path: 'assignedBy', select: 'name' });

    res.json({ success: true, message: 'Work plan updated', data: { assignment: populated } });
  } catch (e) {
    console.error('Update workplan error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PATCH /api/assignments/:id/daywise/:planId — update specific day-wise plan (employee only)
router.patch('/:id/daywise/:planId', authenticate, async (req, res) => {
  try {
    const { status, developerRemark } = req.body;
    const assignment = await ProjectAssignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });

    // Employee can only update their own
    if (!ADMIN.includes(req.user.role) && assignment.employee.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (!assignment.workPlan || !assignment.workPlan.dayWisePlans) {
      return res.status(404).json({ success: false, message: 'No day-wise plans found' });
    }

    const plan = assignment.workPlan.dayWisePlans.id(req.params.planId);
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });

    if (status) plan.status = status;
    if (developerRemark !== undefined) plan.developerRemark = developerRemark;
    plan.updatedAt = new Date();

    await assignment.save();

    const populated = await ProjectAssignment.findById(assignment._id)
      .populate({ path: 'project', select: 'name status endDate client priority', populate: { path: 'client', select: 'name company' } })
      .populate({ path: 'employee', select: 'name email department designation' })
      .populate({ path: 'assignedBy', select: 'name' });

    res.json({ success: true, message: 'Day-wise plan updated', data: { assignment: populated } });
  } catch (e) {
    console.error('Update daywise plan error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/assignments/:id/daywise — add new day-wise plan (employee can add their own tasks)
router.post('/:id/daywise', authenticate, async (req, res) => {
  try {
    const { taskDescription, dateFrom, dateTo, status, developerRemark } = req.body;
    const assignment = await ProjectAssignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });

    // Employee can only add to their own assignments
    if (!ADMIN.includes(req.user.role) && assignment.employee.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (!taskDescription || !dateFrom) {
      return res.status(400).json({ success: false, message: 'taskDescription and dateFrom are required' });
    }

    // Initialize workPlan if it doesn't exist
    if (!assignment.workPlan) {
      assignment.workPlan = { dayWisePlans: [] };
    }
    if (!assignment.workPlan.dayWisePlans) {
      assignment.workPlan.dayWisePlans = [];
    }

    // Add new plan
    assignment.workPlan.dayWisePlans.push({
      taskDescription,
      dateFrom: new Date(dateFrom),
      dateTo: dateTo ? new Date(dateTo) : new Date(dateFrom),
      status: status || 'pending',
      developerRemark: developerRemark || '',
      updatedAt: new Date()
    });

    await assignment.save();

    const populated = await ProjectAssignment.findById(assignment._id)
      .populate({ path: 'project', select: 'name status endDate client priority', populate: { path: 'client', select: 'name company' } })
      .populate({ path: 'employee', select: 'name email department designation' })
      .populate({ path: 'assignedBy', select: 'name' });

    res.json({ success: true, message: 'Task added successfully', data: { assignment: populated } });
  } catch (e) {
    console.error('Add daywise plan error:', e);
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

// GET /api/assignments/:id — single assignment with full workPlan
router.get('/:id', authenticate, async (req, res) => {
  try {
    const assignment = await ProjectAssignment.findById(req.params.id)
      .populate({ path: 'project', select: 'name status endDate startDate client priority', populate: { path: 'client', select: 'name company' } })
      .populate({ path: 'employee', select: 'name email department designation' })
      .populate({ path: 'assignedBy', select: 'name' });
    if (!assignment) return res.status(404).json({ success: false, message: 'Not found' });
    if (!ADMIN.includes(req.user.role) && assignment.employee._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    res.json({ success: true, data: { assignment } });
  } catch (e) {
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

export default router;
