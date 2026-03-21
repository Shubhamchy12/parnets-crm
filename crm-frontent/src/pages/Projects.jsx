import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { projectService } from '../services/projectService';
import { clientService } from '../services/clientService';
import { employeeService } from '../services/employeeService';
import PageHeader from '../components/common/PageHeader';
import DataTable from '../components/common/DataTable';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Plus, Search, FolderOpen } from 'lucide-react';
import { MdOutlineRemoveRedEye } from 'react-icons/md';
import { RiDeleteBin6Line } from 'react-icons/ri';
import { format } from 'date-fns';

const schema = z.object({
  name: z.string().min(2, 'Name required'),
  client: z.string().min(1, 'Client required'),
  projectManager: z.string().min(1, 'Project manager required'),
  startDate: z.string().min(1, 'Start date required'),
  endDate: z.string().min(1, 'End date required'),
  description: z.string().optional(),
  budget: z.coerce.number().optional(),
  status: z.string().default('planning'),
  projectType: z.string().default('other'),
  priority: z.string().default('medium'),
  technology: z.string().optional(),
});

const inputCls = "modal-input";

const Projects = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const { register, handleSubmit, reset, formState: { errors } } = useForm({ resolver: zodResolver(schema), defaultValues: { status: 'planning', priority: 'medium', projectType: 'other' } });

  const { data, isLoading } = useQuery({
    queryKey: ['projects', search],
    queryFn: () => projectService.getAll({ search }).then(r => r.data?.data?.projects || r.data?.projects || []),
  });

  const { data: clients } = useQuery({
    queryKey: ['clients-dropdown'],
    queryFn: () => clientService.getAll({ limit: 200 }).then(r => r.data?.data?.clients || []),
    staleTime: 60000,
  });

  const { data: employees } = useQuery({
    queryKey: ['employees-dropdown'],
    queryFn: () => employeeService.getAll({ limit: 200 }).then(r => r.data?.data?.employees || []),
    staleTime: 60000,
  });

  const createMut = useMutation({
    mutationFn: (d) => {
      const payload = { ...d };
      if (payload.technology && typeof payload.technology === 'string') {
        payload.technology = payload.technology.split(',').map(t => t.trim()).filter(Boolean);
      }
      return projectService.create(payload);
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project created');
      setModal(false); reset();
      const id = res.data?.data?.project?._id;
      if (id) navigate(`/projects/${id}`);
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => projectService.remove(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['projects'] });
      const prev = qc.getQueryData(['projects', search]);
      qc.setQueryData(['projects', search], (old = []) => old.filter(p => p._id !== id));
      return { prev };
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['projects'] }); toast.success('Deleted'); setDeleteId(null); },
    onError: (e, _, ctx) => { if (ctx?.prev) qc.setQueryData(['projects', search], ctx.prev); toast.error(e.response?.data?.message || 'Failed to delete'); },
  });

  const columns = [
    { key: 'name', label: 'Project', render: v => <span className="font-semibold" style={{ color: 'var(--text-1)' }}>{v}</span> },
    { key: 'client', label: 'Client', render: (v) => v?.name || '—' },
    { key: 'projectManager', label: 'Manager', render: (v) => v?.name || '—' },
    { key: 'startDate', label: 'Start', render: v => v ? format(new Date(v), 'dd MMM yyyy') : '—' },
    { key: 'endDate', label: 'Deadline', render: v => v ? format(new Date(v), 'dd MMM yyyy') : '—' },
    { key: 'budget', label: 'Budget', render: v => v ? `₹${Number(v).toLocaleString()}` : '—' },
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
        <DataTable columns={columns} data={data || []} loading={isLoading} onRowClick={row => navigate(`/projects/${row._id}`)} />
      </div>

      <Modal open={modal} onClose={() => { setModal(false); reset(); }} title="New Project" subtitle="Set up a new project" icon={FolderOpen} size="xl">
        <form onSubmit={handleSubmit(d => createMut.mutate(d))} className="space-y-6">

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-3)' }}>Project Details</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="modal-form-label">Project Name *</label>
                <input {...register('name')} className={`modal-input ${errors.name ? 'modal-input-error' : ''}`} placeholder="e.g. Website Redesign" />
                {errors.name && <p className="modal-error-text">{errors.name.message}</p>}
              </div>

              <div>
                <label className="modal-form-label">Client *</label>
                <select {...register('client')} className={`modal-input ${errors.client ? 'modal-input-error' : ''}`}>
                  <option value="">Select client...</option>
                  {(clients || []).map(c => <option key={c._id} value={c._id}>{c.name} — {c.company || c.email}</option>)}
                </select>
                {errors.client && <p className="modal-error-text">{errors.client.message}</p>}
              </div>

              <div>
                <label className="modal-form-label">Project Manager *</label>
                <select {...register('projectManager')} className={`modal-input ${errors.projectManager ? 'modal-input-error' : ''}`}>
                  <option value="">Select manager...</option>
                  {(employees || []).map(e => <option key={e._id} value={e._id}>{e.name} — {e.designation || e.role}</option>)}
                </select>
                {errors.projectManager && <p className="modal-error-text">{errors.projectManager.message}</p>}
              </div>

              <div>
                <label className="modal-form-label">Project Type</label>
                <select {...register('projectType')} className="modal-input">
                  <option value="web_development">Web Development</option>
                  <option value="mobile_app">Mobile App</option>
                  <option value="design">Design</option>
                  <option value="consulting">Consulting</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="modal-form-label">Priority</label>
                <select {...register('priority')} className="modal-input">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Critical</option>
                </select>
              </div>

              <div>
                <label className="modal-form-label">Status</label>
                <select {...register('status')} className="modal-input">
                  <option value="planning">Planning</option>
                  <option value="in_progress">In Progress</option>
                  <option value="on_hold">On Hold</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="modal-form-label">Start Date *</label>
                <input {...register('startDate')} type="date" className={`modal-input ${errors.startDate ? 'modal-input-error' : ''}`} />
                {errors.startDate && <p className="modal-error-text">{errors.startDate.message}</p>}
              </div>

              <div>
                <label className="modal-form-label">End Date (Deadline) *</label>
                <input {...register('endDate')} type="date" className={`modal-input ${errors.endDate ? 'modal-input-error' : ''}`} />
                {errors.endDate && <p className="modal-error-text">{errors.endDate.message}</p>}
              </div>

              <div>
                <label className="modal-form-label">Estimated Budget (₹)</label>
                <input {...register('budget')} type="number" className="modal-input" placeholder="0" />
              </div>

              <div>
                <label className="modal-form-label">Technology Stack</label>
                <input {...register('technology')} className="modal-input" placeholder="React, Node.js, MongoDB..." />
              </div>

              <div className="col-span-2">
                <label className="modal-form-label">Description</label>
                <textarea {...register('description')} rows={2} className="modal-input" style={{ resize: 'none' }} placeholder="Brief project description..." />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={createMut.isPending} className="modal-btn-primary">
              {createMut.isPending ? 'Creating...' : 'Create Project'}
            </button>
            <button type="button" onClick={() => { setModal(false); reset(); }} className="modal-btn-secondary">Cancel</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteMut.mutate(deleteId)} loading={deleteMut.isPending} title="Delete Project?" />
    </div>
  );
};

export default Projects;
