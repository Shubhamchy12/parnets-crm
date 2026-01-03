import express from 'express';
import { body, validationResult } from 'express-validator';
import Project from '../models/Project.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { logActivity } from '../middleware/activity.js';

const router = express.Router();

// @route   GET /api/projects
// @desc    Get all projects
// @access  Private
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status, priority } = req.query;
    
    const query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (status) query.status = status;
    if (priority) query.priority = priority;

    // If user is not admin, only show projects they're involved in
    if (!['super_admin', 'admin'].includes(req.user.role)) {
      query.$or = [
        { projectManager: req.user._id },
        { 'teamMembers.user': req.user._id }
      ];
    }

    const projects = await Project.find(query)
      .populate('client', 'name company')
      .populate('projectManager', 'name email')
      .populate('teamMembers.user', 'name email')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await Project.countDocuments(query);

    res.json({
      success: true,
      data: {
        projects,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching projects'
    });
  }
});

// @route   POST /api/projects
// @desc    Create new project
// @access  Private
router.post('/', [
  authenticate,
  authorize('super_admin', 'admin', 'sub_admin'),
  body('name').trim().isLength({ min: 2 }),
  body('client').isMongoId(),
  body('projectManager').isMongoId(),
  body('startDate').isISO8601(),
  body('endDate').isISO8601()
], logActivity('Project creation', 'project', 'medium'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const project = new Project(req.body);
    await project.save();

    const populatedProject = await Project.findById(project._id)
      .populate('client', 'name company')
      .populate('projectManager', 'name email')
      .populate('teamMembers.user', 'name email');

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      data: { project: populatedProject }
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating project'
    });
  }
});

// @route   GET /api/projects/:id
// @desc    Get project by ID
// @access  Private
router.get('/:id', authenticate, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('client', 'name company email phone')
      .populate('projectManager', 'name email')
      .populate('teamMembers.user', 'name email role')
      .populate('documents.uploadedBy', 'name');
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check if user has access to this project
    const hasAccess = ['super_admin', 'admin'].includes(req.user.role) ||
                     project.projectManager._id.toString() === req.user._id.toString() ||
                     project.teamMembers.some(member => member.user._id.toString() === req.user._id.toString());

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: { project }
    });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching project'
    });
  }
});

// @route   PUT /api/projects/:id
// @desc    Update project
// @access  Private
router.put('/:id', [
  authenticate,
  body('name').optional().trim().isLength({ min: 2 }),
  body('startDate').optional().isISO8601(),
  body('endDate').optional().isISO8601()
], logActivity('Project update', 'project', 'medium'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check if user has permission to update
    const canUpdate = ['super_admin', 'admin'].includes(req.user.role) ||
                     project.projectManager.toString() === req.user._id.toString();

    if (!canUpdate) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const updatedProject = await Project.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('client', 'name company')
     .populate('projectManager', 'name email')
     .populate('teamMembers.user', 'name email');

    res.json({
      success: true,
      message: 'Project updated successfully',
      data: { project: updatedProject }
    });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating project'
    });
  }
});

// @route   DELETE /api/projects/:id
// @desc    Delete project
// @access  Private (Admin only)
router.delete('/:id', authenticate, authorize('super_admin', 'admin'), logActivity('Project deletion', 'project', 'high'), async (req, res) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    res.json({
      success: true,
      message: 'Project deleted successfully'
    });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting project'
    });
  }
});

// @route   POST /api/projects/:id/team
// @desc    Add team member to project
// @access  Private
router.post('/:id/team', [
  authenticate,
  body('user').isMongoId(),
  body('role').isIn(['developer', 'designer', 'tester', 'analyst', 'other'])
], logActivity('Team member added to project', 'project', 'medium'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check if user has permission
    const canUpdate = ['super_admin', 'admin'].includes(req.user.role) ||
                     project.projectManager.toString() === req.user._id.toString();

    if (!canUpdate) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Check if user is already in team
    const existingMember = project.teamMembers.find(
      member => member.user.toString() === req.body.user
    );

    if (existingMember) {
      return res.status(400).json({
        success: false,
        message: 'User is already a team member'
      });
    }

    project.teamMembers.push({
      user: req.body.user,
      role: req.body.role
    });

    await project.save();

    const updatedProject = await Project.findById(req.params.id)
      .populate('teamMembers.user', 'name email');

    res.json({
      success: true,
      message: 'Team member added successfully',
      data: { project: updatedProject }
    });
  } catch (error) {
    console.error('Add team member error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding team member'
    });
  }
});

export default router;