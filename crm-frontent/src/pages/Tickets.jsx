import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ticketService } from '../services/ticketService';
import PageHeader from '../components/common/PageHeader';
import DataTable from '../components/common/DataTable';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Plus, Headphones } from 'lucide-react';
import { format } from 'date-fns';

const schema = z.object({
  subject: z.string().min(3, 'Subject required'),
  description: z.string().min(10, 'Description required'),
  priority: z.string().default('medium'),
  category: z.string().optional(),
});

const inputCls = "modal-input";

const priorityColor = { high: 'text-red-600', medium: 'text-yellow-600', low: 'text-green-600', urgent: 'text-red-700 font-bold' };

const Tickets = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const { register, handleSubmit, reset, formState: { errors } } = useForm({ resolver: zodResolver(schema) });

  const { data, isLoading } = useQuery({
    queryKey: ['tickets', statusFilter],
    queryFn: () => ticketService.getAll({ status: statusFilter }).then(r => r.data?.data?.tickets || []),
  });

  const createMut = useMutation({
    mutationFn: (d) => ticketService.create(d),
    onSuccess: () => { qc.invalidateQueries(['tickets']); toast.success('Ticket raised'); setModal(false); reset(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const columns = [
    { key: 'ticketNumber', label: '#', render: v => <span className="font-mono text-xs text-indigo-600">{v || '—'}</span> },
    { key: 'subject', label: 'Subject', render: v => <span className="font-medium text-sm" style={{ color:"var(--text-1)" }}>{v}</span> },
    { key: 'category', label: 'Category' },
    { key: 'priority', label: 'Priority', render: v => <span className={`text-xs font-semibold capitalize ${priorityColor[v] || ''}`}>{v}</span> },
    { key: 'createdAt', label: 'Created', render: v => v ? format(new Date(v), 'dd MMM yyyy') : '—' },
    { key: 'status', label: 'Status', render: v => <StatusBadge status={v || 'open'} /> },
  ];

  return (
    <div>
      <PageHeader title="Support Tickets"
        breadcrumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'Tickets' }]}
        actions={
          <button onClick={() => setModal(true)}
            className="modal-btn-primary flex items-center gap-2 px-4 py-2">
            <Plus className="w-4 h-4" /> New Ticket
          </button>
        }
      />

      <div className="crm-card p-5">
        <div className="flex gap-2 mb-5 flex-wrap">
          {['', 'open', 'in_progress', 'resolved', 'closed'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors"
              style={{
                background: statusFilter === s ? 'var(--brand)' : 'var(--bg-surface2)',
                color: statusFilter === s ? '#fff' : 'var(--text-3)',
                border: '1px solid var(--border)',
              }}>
              {s ? s.replace('_', ' ') : 'All'}
            </button>
          ))}
        </div>
        <DataTable columns={columns} data={data || []} loading={isLoading} onRowClick={row => navigate(`/tickets/${row._id}`)} />
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Raise New Ticket" subtitle="Describe your issue and we'll get on it" icon={Headphones} size="md">
        <form onSubmit={handleSubmit(d => createMut.mutate(d))} className="space-y-4">
          <div>
            <label className="modal-form-label">Subject *</label>
            <input {...register('subject')} className={`modal-input ${errors.subject ? 'modal-input-error' : ''}`} placeholder="Brief description of the issue" />
            {errors.subject && <p className="modal-error-text">{errors.subject.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="modal-form-label">Priority</label>
              <select {...register('priority')} className="modal-input">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="modal-form-label">Category</label>
              <select {...register('category')} className="modal-input">
                <option value="">Select...</option>
                {['Technical','Billing','General','Feature Request','Bug'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="modal-form-label">Description *</label>
            <textarea {...register('description')} rows={4} className={`modal-input ${errors.description ? 'modal-input-error' : ''}`} style={{ resize: 'none' }} placeholder="Describe the issue in detail..." />
            {errors.description && <p className="modal-error-text">{errors.description.message}</p>}
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={createMut.isPending} className="modal-btn-primary">
              {createMut.isPending ? 'Submitting...' : 'Submit Ticket'}
            </button>
            <button type="button" onClick={() => setModal(false)} className="modal-btn-secondary">Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Tickets;
