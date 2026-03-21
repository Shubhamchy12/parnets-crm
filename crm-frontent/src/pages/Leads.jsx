import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { leadService } from '../services/leadService';
import PageHeader from '../components/common/PageHeader';
import KanbanBoard from '../components/common/KanbanBoard';
import DataTable from '../components/common/DataTable';
import StatusBadge from '../components/common/StatusBadge';
import StatsCard from '../components/common/StatsCard';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Plus, LayoutGrid, List, Target, Users, TrendingUp, CheckCircle, XCircle, DollarSign } from 'lucide-react';
import { formatINR } from '../utils/currency';
import { MdOutlineRemoveRedEye } from 'react-icons/md';
import { RiDeleteBin6Line } from 'react-icons/ri';

const STAGES = [
  { id: 'new', title: 'New', color: 'bg-blue-400' },
  { id: 'contacted', title: 'Contacted', color: 'bg-yellow-400' },
  { id: 'qualified', title: 'Qualified', color: 'bg-orange-400' },
  { id: 'proposal', title: 'Proposal', color: 'bg-purple-400' },
  { id: 'won', title: 'Won', color: 'bg-green-500' },
  { id: 'lost', title: 'Lost', color: 'bg-red-400' },
];

const schema = z.object({
  name: z.string().min(2, 'Name required'),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  company: z.string().optional(),
  source: z.string().optional(),
  value: z.coerce.number().optional(),
  stage: z.string().default('new'),
});

const inputCls = "modal-input";

const Leads = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [view, setView] = useState('list');
  const [modal, setModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const { register, handleSubmit, reset, formState: { errors } } = useForm({ resolver: zodResolver(schema) });

  const { data, isLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: () => leadService.getAll().then(r => r.data?.data?.leads || r.data?.leads || []),
  });

  const createMut = useMutation({
    mutationFn: (d) => leadService.create(d),
    onMutate: async (newLead) => {
      await qc.cancelQueries({ queryKey: ['leads'] });
      const prev = qc.getQueryData(['leads']);
      qc.setQueryData(['leads'], (old = []) => [
        ...old,
        { _id: `temp-${Date.now()}`, ...newLead, stage: newLead.stage || 'new', createdAt: new Date().toISOString() }
      ]);
      return { prev };
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leads'] }); toast.success('Lead created'); setModal(false); reset(); },
    onError: (e, _, ctx) => { if (ctx?.prev) qc.setQueryData(['leads'], ctx.prev); toast.error(e.response?.data?.message || 'Failed'); },
  });

  const deleteMut = useMutation({
    mutationFn: (id) => leadService.remove(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['leads'] });
      const prev = qc.getQueryData(['leads']);
      qc.setQueryData(['leads'], (old = []) => old.filter(l => l._id !== id));
      return { prev };
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leads'] }); toast.success('Lead deleted'); setDeleteId(null); },
    onError: (e, _, ctx) => { if (ctx?.prev) qc.setQueryData(['leads'], ctx.prev); toast.error('Failed to delete'); },
  });

  const leads = data || [];
  const kanbanCols = STAGES.map(s => ({ ...s, items: leads.filter(l => (l.stage || 'new') === s.id) }));

  // Stats
  const total = leads.length;
  const newLeads = leads.filter(l => (l.stage || 'new') === 'new').length;
  const inProgress = leads.filter(l => ['contacted', 'qualified', 'proposal'].includes(l.stage)).length;
  const won = leads.filter(l => l.stage === 'won').length;
  const lost = leads.filter(l => l.stage === 'lost').length;
  const pipeline = leads.filter(l => l.stage !== 'lost').reduce((s, l) => s + (Number(l.value) || 0), 0);

  const stageMut = useMutation({
    mutationFn: ({ id, stage }) => leadService.updateStage(id, { stage }),
    onSuccess: () => qc.invalidateQueries(['leads']),
  });

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const targetCol = kanbanCols.find(c => c.items.some(i => (i._id || i.id) === over.id));
    if (targetCol) stageMut.mutate({ id: active.id, stage: targetCol.id });
  };

  const columns = [
    { key: 'name', label: 'Name', render: (v) => <span className="font-semibold" style={{ color: 'var(--text-1)' }}>{v}</span> },
    { key: 'company', label: 'Company' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'source', label: 'Source' },
    { key: 'value', label: 'Deal Value', render: v => v ? formatINR(v) : '—' },
    { key: 'stage', label: 'Stage', render: v => <StatusBadge status={v || 'new'} /> },
    {
      key: '_id', label: 'Actions', sortable: false, render: (v) => (
        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
          <button title="View" onClick={() => navigate(`/leads/${v}`)}
            className="p-1.5 rounded-lg transition-colors hover:bg-indigo-50 text-indigo-600">
            <MdOutlineRemoveRedEye size={17} />
          </button>
          <button title="Delete" onClick={() => setDeleteId(v)}
            className="p-1.5 rounded-lg transition-colors hover:bg-red-50 text-red-500">
            <RiDeleteBin6Line size={16} />
          </button>
        </div>
      )
    },
  ];

  return (
    <div>
      <PageHeader title="Leads"
        breadcrumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'Leads' }]}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex rounded-xl overflow-hidden" style={{ border: '1.5px solid var(--border)' }}>
              {[{ v: 'list', Icon: List }, { v: 'kanban', Icon: LayoutGrid }].map(({ v, Icon }) => (
                <button key={v} onClick={() => setView(v)}
                  className="px-3 py-2 transition-colors"
                  style={{
                    background: view === v ? 'var(--brand)' : 'transparent',
                    color: view === v ? '#fff' : 'var(--text-3)',
                  }}>
                  <Icon className="w-4 h-4" />
                </button>
              ))}
            </div>
            <button onClick={() => setModal(true)} className="modal-btn-primary flex items-center gap-2 px-4 py-2">
              <Plus className="w-4 h-4" /> New Lead
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-5">
        <StatsCard title="Total Leads" value={total} icon={Users} color="bg-indigo-500" />
        <StatsCard title="New" value={newLeads} icon={Target} color="bg-blue-500" />
        <StatsCard title="In Progress" value={inProgress} icon={TrendingUp} color="bg-orange-500" />
        <StatsCard title="Won" value={won} icon={CheckCircle} color="bg-green-500" />
        <StatsCard title="Lost" value={lost} icon={XCircle} color="bg-red-500" />
        <StatsCard title="Pipeline" value={`${formatINR(pipeline / 1000)}k`} icon={DollarSign} color="bg-purple-500" sub="excl. lost" />
      </div>

      {view === 'list' ? (
        <div className="crm-card p-5">
          <DataTable columns={columns} data={leads} loading={isLoading} onRowClick={row => navigate(`/leads/${row._id}`)} />
        </div>
      ) : (
        <KanbanBoard columns={kanbanCols} onDragEnd={handleDragEnd}
          renderCard={(item) => (
            <div
              onClick={() => navigate(`/leads/${item._id}`)}
              className="rounded-xl p-3 cursor-pointer transition-all"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-xs)'; e.currentTarget.style.transform = 'none'; }}
            >
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-1)' }}>{item.name}</p>
              {item.company && <p className="text-xs mb-1.5" style={{ color: 'var(--text-3)' }}>{item.company}</p>}
              {item.value && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.12)', color: 'var(--success)' }}>
                  {formatINR(item.value)}
                </span>
              )}
            </div>
          )}
        />
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="New Lead" subtitle="Capture a new sales lead" icon={Target} size="md">
        <form onSubmit={handleSubmit(d => createMut.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {[
              { name: 'name', label: 'Full Name *' },
              { name: 'company', label: 'Company' },
              { name: 'email', label: 'Email', type: 'email' },
              { name: 'phone', label: 'Phone' },
              { name: 'value', label: 'Deal Value (₹)', type: 'number' },
            ].map(f => (
              <div key={f.name}>
                <label className="modal-form-label">{f.label}</label>
                <input {...register(f.name)} type={f.type || 'text'} className={`modal-input ${errors[f.name] ? 'modal-input-error' : ''}`} />
                {errors[f.name] && <p className="modal-error-text">{errors[f.name].message}</p>}
              </div>
            ))}
            <div>
              <label className="modal-form-label">Source</label>
              <select {...register('source')} className="modal-input">
                <option value="">Select source...</option>
                {['Website','Referral','Cold Call','Email','Social Media','Event','Other'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={createMut.isPending} className="modal-btn-primary">
              {createMut.isPending ? 'Creating...' : 'Create Lead'}
            </button>
            <button type="button" onClick={() => setModal(false)} className="modal-btn-secondary">Cancel</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteMut.mutate(deleteId)} loading={deleteMut.isPending} title="Delete Lead?" />
    </div>
  );
};

export default Leads;
