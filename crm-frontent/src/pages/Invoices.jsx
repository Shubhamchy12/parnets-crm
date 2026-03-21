import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { invoiceService } from '../services/invoiceService';
import PageHeader from '../components/common/PageHeader';
import DataTable from '../components/common/DataTable';
import StatusBadge from '../components/common/StatusBadge';
import ConfirmDialog from '../components/common/ConfirmDialog';
import toast from 'react-hot-toast';
import { Plus } from 'lucide-react';
import { format } from 'date-fns';
import { formatINR } from '../utils/currency';

const Invoices = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [deleteId, setDeleteId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', statusFilter],
    queryFn: () => invoiceService.getAll({ status: statusFilter }).then(r => r.data?.data?.invoices || []),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => invoiceService.remove(id),
    onSuccess: () => { qc.invalidateQueries(['invoices']); toast.success('Deleted'); setDeleteId(null); },
  });

  const sendMut = useMutation({
    mutationFn: (id) => invoiceService.send(id),
    onSuccess: () => { qc.invalidateQueries(['invoices']); toast.success('Invoice sent'); },
    onError: () => toast.error('Failed to send'),
  });

  const columns = [
    { key: 'invoiceNumber', label: 'Invoice #', render: v => <span className="font-mono text-sm font-medium text-indigo-600">{v || '—'}</span> },
    { key: 'client', label: 'Client', render: (v, row) => row.clientName || row.client?.name || '—' },
    { key: 'budget', label: 'Budget', render: v => v ? formatINR(v) : '—' },
    { key: 'paidAmount', label: 'Paid', render: v => <span className="text-green-600">{v ? formatINR(v) : '—'}</span> },
    { key: 'remainingAmount', label: 'Remaining', render: v => <span className="text-orange-600 font-medium">{v ? formatINR(v) : '—'}</span> },
    { key: 'total', label: 'Invoice Amt', render: v => v ? formatINR(v) : '—' },
    { key: 'dueDate', label: 'Due Date', render: v => v ? format(new Date(v), 'dd MMM yyyy') : '—' },
    { key: 'status', label: 'Status', render: v => <StatusBadge status={v || 'draft'} /> },
    { key: '_id', label: 'Actions', sortable: false, render: (v) => (
      <div className="flex gap-2">
        <button onClick={e => { e.stopPropagation(); navigate(`/invoices/${v}`); }} className="text-xs text-indigo-600 hover:underline">View</button>
        <button onClick={e => { e.stopPropagation(); sendMut.mutate(v); }} className="text-xs text-green-600 hover:underline">Send</button>
        <button onClick={e => { e.stopPropagation(); setDeleteId(v); }} className="text-xs text-red-500 hover:underline">Delete</button>
      </div>
    )},
  ];

  return (
    <div>
      <PageHeader title="Invoices"
        breadcrumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'Invoices' }]}
        actions={
          <button onClick={() => navigate('/invoices/new')}
            className="modal-btn-primary flex items-center gap-2 px-4 py-2">
            <Plus className="w-4 h-4" /> New Invoice
          </button>
        }
      />

      <div className="crm-card p-5">
        <div className="flex gap-2 mb-5 flex-wrap">
          {['', 'draft', 'sent', 'paid', 'overdue'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors capitalize ${statusFilter === s ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {s || 'All'}
            </button>
          ))}
        </div>
        <DataTable columns={columns} data={data || []} loading={isLoading} onRowClick={row => navigate(`/invoices/${row._id}`)} />
      </div>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteMut.mutate(deleteId)} loading={deleteMut.isPending} title="Delete Invoice?" />
    </div>
  );
};

export default Invoices;
