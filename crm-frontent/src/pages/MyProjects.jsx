import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { clientService } from '../services/clientService';
import { useAuth } from '../contexts/AuthContext';
import PageHeader from '../components/common/PageHeader';
import DataTable from '../components/common/DataTable';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import api from '../services/api';
import toast from 'react-hot-toast';
import { FolderOpen, Plus, Upload, FileText, X, Search, SigmaSquare } from 'lucide-react';
import { MdOutlineRemoveRedEye } from 'react-icons/md';
import { format } from 'date-fns';
import { formatINR } from '../utils/currency';

const EMPTY_FORM = {
  name: '', client: '', startDate: '', endDate: '',
  description: '', budget: '', status: 'planning',
  projectType: 'other', priority: 'medium',
  technology: '', technicalSolution: '',
};
SigmaSquare
const Lbl = ({ children }) => <label className="modal-form-label">{children}</label>;

const SectionTitle = ({ children }) => (
  <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-3)' }}>{children}</p>
);

const FilePicker = ({ label, file, onChange }) => {
  const ref = useRef();
  return (
    <div>
      <Lbl>{label}</Lbl>
      <div onClick={() => ref.current?.click()}
        className="flex items-center gap-3 border border-dashed border-slate-300 rounded-xl px-3 py-2.5 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-colors">
        {file ? (
          <>
            <FileText className="w-4 h-4 text-indigo-500 flex-shrink-0" />
            <span className="text-xs text-slate-700 truncate flex-1">{file.name}</span>
            <button type="button" onClick={e => { e.stopPropagation(); onChange(null); }} className="text-slate-400 hover:text-red-500">
              <X className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <>
            <Upload className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span className="text-xs text-slate-400">Click to upload (PDF, JPG, PNG, DOC)</span>
          </>
        )}
      </div>
      <input ref={ref} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" className="hidden"
        onChange={e => onChange(e.target.files?.[0] || null)} />
    </div>
  );
};

const MyProjects = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [modal, setModal] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [docs, setDocs] = useState({ agreement: null, scopeOfWork: null, otherDoc: null });

  const setField = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const setDoc = (k, f) => setDocs(p => ({ ...p, [k]: f }));
  const resetForm = () => { setForm({ ...EMPTY_FORM }); setDocs({ agreement: null, scopeOfWork: null, otherDoc: null }); };

  const { data: projectsData, isLoading } = useQuery({
    queryKey: ['projects-all', search],
    queryFn: () => api.get('/projects', { params: { limit: 100, search: search || undefined } }).then(r => r.data?.data?.projects || []),
  });

  const { data: clients } = useQuery({
    queryKey: ['clients-dropdown'],
    queryFn: () => clientService.getAll({ limit: 200 }).then(r => r.data?.data?.clients || []),
    enabled: modal,
    staleTime: 60000,
  });

  const createMut = useMutation({
    mutationFn: (fd) => api.post('/projects/create', fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['projects-all'] });
      await qc.invalidateQueries({ queryKey: ['projects'] });
      await qc.refetchQueries({ queryKey: ['projects-all'] });
      toast.success('Project created successfully');
      setModal(false);
      resetForm();
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to create project'),
  });

  const handleSubmit = () => {
    if (!form.name.trim()) return toast.error('Project name is required');
    if (!form.client)      return toast.error('Client is required');
    if (!form.startDate)   return toast.error('Start date is required');
    if (!form.endDate)     return toast.error('End date is required');
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => { if (v !== '' && v !== undefined) fd.append(k, v); });
    Object.entries(docs).forEach(([k, f]) => { if (f) fd.append(k, f); });
    createMut.mutate(fd);
  };

  const columns = [
    {
      key: 'name', label: 'Project',
      render: v => <span className="font-semibold" style={{ color: 'var(--text-1)' }}>{v}</span>
    },
    { key: 'client', label: 'Client', render: v => v?.name || '—' },
    { key: 'startDate', label: 'Start', render: v => v ? format(new Date(v), 'dd MMM yyyy') : '—' },
    { key: 'endDate', label: 'Deadline', render: v => v ? format(new Date(v), 'dd MMM yyyy') : '—' },
    { key: 'budget', label: 'Budget', render: v => v?.estimated ? formatINR(v.estimated) : '—' },
    { key: 'status', label: 'Status', render: v => <StatusBadge status={v || 'planning'} /> },
    {
      key: '_id', label: 'Actions', sortable: false,
      render: (v) => (
        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
          <button title="View" onClick={() => navigate(`/projects/${v}`)}
            className="p-1.5 rounded-lg transition-colors hover:bg-indigo-50 text-indigo-600">
            <MdOutlineRemoveRedEye size={17} />
          </button>
        </div>
      )
    },
  ];

  return (
    <div>
      <PageHeader
        title="My Projects"
        breadcrumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'My Projects' }]}
        actions={
          <button onClick={() => setModal(true)} className="modal-btn-primary flex items-center gap-2 px-4 py-2">
            <Plus className="w-4 h-4" /> New Project
          </button>
        }
      />

      <div className="crm-card p-5">
        <div className="relative mb-5 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search projects..."
            className="crm-input pl-9" />
        </div>
        <DataTable
          columns={columns}
          data={projectsData || []}
          loading={isLoading}
          onRowClick={row => navigate(`/projects/${row._id}`)}
        />
      </div>

      {/* New Project Modal */}
      <Modal open={modal} onClose={() => { setModal(false); resetForm(); }}
        title="New Project" subtitle="Set up a new project" icon={FolderOpen} size="xl">
        <div className="space-y-7">

          <div>
            <SectionTitle>Project Details</SectionTitle>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Lbl>Project Name *</Lbl>
                <input value={form.name} onChange={e => setField('name', e.target.value)}
                  className="modal-input" placeholder="e.g. Website Redesign" />
              </div>
              <div className="col-span-2">
                <Lbl>Client *</Lbl>
                <select value={form.client} onChange={e => setField('client', e.target.value)} className="modal-input">
                  <option value="">Select client...</option>
                  {(clients || []).map(c => (
                    <option key={c._id} value={c._id}>{c.name}{c.company ? ` — ${c.company}` : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <Lbl>Project Type</Lbl>
                <select value={form.projectType} onChange={e => setField('projectType', e.target.value)} className="modal-input">
                  <option value="web_development">Web Development</option>
                  <option value="mobile_app">Mobile App</option>
                  <option value="design">Design</option>
                  <option value="consulting">Consulting</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <Lbl>Priority</Lbl>
                <select value={form.priority} onChange={e => setField('priority', e.target.value)} className="modal-input">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Critical</option>
                </select>
              </div>
              <div>
                <Lbl>Status</Lbl>
                <select value={form.status} onChange={e => setField('status', e.target.value)} className="modal-input">
                  <option value="planning">Planning</option>
                  <option value="in_progress">In Progress</option>
                  <option value="on_hold">On Hold</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <Lbl>Estimated Budget (₹)</Lbl>
                <input type="number" value={form.budget} onChange={e => setField('budget', e.target.value)}
                  className="modal-input" placeholder="0" />
              </div>
              <div>
                <Lbl>Start Date *</Lbl>
                <input type="date" value={form.startDate} onChange={e => setField('startDate', e.target.value)} className="modal-input" />
              </div>
              <div>
                <Lbl>End Date (Deadline) *</Lbl>
                <input type="date" value={form.endDate} onChange={e => setField('endDate', e.target.value)} className="modal-input" />
              </div>
              <div className="col-span-2">
                <Lbl>Technology Stack</Lbl>
                <input value={form.technology} onChange={e => setField('technology', e.target.value)}
                  className="modal-input" placeholder="React, Node.js, MongoDB (comma separated)" />
              </div>
              <div className="col-span-2">
                <Lbl>Description</Lbl>
                <textarea value={form.description} onChange={e => setField('description', e.target.value)}
                  rows={2} className="modal-input" style={{ resize: 'none' }} placeholder="Brief project description..." />
              </div>
            </div>
          </div>

          <div>
            <SectionTitle>Technical Solution</SectionTitle>
            <textarea value={form.technicalSolution} onChange={e => setField('technicalSolution', e.target.value)}
              rows={4} className="modal-input w-full" style={{ resize: 'vertical' }}
              placeholder="Describe the technical approach, architecture, or solution..." />
          </div>

          <div>
            <SectionTitle>Document Uploads</SectionTitle>
            <p className="text-xs text-slate-400 mb-4">PDF, JPG, PNG or DOC — max 20 MB each</p>
            <div className="grid grid-cols-1 gap-4">
              <FilePicker label="Agreement Document" file={docs.agreement} onChange={f => setDoc('agreement', f)} />
              <FilePicker label="Scope of Work Document" file={docs.scopeOfWork} onChange={f => setDoc('scopeOfWork', f)} />
              <FilePicker label="Other Supporting Document (optional)" file={docs.otherDoc} onChange={f => setDoc('otherDoc', f)} />
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button onClick={handleSubmit} disabled={createMut.isPending} className="modal-btn-primary disabled:opacity-50">
              {createMut.isPending ? 'Creating...' : 'Create Project'}
            </button>
            <button onClick={() => { setModal(false); resetForm(); }} className="modal-btn-secondary">Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default MyProjects;
