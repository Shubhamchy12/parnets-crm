import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientService } from '../services/clientService';
import { projectService } from '../services/projectService';
import { employeeService } from '../services/employeeService';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import ConfirmDialog from '../components/common/ConfirmDialog';
import Modal from '../components/common/Modal';
import toast from 'react-hot-toast';
import { ArrowLeft, Plus, Trash2, FolderOpen, Star, Phone, Mail, Briefcase, X } from 'lucide-react';
import { RiDeleteBin6Line } from 'react-icons/ri';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';

const Field = ({ label, value }) => {
  const display = value === null || value === undefined
    ? '—'
    : typeof value === 'object'
      ? Object.values(value).filter(v => v && typeof v === 'string').join(', ') || '—'
      : String(value);
  return (
    <div>
      <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-3)' }}>{label}</p>
      <p className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>{display}</p>
    </div>
  );
};

const ClientDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const isAdmin = ['admin', 'super_admin', 'sub_admin', 'manager'].includes(user?.role);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [note, setNote] = useState('');
  const [contactModal, setContactModal] = useState(false);
  const [projectModal, setProjectModal] = useState(false);
  const [contactForm, setContactForm] = useState({ name: '', designation: '', email: '', phone: '', isPrimary: false });
  const [projectForm, setProjectForm] = useState({
    name: '', description: '', projectType: 'web_development', status: 'planning',
    startDate: '', endDate: '', budget: '', priority: 'medium', projectManager: '',
    technology: '',
  });
  const [milestones, setMilestones] = useState([]);
  const [msInput, setMsInput] = useState({ title: '', dueDate: '' });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['client', id],
    queryFn: () => clientService.getOne(id).then(r => r.data?.data?.client || r.data?.client),
  });

  const { data: employees } = useQuery({
    queryKey: ['employees-dropdown'],
    queryFn: () => employeeService.getAll({ limit: 200 }).then(r => r.data?.data?.employees || []),
    staleTime: 60000,
    enabled: projectModal,
  });

  const { data: clientProjects } = useQuery({
    queryKey: ['projects', 'client', id],
    queryFn: () => projectService.getAll({ limit: 100 }).then(r =>
      (r.data?.data?.projects || []).filter(p => p.client?._id === id || p.client === id)
    ),
  });

  const deleteMut = useMutation({
    mutationFn: () => clientService.remove(id),
    onSuccess: () => { qc.invalidateQueries(['clients']); toast.success('Client deleted'); navigate('/clients'); },
    onError: () => toast.error('Failed to delete'),
  });

  const noteMut = useMutation({
    mutationFn: (content) => clientService.addNote(id, { content }),
    onSuccess: () => { refetch(); toast.success('Note added'); setNote(''); },
    onError: () => toast.error('Failed to add note'),
  });

  const contactMut = useMutation({
    mutationFn: (data) => clientService.addContact(id, data),
    onSuccess: () => { refetch(); toast.success('Contact added'); setContactModal(false); setContactForm({ name: '', designation: '', email: '', phone: '', isPrimary: false }); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const removeContactMut = useMutation({
    mutationFn: (contactId) => clientService.removeContact(id, contactId),
    onSuccess: () => { refetch(); toast.success('Contact removed'); },
    onError: () => toast.error('Failed to remove contact'),
  });

  const createProjectMut = useMutation({
    mutationFn: (d) => projectService.create({ ...d, client: id }),
    onSuccess: (res) => {
      qc.invalidateQueries(['projects']);
      toast.success('Project created');
      setProjectModal(false);
      setMilestones([]);
      setMsInput({ title: '', dueDate: '' });
      const pid = res.data?.data?.project?._id;
      if (pid) navigate(`/projects/${pid}`);
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to create project'),
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
    </div>
  );

  if (!data) return <div className="p-8 text-center text-slate-500">Client not found.</div>;

  return (
    <div>
      <PageHeader
        title={data.name}
        breadcrumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'Clients', href: '/clients' }, { label: data.name }]}
        actions={
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/clients')}
              className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl transition-colors modal-btn-secondary">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            {isAdmin && (
              <>
                <button onClick={() => setProjectModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors">
                  <FolderOpen className="w-4 h-4" /> Create Project
                </button>
                <button onClick={() => setDeleteOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors">
                  <RiDeleteBin6Line size={15} /> Delete
                </button>
              </>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-5">
          <div className="crm-card p-6 space-y-6">
            <h2 className="text-base font-semibold" style={{ color: 'var(--text-1)' }}>Client Information</h2>
            <div className="grid grid-cols-2 gap-5">
              <Field label="Full Name" value={data.name} />
              <Field label="Company" value={data.company} />
              <Field label="Email" value={data.email} />
              <Field label="Phone" value={data.phone} />
              <Field label="Industry" value={data.industry} />
              <Field label="Website" value={data.website} />
              <Field label="GST Number" value={data.gstNumber} />
              <Field label="Source" value={data.source?.replace(/_/g, ' ')} />
              <Field label="Address" value={
                data.address
                  ? typeof data.address === 'string' ? data.address
                    : [data.address.street, data.address.city, data.address.state, data.address.zipCode, data.address.country].filter(Boolean).join(', ')
                  : null
              } />
              <div>
                <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-3)' }}>Status</p>
                <StatusBadge status={data.status || 'active'} />
              </div>
              {data.tags?.length > 0 && (
                <div className="col-span-2">
                  <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-3)' }}>Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {data.tags.map((t, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">{t}</span>
                    ))}
                  </div>
                </div>
              )}
              <Field label="Created" value={data.createdAt ? format(new Date(data.createdAt), 'dd MMM yyyy, hh:mm a') : null} />
            </div>
          </div>

          {/* Contacts */}
          <div className="crm-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold" style={{ color: 'var(--text-1)' }}>Contact Persons ({data.contacts?.length || 0})</h2>
              {isAdmin && (
                <button onClick={() => setContactModal(true)}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                  <Plus className="w-3 h-3" /> Add Contact
                </button>
              )}
            </div>
            {data.contacts?.length ? (
              <div className="space-y-3">
                {data.contacts.map((c, i) => (
                  <div key={c._id || i} className="flex items-start justify-between p-3 rounded-xl" style={{ background: 'var(--bg-surface2)' }}>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{c.name}</p>
                        {c.isPrimary && <span className="flex items-center gap-0.5 text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full"><Star className="w-3 h-3" /> Primary</span>}
                      </div>
                      {c.designation && <p className="text-xs flex items-center gap-1" style={{ color: 'var(--text-3)' }}><Briefcase className="w-3 h-3" />{c.designation}</p>}
                      {c.email && <p className="text-xs flex items-center gap-1" style={{ color: 'var(--text-3)' }}><Mail className="w-3 h-3" />{c.email}</p>}
                      {c.phone && <p className="text-xs flex items-center gap-1" style={{ color: 'var(--text-3)' }}><Phone className="w-3 h-3" />{c.phone}</p>}
                    </div>
                    {isAdmin && (
                      <button onClick={() => removeContactMut.mutate(c._id)} className="text-red-400 hover:text-red-600 transition-colors p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm" style={{ color: 'var(--text-3)' }}>No contacts added yet.</p>
            )}
          </div>

          {/* Projects under this client */}
          <div className="crm-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold" style={{ color: 'var(--text-1)' }}>Projects ({clientProjects?.length || 0})</h2>
              {isAdmin && (
                <button onClick={() => setProjectModal(true)}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                  <Plus className="w-3 h-3" /> New Project
                </button>
              )}
            </div>
            {clientProjects?.length ? (
              <div className="space-y-2">
                {clientProjects.map(p => (
                  <div key={p._id}
                    onClick={() => navigate(`/projects/${p._id}`)}
                    className="flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors hover:bg-indigo-50"
                    style={{ background: 'var(--bg-surface2)' }}>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>{p.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
                        {p.endDate ? `Deadline: ${format(new Date(p.endDate), 'dd MMM yyyy')}` : 'No deadline'}
                      </p>
                    </div>
                    <StatusBadge status={p.status || 'planning'} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm" style={{ color: 'var(--text-3)' }}>No projects yet. Click "Create Project" to add one.</p>
            )}
          </div>
        </div>

        {/* Notes sidebar */}
        <div className="crm-card p-6 flex flex-col gap-4">
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-1)' }}>Notes</h2>
          <div className="flex flex-col gap-2">
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
              placeholder="Add a note..." className="modal-input text-sm" style={{ resize: 'none' }} />
            <button onClick={() => note.trim() && noteMut.mutate(note.trim())}
              disabled={noteMut.isPending || !note.trim()} className="modal-btn-primary text-sm py-1.5 disabled:opacity-50">
              {noteMut.isPending ? 'Adding...' : 'Add Note'}
            </button>
          </div>
          <div className="space-y-3 mt-1">
            {data.notes?.length ? data.notes.slice().reverse().map((n, i) => (
              <div key={i} className="text-sm p-3 rounded-xl" style={{ background: 'var(--bg-surface2)' }}>
                <p style={{ color: 'var(--text-1)' }}>{n.content}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>
                  {n.addedBy?.name} · {n.createdAt ? format(new Date(n.createdAt), 'dd MMM') : ''}
                </p>
              </div>
            )) : <p className="text-sm" style={{ color: 'var(--text-3)' }}>No notes yet.</p>}
          </div>
        </div>
      </div>

      {/* Add Contact Modal */}
      <Modal open={contactModal} onClose={() => setContactModal(false)} title="Add Contact Person" size="sm">
        <div className="space-y-3">
          {[
            { key: 'name', label: 'Name *', placeholder: 'Contact name' },
            { key: 'designation', label: 'Designation', placeholder: 'e.g. CEO, Manager' },
            { key: 'email', label: 'Email', placeholder: 'email@company.com', type: 'email' },
            { key: 'phone', label: 'Phone', placeholder: '10-digit number', type: 'tel' },
          ].map(f => (
            <div key={f.key}>
              <label className="modal-form-label">{f.label}</label>
              <input type={f.type || 'text'} value={contactForm[f.key]} placeholder={f.placeholder}
                onChange={e => setContactForm(p => ({ ...p, [f.key]: e.target.value }))}
                className="modal-input" />
            </div>
          ))}
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={contactForm.isPrimary}
              onChange={e => setContactForm(p => ({ ...p, isPrimary: e.target.checked }))}
              className="rounded" />
            <span className="text-sm" style={{ color: 'var(--text-2)' }}>Mark as primary contact</span>
          </label>
          <div className="flex gap-3 pt-2">
            <button onClick={() => contactMut.mutate(contactForm)} disabled={contactMut.isPending || !contactForm.name.trim()}
              className="modal-btn-primary disabled:opacity-50">
              {contactMut.isPending ? 'Adding...' : 'Add Contact'}
            </button>
            <button onClick={() => setContactModal(false)} className="modal-btn-secondary">Cancel</button>
          </div>
        </div>
      </Modal>

      {/* Create Project Modal */}
      <Modal open={projectModal} onClose={() => { setProjectModal(false); setMilestones([]); setMsInput({ title: '', dueDate: '' }); }} title={`New Project for ${data.name}`} size="xl">
        <div className="space-y-6">

          {/* Basic */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-3)' }}>Project Details</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="modal-form-label">Project Name *</label>
                <input value={projectForm.name} onChange={e => setProjectForm(p => ({ ...p, name: e.target.value }))}
                  className="modal-input" placeholder="e.g. Website Redesign" />
              </div>
              <div className="col-span-2">
                <label className="modal-form-label">Description</label>
                <textarea value={projectForm.description} onChange={e => setProjectForm(p => ({ ...p, description: e.target.value }))}
                  rows={2} className="modal-input" style={{ resize: 'none' }} placeholder="Brief project description..." />
              </div>
              <div>
                <label className="modal-form-label">Project Type</label>
                <select value={projectForm.projectType} onChange={e => setProjectForm(p => ({ ...p, projectType: e.target.value }))} className="modal-input">
                  <option value="web_development">Web Development</option>
                  <option value="mobile_app">Mobile App</option>
                  <option value="design">Design</option>
                  <option value="consulting">Consulting</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="modal-form-label">Project Status</label>
                <select value={projectForm.status} onChange={e => setProjectForm(p => ({ ...p, status: e.target.value }))} className="modal-input">
                  <option value="planning">Planning</option>
                  <option value="in_progress">In Progress</option>
                  <option value="on_hold">On Hold</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div>
                <label className="modal-form-label">Priority</label>
                <select value={projectForm.priority} onChange={e => setProjectForm(p => ({ ...p, priority: e.target.value }))} className="modal-input">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Critical</option>
                </select>
              </div>
              <div>
                <label className="modal-form-label">Project Manager *</label>
                <select value={projectForm.projectManager} onChange={e => setProjectForm(p => ({ ...p, projectManager: e.target.value }))} className="modal-input">
                  <option value="">Select manager...</option>
                  {(employees || []).map(e => <option key={e._id} value={e._id}>{e.name} — {e.designation || e.role}</option>)}
                </select>
              </div>
              <div>
                <label className="modal-form-label">Start Date *</label>
                <input type="date" value={projectForm.startDate} onChange={e => setProjectForm(p => ({ ...p, startDate: e.target.value }))} className="modal-input" />
              </div>
              <div>
                <label className="modal-form-label">End Date (Deadline) *</label>
                <input type="date" value={projectForm.endDate} onChange={e => setProjectForm(p => ({ ...p, endDate: e.target.value }))} className="modal-input" />
              </div>
              <div>
                <label className="modal-form-label">Estimated Budget (₹)</label>
                <input type="number" value={projectForm.budget} onChange={e => setProjectForm(p => ({ ...p, budget: e.target.value }))} className="modal-input" placeholder="0" />
              </div>
              <div className="col-span-2">
                <label className="modal-form-label">Technology Stack (comma separated)</label>
                <input value={projectForm.technology} onChange={e => setProjectForm(p => ({ ...p, technology: e.target.value }))}
                  className="modal-input" placeholder="React, Node.js, MongoDB, AWS..." />
              </div>
            </div>
          </div>

          {/* Milestones */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-3)' }}>Milestones (optional)</p>
            <div className="flex gap-2 mb-3">
              <input value={msInput.title} onChange={e => setMsInput(p => ({ ...p, title: e.target.value }))}
                className="modal-input flex-1" placeholder="Milestone title" />
              <input type="date" value={msInput.dueDate} onChange={e => setMsInput(p => ({ ...p, dueDate: e.target.value }))}
                className="modal-input w-40" />
              <button type="button"
                onClick={() => {
                  if (!msInput.title.trim()) return;
                  setMilestones(p => [...p, { name: msInput.title.trim(), dueDate: msInput.dueDate, status: 'pending' }]);
                  setMsInput({ title: '', dueDate: '' });
                }}
                className="px-3 py-2 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700 transition-colors whitespace-nowrap">
                + Add
              </button>
            </div>
            {milestones.length > 0 && (
              <div className="space-y-2">
                {milestones.map((m, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 rounded-lg" style={{ background: 'var(--bg-surface2)' }}>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>{m.name}</p>
                      {m.dueDate && <p className="text-xs" style={{ color: 'var(--text-3)' }}>Due: {m.dueDate}</p>}
                    </div>
                    <button onClick={() => setMilestones(p => p.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600 transition-colors p-1">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => {
                if (!projectForm.name.trim()) return toast.error('Project name is required');
                if (!projectForm.startDate) return toast.error('Start date is required');
                if (!projectForm.endDate) return toast.error('End date is required');
                if (!projectForm.projectManager) return toast.error('Project manager is required');
                createProjectMut.mutate({
                  ...projectForm,
                  budget: projectForm.budget ? Number(projectForm.budget) : undefined,
                  technology: projectForm.technology ? projectForm.technology.split(',').map(t => t.trim()).filter(Boolean) : [],
                  milestones,
                });
              }}
              disabled={createProjectMut.isPending}
              className="modal-btn-primary disabled:opacity-50">
              {createProjectMut.isPending ? 'Creating...' : 'Create Project'}
            </button>
            <button onClick={() => { setProjectModal(false); setMilestones([]); setMsInput({ title: '', dueDate: '' }); }} className="modal-btn-secondary">Cancel</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={deleteOpen} onClose={() => setDeleteOpen(false)} onConfirm={() => deleteMut.mutate()} loading={deleteMut.isPending} title="Delete this client?" message="This action cannot be undone." />
    </div>
  );
};

export default ClientDetail;
