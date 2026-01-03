import express from 'express';
import { body, validationResult } from 'express-validator';
import Client from '../models/Client.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { logActivity } from '../middleware/activity.js';

const router = express.Router();

// @route   GET /api/clients
// @desc    Get all clients
// @access  Private
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status, industry } = req.query;
    
    const query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (status) query.status = status;
    if (industry) query.industry = industry;

    const clients = await Client.find(query)
      .populate('assignedTo', 'name email')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await Client.countDocuments(query);

    res.json({
      success: true,
      data: {
        clients,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Get clients error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching clients'
    });
  }
});

// @route   POST /api/clients
// @desc    Create new client
// @access  Private
router.post('/', [
  authenticate,
  authorize('super_admin', 'admin', 'sub_admin'),
  body('name').trim().isLength({ min: 2 }),
  body('email').isEmail().normalizeEmail(),
  body('phone').trim().isLength({ min: 10 }),
  body('company').trim().isLength({ min: 2 })
], logActivity('Client creation', 'client', 'medium'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const clientData = {
      ...req.body,
      assignedTo: req.body.assignedTo || req.user._id
    };

    const client = new Client(clientData);
    await client.save();

    const populatedClient = await Client.findById(client._id)
      .populate('assignedTo', 'name email');

    res.status(201).json({
      success: true,
      message: 'Client created successfully',
      data: { client: populatedClient }
    });
  } catch (error) {
    console.error('Create client error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating client'
    });
  }
});

// @route   GET /api/clients/:id
// @desc    Get client by ID
// @access  Private
router.get('/:id', authenticate, async (req, res) => {
  try {
    const client = await Client.findById(req.params.id)
      .populate('assignedTo', 'name email')
      .populate('notes.addedBy', 'name');
    
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    res.json({
      success: true,
      data: { client }
    });
  } catch (error) {
    console.error('Get client error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching client'
    });
  }
});

// @route   PUT /api/clients/:id
// @desc    Update client
// @access  Private
router.put('/:id', [
  authenticate,
  authorize('super_admin', 'admin', 'sub_admin'),
  body('name').optional().trim().isLength({ min: 2 }),
  body('email').optional().isEmail().normalizeEmail(),
  body('phone').optional().trim().isLength({ min: 10 }),
  body('company').optional().trim().isLength({ min: 2 })
], logActivity('Client update', 'client', 'medium'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const client = await Client.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('assignedTo', 'name email');
    
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    res.json({
      success: true,
      message: 'Client updated successfully',
      data: { client }
    });
  } catch (error) {
    console.error('Update client error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating client'
    });
  }
});

// @route   DELETE /api/clients/:id
// @desc    Delete client
// @access  Private (Admin only)
router.delete('/:id', authenticate, authorize('super_admin', 'admin'), logActivity('Client deletion', 'client', 'high'), async (req, res) => {
  try {
    const client = await Client.findByIdAndDelete(req.params.id);
    
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    res.json({
      success: true,
      message: 'Client deleted successfully'
    });
  } catch (error) {
    console.error('Delete client error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting client'
    });
  }
});

// @route   POST /api/clients/:id/notes
// @desc    Add note to client
// @access  Private
router.post('/:id/notes', [
  authenticate,
  body('content').trim().isLength({ min: 1 })
], logActivity('Client note added', 'client', 'low'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const client = await Client.findById(req.params.id);
    
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    client.notes.push({
      content: req.body.content,
      addedBy: req.user._id
    });

    await client.save();

    const updatedClient = await Client.findById(req.params.id)
      .populate('notes.addedBy', 'name');

    res.json({
      success: true,
      message: 'Note added successfully',
      data: { client: updatedClient }
    });
  } catch (error) {
    console.error('Add client note error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding note'
    });
  }
});

export default router;