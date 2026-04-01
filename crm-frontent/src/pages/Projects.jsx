import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { projectService } from '../services/projectService';
import { clientService } from '../services/clientService';
import api from '../services/api';
import PageHeader from '../components/common/PageHeader';
import DataTable from '../components/common/DataTable';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import toast from 'react-hot-toast';
import { Plus, Search, FolderOpen, Upload, FileText, X } from 'lucide-react';
import { MdOutlineRemoveRedEye } from 'react-icons/md';
import { RiDeleteBin6Line } from 'react-icons/ri';
import { format } from 'date-fns';
import { formatINR } from '../utils/currency';

const DEFAULT_TERMS = `These Terms and Conditions ("Agreement") govern the use of services provided by ParNetsSoftware PVT LTD to the Client. By engaging our services, you agree to abide by this Agreement.

1. Services Offered
We provide web and mobile app development services, including but not limited to:
• Website design and development
• Mobile application design and development
• Maintenance and support services
• Integration of third-party APIs
• UI/UX design services

2. Engagement and Deliverables
2.1 Scope of Work
The scope of the project, deliverables, timeline, and pricing will be outlined in a separate agreement or proposal, which forms part of this Agreement.

2.2 Client Responsibilities
The Client must provide all necessary materials, content, and approvals in a timely manner to avoid project delays.

2.3 Changes in Scope
Any requests for changes outside the agreed scope of work will be subject to additional costs and an extended timeline.

3. Payment Terms
3.1 Payment Structure
Payments will be divided into milestones as agreed in the project proposal.

3.2 Non-refundable Deposits
Once the Payment is done no refund.

4. Intellectual Property
4.1 Ownership
Upon full payment, the Client owns the final deliverables.

4.2 Third-party Materials
Any third-party assets used will remain subject to their respective licensing agreements.

4.3 Portfolio Usage
The Company reserves the right to display the project as part of its portfolio unless otherwise agreed in writing.

5. Confidentiality
Both parties agree to keep confidential any proprietary or sensitive information shared during the project.

6. Warranty and Support
6.1 Warranty Period
We offer a warranty for 30 days post-project completion to address any bugs or issues related to the agreed scope.

6.2 Ongoing Support
Support and maintenance beyond the warranty period will be subject to additional fees.

7. Termination
7.1 By the Client
The Client may terminate the project by providing written notice. Any work completed up to the termination date will be billed accordingly.

7.2 By the Company
We may terminate the project for non-payment or breach of terms.

8. Liability
The Company is not liable for indirect or consequential damages, including loss of profits, data, or revenue, arising from the use of our services.

9. Governing Law
This Agreement is governed by the laws of Bengaluru City, Karnataka, and any disputes will be resolved under this jurisdiction.

10. Miscellaneous
10.1 Force Majeure
We are not responsible for delays caused by factors beyond our control, such as natural disasters or third-party service failures.

10.2 Entire Agreement
This document, along with the project proposal, constitutes the entire agreement between the parties.

Contact Information
For any questions or concerns about this Agreement, contact us at:
Email: hello@parnetsgroup.com
Phone: +91 9740016068`;

const EMPTY_FORM = {
  name: '', client: '', startDate: '', endDate: '',
  description: '', budget: '', status: 'planning',
  projectType: 'other', priority: 'medium',
  technology: '', technicalSolution: '', termsAndConditions: DEFAULT_TERMS,
};

const SectionTitle = ({ children }) => (
  <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-3)' }}>{children}</p>
);

const Lbl = ({ children }) => <label className="modal-form-label">{children}</label>;

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
            <span className="text-sm text-slate-700 truncate">{file.name}</span>
            <button onClick={e => { e.stopPropagation(); onChange(null); }}
              className="ml-auto p-1 hover:bg-slate-100 rounded">
              <X className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </>
        ) : (
          <>
            <Upload className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-500">Click to upload</span>
          </>
        )}
      </div>
      <input ref={ref} type="file" onChange={e => onChange(e.target.files?.[0])} className="hidden"
        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
    </div>
  );
};

const Projects = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [modal, setModal] = useState(false);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [docs, setDocs] = useState({ agreement: null, scopeOfWork: null, otherDoc: null });

  const { data, isLoading } = useQuery({
    queryKey: ['projects', search],
    queryFn: () => projectService.getAll({ search }).then(r => r.data?.data?.projects || []),
  });

  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => clientService.getAll({ limit: 200 }).then(r => r.data?.data?.clients || []),
  });

  const createMut = useMutation({
    mutationFn: (data) => projectService.create(data, true),
    onSuccess: async () => {
      await queryClient.invalidateQueries(['projects']);
      await queryClient.invalidateQueries(['projects-all']);
      toast.success('Project created successfully');
      setModal(false);
      resetForm();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to create project'),
  });

  const deleteMut = useMutation({
    mutationFn: projectService.remove,
    onSuccess: async () => {
      await queryClient.invalidateQueries(['projects']);
      await queryClient.invalidateQueries(['projects-all']);
      toast.success('Project deleted');
      setDeleteId(null);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to delete project'),
  });

  const setField = (key, value) => setForm(prev => ({ ...prev, [key]: value }));
  const setDoc = (key, file) => setDocs(prev => ({ ...prev, [key]: file }));
  const resetForm = () => {
    setForm(EMPTY_FORM);
    setDocs({ agreement: null, scopeOfWork: null, otherDoc: null });
  };

  const handleSubmit = async () => {
    if (!form.name || !form.client || !form.startDate || !form.endDate) {
      return toast.error('Please fill all required fields');
    }

    const formData = new FormData();
    Object.entries(form).forEach(([key, value]) => {
      if (value) formData.append(key, value);
    });

    if (docs.agreement) formData.append('agreement', docs.agreement);
    if (docs.scopeOfWork) formData.append('scopeOfWork', docs.scopeOfWork);
    if (docs.otherDoc) formData.append('otherDoc', docs.otherDoc);

    createMut.mutate(formData);
  };

  const columns = [
    { key: 'name', label: 'Project', render: v => <span className="font-semibold" style={{ color: 'var(--text-1)' }}>{v}</span> },
    { key: 'client', label: 'Client', render: v => v?.name || '—' },
    { key: 'startDate', label: 'Start', render: v => v ? format(new Date(v), 'dd MMM yyyy') : '—' },
    { key: 'endDate', label: 'Deadline', render: v => v ? format(new Date(v), 'dd MMM yyyy') : '—' },
    { key: 'budget', label: 'Budget', render: v => v?.estimated ? formatINR(v.estimated) : '—' },
    { key: 'status', label: 'Status', render: v => <StatusBadge status={v || 'planning'} /> },
    { key: '_id', label: 'Actions', sortable: false, render: (v) => (
      <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
        <button title="View" onClick={() => navigate(`/projects/${v}`)}
          className="p-1.5 rounded-lg transition-colors hover:bg-indigo-50 text-indigo-600">
          <MdOutlineRemoveRedEye size={17} />
        </button>
        <button title="Delete" onClick={() => setDeleteId(v)}
          className="p-1.5 rounded-lg transition-colors hover:bg-red-50 text-red-500">
          <RiDeleteBin6Line size={16} />
        </button>
      </div>
    )},
  ];

  return (
    <div>
      <PageHeader title="Projects"
        breadcrumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'Projects' }]}
        actions={
          <button onClick={() => setModal(true)}
            className="modal-btn-primary flex items-center gap-2 px-4 py-2">
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
        <DataTable columns={columns} data={data || []} loading={isLoading}
          onRowClick={row => navigate(`/projects/${row._id}`)} />
      </div>

      <Modal open={modal} onClose={() => { setModal(false); resetForm(); }}
        title="New Project" subtitle="Set up a new project" icon={FolderOpen} size="xl">
        <div className="space-y-7">

          {/* Project Details */}
          <div>
            <SectionTitle>Project Details</SectionTitle>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Lbl>Project Name *</Lbl>
                <input value={form.name} onChange={e => setField('name', e.target.value)} className="modal-input" placeholder="e.g. Website Redesign" />
              </div>

              <div className="col-span-2">
                <Lbl>Client *</Lbl>
                <select value={form.client} onChange={e => setField('client', e.target.value)} className="modal-input">
                  <option value="">Select client...</option>
                  {(clients || []).map(c => <option key={c._id} value={c._id}>{c.name}{c.company ? ` — ${c.company}` : ''}</option>)}
                </select>
              </div>

              <div>
                <Lbl>Project Type</Lbl>
                <select value={form.projectType} onChange={e => setField('projectType', e.target.value)} className="modal-input">
                  <option value="web_development">Web Development</option>
                  <option value="mobile_app">Mobile App</option> 
                        <option value="mobile_app">Website & Mobile App</option>
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
                <input type="number" value={form.budget} onChange={e => setField('budget', e.target.value)} className="modal-input" placeholder="0" />
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
                <input value={form.technology} onChange={e => setField('technology', e.target.value)} className="modal-input" placeholder="React, Node.js, MongoDB (comma separated)" />
              </div>

              <div className="col-span-2">
                <Lbl>Description</Lbl>
                <textarea value={form.description} onChange={e => setField('description', e.target.value)}
                  rows={2} className="modal-input" style={{ resize: 'none' }} placeholder="Brief project description..." />
              </div>
            </div>
          </div>
          {/* Technical Solution */}
          <div>
            <SectionTitle>Technical Solution</SectionTitle>
            <textarea value={form.technicalSolution} onChange={e => setField('technicalSolution', e.target.value)}
              rows={4} className="modal-input w-full" style={{ resize: 'vertical' }}
              placeholder="Describe the technical approach, architecture, or solution for this project..." />
          </div>

          {/* Terms & Conditions */}
          <div>
            <SectionTitle>Terms & Conditions</SectionTitle>
            <textarea value={form.termsAndConditions} onChange={e => setField('termsAndConditions', e.target.value)}
              rows={6} className="modal-input w-full" style={{ resize: 'vertical' }}
              placeholder="Enter terms and conditions for this project..." />
            <p className="text-xs text-slate-400 mt-2">Default terms will be applied if left empty</p>
          </div>

          {/* Document Uploads */}
          {/* Document Uploads */}
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

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)}
        onConfirm={() => deleteMut.mutate(deleteId)} loading={deleteMut.isPending} title="Delete Project?" />
    </div>
  );
};

export default Projects;
