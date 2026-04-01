import express from 'express';
import Service from '../models/Service.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// GET /api/services — all authenticated users
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, isActive } = req.query;
    const filter = {};
    
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    } else {
      filter.isActive = true;
    }
    
    if (search) {
      const e = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { name: { $regex: e, $options: 'i' } },
        { description: { $regex: e, $options: 'i' } }
      ];
    }

    const total = await Service.countDocuments(filter);
    const services = await Service.find(filter)
      .sort({ name: 1 })
      .skip((+page - 1) * +limit)
      .limit(+limit)
      .select('_id name description defaultAmount isActive');

    res.json({ 
      success: true, 
      data: { 
        services, 
        pagination: { 
          current: +page, 
          pages: Math.ceil(total / limit), 
          total 
        } 
      } 
    });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/services — admin only
router.post('/', authenticate, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const { name, description, defaultAmount } = req.body;
    if (!name?.trim()) return res.status(400).json({ success: false, message: 'Service name is required' });
    const nameRegex = new RegExp(`^${name.trim()}$`, 'i');
    const exists = await Service.findOne({ name: nameRegex });
    if (exists) return res.status(400).json({ success: false, message: 'Service already exists' });
    const service = await Service.create({
      name: name.trim(),
      description: description?.trim(),
      defaultAmount: Number(defaultAmount) || 0,
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, message: 'Service created', data: { service } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/services/:id — admin only
router.put('/:id', authenticate, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const { name, description, defaultAmount } = req.body;
    if (!name?.trim()) return res.status(400).json({ success: false, message: 'Service name is required' });
    const nameRegex = new RegExp(`^${name.trim()}$`, 'i');
    const duplicate = await Service.findOne({ name: nameRegex, _id: { $ne: req.params.id } });
    if (duplicate) return res.status(400).json({ success: false, message: 'Service name already in use' });
    const service = await Service.findByIdAndUpdate(
      req.params.id,
      { name: name.trim(), description: description?.trim(), defaultAmount: Number(defaultAmount) || 0 },
      { new: true }
    );
    if (!service) return res.status(404).json({ success: false, message: 'Service not found' });
    res.json({ success: true, message: 'Service updated', data: { service } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/services/:id — admin only
router.delete('/:id', authenticate, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const service = await Service.findByIdAndDelete(req.params.id);
    if (!service) return res.status(404).json({ success: false, message: 'Service not found' });
    res.json({ success: true, message: 'Service deleted' });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
