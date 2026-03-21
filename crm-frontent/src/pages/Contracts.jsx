import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { contractService } from '../services/contractService';
import PageHeader from '../components/common/PageHeader';
import DataTable from '../components/common/DataTable';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Plus, FileSignature } from 'lucide-react';
import { format } from 'date-fns';
import { formatINR } from '../utils/currency';

const Contracts = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const { register, handleSubmit, reset } = useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['contracts'],
    queryFn: () => contractService.getAll().then(r => r.data?.data?.contracts || []),
  });

  const createMut = useMutation({
    mutationFn: (d) => contractService.create(d),
    onSuccess: () => { qc.invalidateQueries(['contracts']); toast.success('Contract created'); setModal(false); reset(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => contractService.remove(id),
    onSuccess: () => { qc.invalidateQueries(['contracts']); toast.success('Deleted'); setDeleteId(null); },
  });

  const columns = [
    { key: 'title', label: 'Title', render: v => <span className="font-medium" style={{ color: "var(--text-primary)" }}>{v}</span> },
    { key: 'client', label: 'Client', render: (v, row) => row.client?.name || '—' },
    { key: 'startDate', label: 'Start', render: v => v ? format(new Date(v), 'dd MMM yyyy') : '—' },
    { key: 'endDate', label: 'End', render: v => v ? format(new Date(v), 'dd MMM yyyy') : '—' },
    { key: 'value', label: 'Value', render: v => v ? formatINR(v) : '—' },
    { key: 'status', label: 'Status', render: v => <StatusBadge status={v || 'draft'} /> },
    { key: '_id', label: 'Actions', sortable: false, render: (v) => (
      <div className="flex gap-2">
        <button onClick={e => { e.stopPropagation(); navigate(`/contracts/${v}`); }} className="text-xs text-indigo-600 hover:underline">View</button>
        <button onClick={e => { e.stopPropagation(); setDeleteId(v); }} className="text-xs text-red-500 hover:underline">Delete</button>
      </div>
    )},
  ];

  return (
    <div>
      <PageHeader title="Contracts"
        breadcrumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'Contracts' }]}
        actions={
          <button onClick={() => setModal(true)}
            className="modal-btn-primary flex items-center gap-2 px-4 py-2">
            <Plus className="w-4 h-4" /> New Contract
          </button>
        }
      />
      <div className="crm-card p-5">
        <DataTable columns={columns} data={data || []} loading={isLoading} onRowClick={row => navigate(`/contracts/${row._id}`)} />
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="New Contract" subtitle="Create a new client contract" icon={FileSignature} size="md">
        <form onSubmit={handleSubmit(d => createMut.mutate(d))} className="space-y-4">
          {[
            { name: 'title', label: 'Title *' },
            { name: 'value', label: 'Value (₹)', type: 'number' },
            { name: 'startDate', label: 'Start Date', type: 'date' },
            { name: 'endDate', label: 'End Date', type: 'date' },
          ].map(f => (
            <div key={f.name}>
              <label className="modal-form-label">{f.label}</label>
              <input {...register(f.name)} type={f.type || 'text'} className="modal-input" />
            </div>
          ))}
          <div>
            <label className="modal-form-label">Terms</label>
            <textarea {...register('terms')} rows={4} className="modal-input" placeholder="Contract terms and conditions..." />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={createMut.isPending}
              className="modal-btn-primary">
              {createMut.isPending ? 'Creating...' : 'Create Contract'}
            </button>
            <button type="button" onClick={() => setModal(false)}
              className="modal-btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      </Modal>
      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteMut.mutate(deleteId)} loading={deleteMut.isPending} title="Delete Contract?" />
    </div>
  );
};

export default Contracts;
