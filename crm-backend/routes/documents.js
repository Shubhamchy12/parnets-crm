import express from 'express';
import { authenticate } from '../middleware/auth.js';
import Document from '../models/Document.js';

const router = express.Router();

// GET /api/documents
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, type, search } = req.query;
    const query = {};

    if (!['super_admin', 'admin'].includes(req.user.role)) {
      query.$or = [
        { uploadedBy: req.user._id },
        { sharedWith: req.user._id },
      ];
    }

    if (type) query.type = type;
    if (search) query.$text = { $search: search };

    const total = await Document.countDocuments(query);
    const documents = await Document.find(query)
      .select('-data') // exclude base64 from list for performance
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({
      success: true,
      data: {
        documents,
        pagination: { current: +page, pages: Math.ceil(total / limit), total },
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/documents
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, type, mimeType, url, size, description, data } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Document name is required' });

    const doc = await Document.create({
      name,
      type: type || 'other',
      mimeType,
      url: url || '',
      data: data || '',
      size,
      description,
      uploadedBy: req.user._id,
      uploaderName: req.user.name,
    });

    res.status(201).json({ success: true, message: 'Document saved', data: { document: doc } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/documents/:id  (full doc with base64 data for preview)
router.get('/:id', authenticate, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });

    const isAdmin = ['super_admin', 'admin'].includes(req.user.role);
    const isOwner = doc.uploadedBy.toString() === req.user._id.toString();
    const isShared = doc.sharedWith.map(id => id.toString()).includes(req.user._id.toString());

    if (!isAdmin && !isOwner && !isShared) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.json({ success: true, data: { document: doc } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/documents/:id
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });

    if (
      doc.uploadedBy.toString() !== req.user._id.toString() &&
      !['super_admin', 'admin'].includes(req.user.role)
    ) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    await doc.deleteOne();
    res.json({ success: true, message: 'Document deleted' });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/documents/:id/share
router.post('/:id/share', authenticate, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });

    const { userIds = [] } = req.body;
    const existing = doc.sharedWith.map(id => id.toString());
    const merged = [...new Set([...existing, ...userIds])];
    doc.sharedWith = merged;
    await doc.save();

    res.json({ success: true, message: 'Document shared', data: { document: doc } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
