import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

let amcContracts = [];
let amcIdCounter = 1;

// GET /api/amc
router.get('/', authenticate, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    let result = [...amcContracts];
    if (status) result = result.filter(a => a.status === status);
    const total = result.length;
    const paginated = result.slice((page - 1) * limit, page * limit);
    res.json({ success: true, data: { contracts: paginated, pagination: { current: +page, pages: Math.ceil(total / limit), total } } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/amc
router.post('/', authenticate, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const { 
      contractNumber, 
      clientName, 
      projectName, 
      projectId,
      serviceType,
      startDate, 
      endDate, 
      renewalDate,
      amount,
      paymentFrequency,
      status,
      description,
      services,
      contactPerson,
      contactEmail,
      contactPhone
    } = req.body;
    
    if (!contractNumber) return res.status(400).json({ success: false, message: 'Contract number is required' });
    if (!clientName) return res.status(400).json({ success: false, message: 'Client name is required' });
    if (!startDate) return res.status(400).json({ success: false, message: 'Start date is required' });
    if (!endDate) return res.status(400).json({ success: false, message: 'End date is required' });
    
    const amc = {
      _id: String(amcIdCounter++),
      contractNumber,
      clientName,
      projectName: projectName || '',
      projectId: projectId || null,
      serviceType: serviceType || 'website_maintenance',
      startDate,
      endDate,
      renewalDate: renewalDate || endDate,
      amount: parseFloat(amount) || 0,
      paymentFrequency: paymentFrequency || 'monthly',
      status: status || 'active',
      description: description || '',
      services: services || [],
      contactPerson: contactPerson || '',
      contactEmail: contactEmail || '',
      contactPhone: contactPhone || '',
      createdBy: req.user._id.toString(),
      createdAt: new Date().toISOString(),
    };
    
    amcContracts.push(amc);
    res.status(201).json({ success: true, message: 'AMC contract created', data: { contract: amc } });
  } catch (e) {
    console.error('AMC creation error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/amc/:id
router.put('/:id', authenticate, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const idx = amcContracts.findIndex(a => a._id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, message: 'AMC contract not found' });
    
    // Preserve _id and createdAt, update everything else
    const updatedContract = {
      ...amcContracts[idx],
      ...req.body,
      _id: amcContracts[idx]._id,
      createdAt: amcContracts[idx].createdAt,
      updatedAt: new Date().toISOString()
    };
    
    amcContracts[idx] = updatedContract;
    res.json({ success: true, message: 'AMC contract updated', data: { contract: updatedContract } });
  } catch (e) {
    console.error('AMC update error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/amc/:id
router.delete('/:id', authenticate, authorize('super_admin', 'admin'), async (req, res) => {
  const idx = amcContracts.findIndex(a => a._id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'AMC contract not found' });
  amcContracts.splice(idx, 1);
  res.json({ success: true, message: 'AMC contract deleted' });
});

export default router;
