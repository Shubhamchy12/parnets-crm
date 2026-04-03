import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Project from '../models/Project.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { logActivity } from '../middleware/activity.js';

const router = express.Router();
const ADMIN_ROLES = ['super_admin', 'admin'];

// ── Multer setup ──────────────────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'project-docs');
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
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    /\.(pdf|jpg|jpeg|png|doc|docx)$/.test(ext) ? cb(null, true) : cb(new Error('Invalid file type'));
  },
});
const projectFields = upload.fields([
  { name: 'agreement',   maxCount: 1 },
  { name: 'scopeOfWork', maxCount: 1 },
  { name: 'otherDoc',    maxCount: 1 },
]);

function fileInfo(f) {
  return f ? { filename: f.filename, path: f.path, originalName: f.originalname } : undefined;
}

// POST /api/projects/create — multipart/form-data
router.post('/create', authenticate, authorize('super_admin', 'admin', 'sub_admin', 'manager', 'sales', 'employee'),
  projectFields,
  logActivity('Project creation', 'project', 'medium'),
  async (req, res) => {
    try {
      const { name, client, startDate, endDate, description, budget,
              status, projectType, priority, technology, technicalSolution, termsAndConditions } = req.body;

      if (!name?.trim()) return res.status(400).json({ success: false, message: 'Project name is required' });
      if (!client)       return res.status(400).json({ success: false, message: 'Client is required' });
      if (!startDate)    return res.status(400).json({ success: false, message: 'Start date is required' });
      if (!endDate)      return res.status(400).json({ success: false, message: 'End date is required' });

      const files = req.files || {};
      const project = new Project({
        name: name.trim(), client, startDate, endDate, description,
        budget: budget ? { estimated: Number(budget) } : undefined,
        status: status || 'planning',
        projectType: projectType || 'other',
        priority: priority || 'medium',
        technology: technology ? technology.split(',').map(t => t.trim()).filter(Boolean) : [],
        technicalSolution: technicalSolution?.trim(),
        termsAndConditions: termsAndConditions?.trim(),
        projectDocs: {
          agreement:   fileInfo(files.agreement?.[0]),
          scopeOfWork: fileInfo(files.scopeOfWork?.[0]),
          otherDoc:    fileInfo(files.otherDoc?.[0]),
        },
        createdBy: req.user._id,
      });
      await project.save();
      const populated = await Project.findById(project._id)
        .populate({ path: 'client', select: 'name company', options: { strictPopulate: false } });
      res.status(201).json({ success: true, message: 'Project created', data: { project: populated } });
    } catch (e) {
      console.error('Create project error:', e);
      res.status(500).json({ success: false, message: e.message || 'Server error' });
    }
  }
);

// GET /api/projects/docs/:filename
router.get('/docs/:filename', authenticate, (req, res) => {
  const filePath = path.join(UPLOAD_DIR, req.params.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ success: false, message: 'File not found' });
  res.sendFile(filePath);
});

// GET /api/projects
router.get('/', authenticate, async (req, res) => {
  try {
    const { search, status, priority, page = 1, limit = 10 } = req.query;
    const query = {};
    if (search) {
      const e = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [{ name: { $regex: e, $options: 'i' } }, { description: { $regex: e, $options: 'i' } }];
    }
    if (status) query.status = status;
    if (priority) query.priority = priority;
    const projects = await Project.find(query)
      .populate({ path: 'client', options: { strictPopulate: false } })
      .populate({ path: 'projectManager', select: 'name email', options: { strictPopulate: false } })
      .populate({ path: 'teamMembers.user', select: 'name email', options: { strictPopulate: false } })
      .populate({ path: 'createdBy', select: 'name email', options: { strictPopulate: false } })
      .sort({ createdAt: -1 }).limit(limit * 1).skip((page - 1) * limit);
    const total = await Project.countDocuments(query);
    res.json({ success: true, data: { projects, pagination: { current: +page, pages: Math.ceil(total / limit), total } } });
  } catch (e) {
    console.error('Get projects error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/projects
router.post('/', authenticate, authorize('super_admin', 'admin', 'sub_admin', 'manager', 'sales', 'employee'), logActivity('Project creation', 'project', 'medium'), async (req, res) => {
  try {
    const body = { ...req.body };
    // Normalize flat budget number → { estimated }
    if (body.budget !== undefined && typeof body.budget !== 'object') {
      body.budget = { estimated: Number(body.budget) || 0 };
    }
    body.createdBy = req.user._id;
    const project = new Project(body);
    await project.save();
    const populated = await Project.findById(project._id)
      .populate({ path: 'client', select: 'name company', options: { strictPopulate: false } })
      .populate({ path: 'projectManager', select: 'name email', options: { strictPopulate: false } })
      .populate({ path: 'teamMembers.user', select: 'name email role department', options: { strictPopulate: false } });
    res.status(201).json({ success: true, message: 'Project created successfully', data: { project: populated } });
  } catch (e) {
    console.error('Create project error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/projects/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate({ path: 'client', select: 'name company email phone', options: { strictPopulate: false } })
      .populate({ path: 'projectManager', select: 'name email', options: { strictPopulate: false } })
      .populate({ path: 'teamMembers.user', select: 'name email role', options: { strictPopulate: false } })
      .populate({ path: 'credentials.addedBy', select: 'name', options: { strictPopulate: false } });
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    res.json({ success: true, data: { project } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/projects/:id
router.put('/:id', authenticate, logActivity('Project update', 'project', 'medium'), async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate({ path: 'client', select: 'name company', options: { strictPopulate: false } })
      .populate({ path: 'projectManager', select: 'name email', options: { strictPopulate: false } });
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    res.json({ success: true, message: 'Project updated', data: { project } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/projects/:id
router.delete('/:id', authenticate, authorize('super_admin', 'admin'), logActivity('Project deletion', 'project', 'high'), async (req, res) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    res.json({ success: true, message: 'Project deleted' });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/projects/:id/team — bulk replace team members
router.put('/:id/team', authenticate, authorize('super_admin', 'admin', 'sub_admin', 'manager'), async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    // req.body.members = [{ user: id, role: 'developer' }, ...]
    project.teamMembers = (req.body.members || []).map(m => ({
      user: m.user,
      role: m.role || 'developer',
      assignedAt: new Date(),
    }));
    await project.save();
    const populated = await Project.findById(project._id)
      .populate({ path: 'teamMembers.user', select: 'name email role department', options: { strictPopulate: false } });
    res.json({ success: true, message: 'Team updated', data: { project: populated } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/projects/:id/team
router.post('/:id/team', authenticate, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    if (project.teamMembers.some(m => m.user.toString() === req.body.user)) return res.status(400).json({ success: false, message: 'User already a team member' });
    project.teamMembers.push({ user: req.body.user, role: req.body.role || 'developer' });
    await project.save();
    res.json({ success: true, message: 'Team member added', data: { project } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/projects/:id/team/:userId
router.delete('/:id/team/:userId', authenticate, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    project.teamMembers = project.teamMembers.filter(m => m.user.toString() !== req.params.userId);
    await project.save();
    res.json({ success: true, message: 'Team member removed', data: { project } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/projects/:id/milestones
router.get('/:id/milestones', authenticate, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id).select('milestones');
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    res.json({ success: true, data: { milestones: project.milestones } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/projects/:id/milestones
router.post('/:id/milestones', authenticate, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    const { name, description, dueDate } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Milestone name required' });
    project.milestones.push({ name, description, dueDate, status: 'pending' });
    await project.save();
    res.json({ success: true, message: 'Milestone added', data: { milestones: project.milestones } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/projects/:id/milestones/:milestoneId
router.put('/:id/milestones/:milestoneId', authenticate, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    const ms = project.milestones.id(req.params.milestoneId);
    if (!ms) return res.status(404).json({ success: false, message: 'Milestone not found' });
    Object.assign(ms, req.body);
    if (req.body.status === 'completed') ms.completedAt = new Date();
    await project.save();
    res.json({ success: true, message: 'Milestone updated', data: { milestones: project.milestones } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/projects/:id/agreements — upload agreement (base64 or URL)
router.post('/:id/agreements', authenticate, authorize('super_admin', 'admin', 'sub_admin', 'manager'), async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    const { title, url } = req.body;
    if (!title || !url) return res.status(400).json({ success: false, message: 'title and url required' });
    const version = (project.agreements?.length || 0) + 1;
    project.agreements = project.agreements || [];
    project.agreements.push({ title, url, version, uploadedBy: req.user._id, uploadedAt: new Date() });
    await project.save();
    res.json({ success: true, message: 'Agreement uploaded', data: { agreements: project.agreements } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/projects/:id/agreements
router.get('/:id/agreements', authenticate, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .select('agreements')
      .populate({ path: 'agreements.uploadedBy', select: 'name', options: { strictPopulate: false } });
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    res.json({ success: true, data: { agreements: project.agreements || [] } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
