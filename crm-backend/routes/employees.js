import express from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import User from '../models/User.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();
const NON_EMPLOYEE_ROLES = ['super_admin', 'admin'];

// ── Multer setup ──────────────────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'employee-docs');
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
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB per file
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|pdf|doc|docx/;
    const ok = allowed.test(path.extname(file.originalname).toLowerCase()) &&
               allowed.test(file.mimetype.split('/')[1]);
    ok ? cb(null, true) : cb(new Error('Only images, PDFs and Word docs allowed'));
  },
});

const docFields = upload.fields([
  { name: 'aadhaar',    maxCount: 1 },
  { name: 'pan',        maxCount: 1 },
  { name: 'education',  maxCount: 1 },
  { name: 'experience', maxCount: 1 },
  { name: 'salarySlip1',maxCount: 1 },
  { name: 'salarySlip2',maxCount: 1 },
  { name: 'salarySlip3',maxCount: 1 },
]);

// GET /api/employees
router.get('/', authenticate, async (req, res) => {
  try {
    const { search, department, role, page = 1, limit = 10 } = req.query;
    const query = { role: { $nin: NON_EMPLOYEE_ROLES } };
    if (search) {
      const e = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [{ name: { $regex: e, $options: 'i' } }, { email: { $regex: e, $options: 'i' } }, { department: { $regex: e, $options: 'i' } }, { designation: { $regex: e, $options: 'i' } }];
    }
    if (department) query.department = department;
    if (role && !NON_EMPLOYEE_ROLES.includes(role)) query.role = role;
    const employees = await User.find(query).select('-password').sort({ createdAt: -1 }).limit(limit * 1).skip((page - 1) * limit);
    const total = await User.countDocuments(query);
    const departments = await User.distinct('department', { role: { $nin: NON_EMPLOYEE_ROLES } });
    const roles = await User.distinct('role', { role: { $nin: NON_EMPLOYEE_ROLES } });
    res.json({ success: true, data: { employees, pagination: { current: +page, pages: Math.ceil(total / limit), total }, filters: { departments: departments.filter(Boolean), roles } } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/employees/my-face — returns logged-in user's faceDescriptor
router.get('/my-face', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('+faceDescriptor');
    res.json({ success: true, data: { faceDescriptor: user?.faceDescriptor || null } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/employees/stats
router.get('/stats', authenticate, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const q = { role: { $nin: NON_EMPLOYEE_ROLES } };
    const totalEmployees = await User.countDocuments(q);
    const activeEmployees = await User.countDocuments({ ...q, status: 'active' });
    const byDept = await User.aggregate([{ $match: q }, { $group: { _id: '$department', count: { $sum: 1 } } }, { $sort: { count: -1 } }]);
    const byRole = await User.aggregate([{ $match: q }, { $group: { _id: '$role', count: { $sum: 1 } } }, { $sort: { count: -1 } }]);
    const salaryStats = await User.aggregate([{ $match: { ...q, salary: { $exists: true, $ne: null } } }, { $group: { _id: null, avgSalary: { $avg: '$salary' }, minSalary: { $min: '$salary' }, maxSalary: { $max: '$salary' }, totalSalary: { $sum: '$salary' } } }]);
    res.json({ success: true, data: { totalEmployees, activeEmployees, inactiveEmployees: totalEmployees - activeEmployees, employeesByDepartment: byDept, employeesByRole: byRole, recentJoinees: [], salaryStats: salaryStats[0] || { avgSalary: 0, minSalary: 0, maxSalary: 0, totalSalary: 0 } } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/employees/:id/face — returns faceDescriptor for attendance matching
router.get('/:id/face', authenticate, async (req, res) => {
  try {
    const employee = await User.findOne({ _id: req.params.id, role: { $nin: NON_EMPLOYEE_ROLES } }).select('+facePhoto +faceDescriptor');
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });
    res.json({ success: true, data: { facePhoto: employee.facePhoto || null, faceDescriptor: employee.faceDescriptor || null } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/employees/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const employee = await User.findOne({ _id: req.params.id, role: { $nin: NON_EMPLOYEE_ROLES } })
      .select('-password +faceDescriptor');
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });
    const obj = employee.toObject();
    // Don't expose raw descriptor — just flag whether it's enrolled
    obj.faceEnrolled = !!obj.faceDescriptor;
    delete obj.faceDescriptor;
    res.json({ success: true, data: { employee: obj } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/employees/register — multipart: employee data + documents + bank details
router.post('/register', authenticate, authorize('super_admin', 'admin'), docFields, async (req, res) => {
  try {
    const { name, email, password, role, department, designation, phone, salary, joiningDate, facePhoto, faceDescriptor,
            bankName, accountHolderName, accountNumber, ifscCode, branchName } = req.body;

    if (!name || !email || !role || !department)
      return res.status(400).json({ success: false, message: 'Name, email, role, department required' });
    if (!password || password.length < 6)
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    if (NON_EMPLOYEE_ROLES.includes(role))
      return res.status(400).json({ success: false, message: 'Cannot create admin users through employee endpoint' });
    if (await User.findOne({ email: email.toLowerCase() }))
      return res.status(400).json({ success: false, message: 'Email already exists' });

    // Build employeeDocs from uploaded files
    const files = req.files || {};
    const docKeys = ['aadhaar','pan','education','experience','salarySlip1','salarySlip2','salarySlip3'];
    const employeeDocs = {};
    for (const key of docKeys) {
      if (files[key]?.[0]) {
        const f = files[key][0];
        employeeDocs[key] = { filename: f.filename, path: f.path, originalName: f.originalname };
      }
    }

    const employee = new User({
      name, email: email.toLowerCase(), password, role,
      department, designation, phone,
      salary: salary ? Number(salary) : undefined,
      joiningDate: joiningDate || new Date(),
      status: 'active',
      createdBy: req.user._id,
      ...(facePhoto ? { facePhoto } : {}),
      ...(faceDescriptor ? { faceDescriptor } : {}),
      employeeDocs,
      bankDetails: { bankName, accountHolderName, accountNumber, ifscCode, branchName },
    });
    await employee.save();
    const safe = employee.toObject();
    delete safe.password; delete safe.facePhoto;
    res.status(201).json({ success: true, message: 'Employee created successfully.', data: { employee: safe } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: e.message || 'Server error' });
  }
});

// GET /api/employees/docs/:filename — serve uploaded files
router.get('/docs/:filename', authenticate, (req, res) => {
  const filePath = path.join(UPLOAD_DIR, req.params.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ success: false, message: 'File not found' });
  res.sendFile(filePath);
});

// POST /api/employees — JSON only (legacy, no file upload)
router.post('/', authenticate, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const { name, email, password, role, department, designation, phone, salary, joiningDate, facePhoto } = req.body;
    if (!name || !email || !role || !department) return res.status(400).json({ success: false, message: 'Name, email, role, department required' });
    if (!password || password.length < 6) return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    if (NON_EMPLOYEE_ROLES.includes(role)) return res.status(400).json({ success: false, message: 'Cannot create admin users through employee endpoint' });
    if (await User.findOne({ email: email.toLowerCase() })) return res.status(400).json({ success: false, message: 'Email already exists' });
    const employee = new User({
      name, email: email.toLowerCase(), password, role,
      department, designation, phone,
      salary: salary ? Number(salary) : undefined,
      joiningDate: joiningDate || new Date(),
      status: 'active',
      createdBy: req.user._id,
      ...(facePhoto ? { facePhoto } : {})
    });
    await employee.save();
    const safe = employee.toObject(); delete safe.password; delete safe.facePhoto;
    res.status(201).json({ success: true, message: 'Employee created successfully.', data: { employee: safe } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/employees/:id/full — multipart update (same fields as register)
router.put('/:id/full', authenticate, authorize('super_admin', 'admin'), docFields, async (req, res) => {
  try {
    const { name, phone, role, department, designation, employeeId, joiningDate, salary, status,
            bankName, accountHolderName, accountNumber, ifscCode, branchName } = req.body;

    if (role && NON_EMPLOYEE_ROLES.includes(role))
      return res.status(400).json({ success: false, message: 'Cannot assign admin role via employee endpoint' });

    const files = req.files || {};
    const docKeys = ['aadhaar','pan','education','experience','salarySlip1','salarySlip2','salarySlip3'];

    const set = {};
    if (name)        set.name        = name;
    if (phone !== undefined) set.phone = phone;
    if (role)        set.role        = role;
    if (department)  set.department  = department;
    if (designation) set.designation = designation;
    if (employeeId !== undefined) set.employeeId = employeeId;
    if (joiningDate) set.joiningDate = new Date(joiningDate);
    if (salary)      set.salary      = Number(salary);
    if (status)      set.status      = status;

    if (bankName !== undefined)          set['bankDetails.bankName']          = bankName;
    if (accountHolderName !== undefined) set['bankDetails.accountHolderName'] = accountHolderName;
    if (accountNumber !== undefined)     set['bankDetails.accountNumber']     = accountNumber;
    if (ifscCode !== undefined)          set['bankDetails.ifscCode']          = ifscCode;
    if (branchName !== undefined)        set['bankDetails.branchName']        = branchName;

    for (const key of docKeys) {
      if (files[key]?.[0]) {
        const f = files[key][0];
        set[`employeeDocs.${key}`] = { filename: f.filename, path: f.path, originalName: f.originalname };
      }
    }

    const employee = await User.findOneAndUpdate(
      { _id: req.params.id },
      { $set: set },
      { new: true }
    ).select('-password');

    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });
    res.json({ success: true, message: 'Employee updated', data: { employee } });
  } catch (e) {
    console.error('PUT /full error:', e);
    res.status(500).json({ success: false, message: e.message || 'Server error' });
  }
});

// PUT /api/employees/:id — JSON only (simple field updates)
router.put('/:id', authenticate, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const updates = { ...req.body };
    delete updates.password;
    // faceDescriptor and facePhoto have select:false — use $set explicitly so they are saved
    const setFields = {};
    if (updates.faceDescriptor !== undefined) { setFields.faceDescriptor = updates.faceDescriptor; delete updates.faceDescriptor; }
    if (updates.facePhoto !== undefined)      { setFields.facePhoto = updates.facePhoto;      delete updates.facePhoto; }
    const updateOp = Object.keys(setFields).length > 0
      ? { $set: { ...updates, ...setFields } }
      : updates;
    const employee = await User.findOneAndUpdate(
      { _id: req.params.id, role: { $nin: NON_EMPLOYEE_ROLES } },
      updateOp,
      { new: true }
    ).select('-password');
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });
    res.json({ success: true, message: 'Employee updated', data: { employee } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/employees/:id
router.delete('/:id', authenticate, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const employee = await User.findOneAndDelete({ _id: req.params.id, role: { $nin: NON_EMPLOYEE_ROLES } });
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });
    res.json({ success: true, message: 'Employee deleted' });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/employees/:id/enrol-face
// Admin can enrol any employee; employee can enrol themselves
router.post('/:id/enrol-face', authenticate, async (req, res) => {
  try {
    const isAdmin = ['super_admin', 'admin'].includes(req.user.role);
    const isSelf  = req.user._id.toString() === req.params.id;
    if (!isAdmin && !isSelf)
      return res.status(403).json({ success: false, message: 'Not authorised' });

    const { descriptor } = req.body;
    if (!descriptor || !Array.isArray(descriptor))
      return res.status(400).json({ success: false, message: 'Face descriptor array required' });

    const employee = await User.findOneAndUpdate(
      { _id: req.params.id, role: { $nin: NON_EMPLOYEE_ROLES } },
      { $set: { faceDescriptor: JSON.stringify(descriptor), faceEnrolledAt: new Date() } },
      { new: true }
    ).select('-password');
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });
    res.json({ success: true, message: 'Face enrolled successfully' });
  } catch (e) {
    console.error('enrol-face error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/employees/:id/documents
router.get('/:id/documents', authenticate, async (req, res) => {
  try {
    const employee = await User.findOne({ _id: req.params.id, role: { $nin: NON_EMPLOYEE_ROLES } }).select('name documents');
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });
    res.json({ success: true, data: { documents: employee.documents || [] } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/employees/:id/documents
router.post('/:id/documents', authenticate, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const { name, type, url, data, mimeType, size } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Document name required' });
    const employee = await User.findOne({ _id: req.params.id, role: { $nin: NON_EMPLOYEE_ROLES } });
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });
    if (!employee.documents) employee.documents = [];
    const doc = { _id: new mongoose.Types.ObjectId(), name, type: type || 'other', url: url || '', data: data || '', mimeType, size, uploadedAt: new Date() };
    employee.documents.push(doc);
    await employee.save();
    res.status(201).json({ success: true, message: 'Document uploaded', data: { document: doc } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;