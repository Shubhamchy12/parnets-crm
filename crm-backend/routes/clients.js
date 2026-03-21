import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Client from '../models/Client.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { logActivity } from '../middleware/activity.js';

const router = express.Router();

// ── Multer setup ──────────────────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'client-docs');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowed = /\.(jpeg|jpg|png|pdf|doc|docx)$/;
    allowed.test(ext) ? cb(null, true) : cb(new Error('Only images, PDFs and Word docs allowed'));
  },
});
const clientFields = upload.fields([
  { name: 'photo',      maxCount: 1 },
  { name: 'aadhaarDoc', maxCount: 1 },
  { name: 'panDoc',     maxCount: 1 },
  { name: 'gstDoc',     maxCount: 1 },
]);

function fileInfo(f) {
  return f ? { filename: f.filename, path: f.path, originalName: f.originalname } : undefined;
}

// GET /api/clients
router.get('/', authenticate, async (req, res) => {
  try {
    const { search, status, industry, page = 1, limit = 10 } = req.query;
    const query = {};
    if (search) {
      const e = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [{ name: { $regex: e, $options: 'i' } }, { company: { $regex: e, $options: 'i' } }, { email: { $regex: e, $options: 'i' } }];
    }
    if (status) query.status = status;
    if (industry) query.industry = industry;
    const clients = await Client.find(query).populate({ path: 'assignedTo', select: 'name email', options: { strictPopulate: false } }).sort({ createdAt: -1 }).limit(limit * 1).skip((page - 1) * limit);
    const total = await Client.countDocuments(query);
    res.json({ success: true, data: { clients, pagination: { current: +page, pages: Math.ceil(total / limit), total } } });
  } catch (e) {
    console.error('Get clients error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/clients/register — multipart/form-data with file uploads
router.post('/register', authenticate, authorize('super_admin', 'admin', 'sub_admin', 'manager', 'sales'),
  clientFields,
  logActivity('Client registration', 'client', 'medium'),
  async (req, res) => {
    try {
      const {
        name, email, phone, landline, company, industry, gstNumber, panNumber, website, source, status,
        street, city, state, zipCode, country,
        bankName, accountHolderName, accountNumber, ifscCode, branchName,
        contacts, notes,
      } = req.body;

      if (!name?.trim()) return res.status(400).json({ success: false, message: 'Client name is required' });
      if (!email?.trim()) return res.status(400).json({ success: false, message: 'Email is required' });
      if (!phone?.trim()) return res.status(400).json({ success: false, message: 'Phone is required' });

      const files = req.files || {};
      const client = new Client({
        name: name.trim(), email: email.trim().toLowerCase(),
        phone: phone.trim(), landline: landline?.trim(),
        company: company?.trim() || name.trim(),
        industry, gstNumber, panNumber, website, source, status,
        address: { street, city, state, zipCode, country: country || 'India' },
        bankDetails: { bankName, accountHolderName, accountNumber, ifscCode, branchName },
        photo:      fileInfo(files.photo?.[0]),
        aadhaarDoc: fileInfo(files.aadhaarDoc?.[0]),
        panDoc:     fileInfo(files.panDoc?.[0]),
        gstDoc:     fileInfo(files.gstDoc?.[0]),
        contacts: contacts ? (typeof contacts === 'string' ? JSON.parse(contacts) : contacts) : [],
        notes: notes ? [{ content: notes, addedBy: req.user._id }] : [],
        createdBy: req.user._id,
        assignedTo: req.user._id,
      });
      await client.save();
      const populated = await Client.findById(client._id)
        .populate({ path: 'assignedTo', select: 'name email', options: { strictPopulate: false } });
      res.status(201).json({ success: true, message: 'Client registered', data: { client: populated } });
    } catch (e) {
      console.error('Register client error:', e);
      res.status(500).json({ success: false, message: e.message || 'Server error' });
    }
  }
);

// GET /api/clients/docs/:filename — serve uploaded client files
router.get('/docs/:filename', authenticate, (req, res) => {
  const filePath = path.join(UPLOAD_DIR, req.params.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ success: false, message: 'File not found' });
  res.sendFile(filePath);
});

// POST /api/clients — JSON only (legacy)
router.post('/', authenticate, authorize('super_admin', 'admin', 'sub_admin', 'manager'), logActivity('Client creation', 'client', 'medium'), async (req, res) => {
  try {
    const client = new Client({ ...req.body, assignedTo: req.body.assignedTo || req.user._id });
    await client.save();
    const populated = await Client.findById(client._id).populate({ path: 'assignedTo', select: 'name email', options: { strictPopulate: false } });
    res.status(201).json({ success: true, message: 'Client created', data: { client: populated } });
  } catch (e) {
    console.error('Create client error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/clients/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const client = await Client.findById(req.params.id).populate({ path: 'assignedTo', select: 'name email', options: { strictPopulate: false } }).populate({ path: 'notes.addedBy', select: 'name', options: { strictPopulate: false } });
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });
    res.json({ success: true, data: { client } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/clients/:id
router.put('/:id', authenticate, authorize('super_admin', 'admin', 'sub_admin', 'manager'), logActivity('Client update', 'client', 'medium'), async (req, res) => {
  try {
    const client = await Client.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).populate({ path: 'assignedTo', select: 'name email', options: { strictPopulate: false } });
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });
    res.json({ success: true, message: 'Client updated', data: { client } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/clients/:id
router.delete('/:id', authenticate, authorize('super_admin', 'admin'), logActivity('Client deletion', 'client', 'high'), async (req, res) => {
  try {
    const client = await Client.findByIdAndDelete(req.params.id);
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });
    res.json({ success: true, message: 'Client deleted' });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/clients/:id/notes
router.post('/:id/notes', authenticate, async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });
    client.notes.push({ content: req.body.content, addedBy: req.user._id });
    await client.save();
    res.json({ success: true, message: 'Note added', data: { client } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/clients/:id/contacts
router.post('/:id/contacts', authenticate, authorize('super_admin', 'admin', 'sub_admin', 'manager'), async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });
    const { name, designation, email, phone, isPrimary } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Contact name required' });
    // If marking as primary, unset others
    if (isPrimary) client.contacts.forEach(c => { c.isPrimary = false; });
    client.contacts.push({ name, designation, email, phone, isPrimary: !!isPrimary });
    await client.save();
    res.json({ success: true, message: 'Contact added', data: { contacts: client.contacts } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/clients/:id/contacts/:contactId
router.delete('/:id/contacts/:contactId', authenticate, authorize('super_admin', 'admin', 'sub_admin', 'manager'), async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });
    client.contacts = client.contacts.filter(c => c._id.toString() !== req.params.contactId);
    await client.save();
    res.json({ success: true, message: 'Contact removed', data: { contacts: client.contacts } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
