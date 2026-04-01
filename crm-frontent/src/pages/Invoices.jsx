import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { invoiceService } from '../services/invoiceService';
import PageHeader from '../components/common/PageHeader';
import DataTable from '../components/common/DataTable';
import StatusBadge from '../components/common/StatusBadge';
import ConfirmDialog from '../components/common/ConfirmDialog';
import toast from 'react-hot-toast';
import { Plus, FileDown } from 'lucide-react';
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
    { key: 'invoiceNumber', label: 'Invoice #', render: (v, row) => (
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm font-medium text-indigo-600">{v || '—'}</span>
        {row.hasInstallmentPlan && (
          <span className="inline-block px-1.5 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded">
            Installments
          </span>
        )}
        {row.installmentLabel && (
          <span className="inline-block px-1.5 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded">
            {row.installmentLabel}
          </span>
        )}
      </div>
    )},
    { key: 'client', label: 'Client', render: (v, row) => row.clientName || row.client?.name || '—' },
    { key: 'total', label: 'Invoice Amount', render: v => <span className="font-semibold">{v ? formatINR(v) : '—'}</span> },
    { key: 'paidAmount', label: 'Paid', render: (v, row) => {
      const paid = (row.payments || []).reduce((s, p) => s + (p.amount || 0), 0);
      return <span className="text-green-600 font-medium">{formatINR(paid)}</span>;
    }},
    { key: 'remainingAmount', label: 'Due', render: (v, row) => {
      const paid = (row.payments || []).reduce((s, p) => s + (p.amount || 0), 0);
      const remaining = Math.max(0, (row.total || 0) - paid);
      return <span className={`font-semibold ${remaining > 0 ? 'text-orange-600' : 'text-green-600'}`}>
        {formatINR(remaining)}
      </span>;
    }},
    { key: 'dueDate', label: 'Due Date', render: (v, row) => {
      if (!v) return '—';
      const dueDate = new Date(v);
      const isOverdue = dueDate < new Date() && row.status !== 'paid';
      return (
        <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
          {format(dueDate, 'dd MMM yyyy')}
          {isOverdue && ' ⚠️'}
        </span>
      );
    }},
    { key: 'status', label: 'Status', render: v => <StatusBadge status={v || 'draft'} /> },
    { key: '_id', label: 'Actions', sortable: false, render: (v, row) => (
      <div className="flex gap-2">
        <button onClick={e => { e.stopPropagation(); navigate(`/invoices/${v}`); }} className="text-xs text-indigo-600 hover:underline">View</button>
        <button onClick={e => { e.stopPropagation(); sendMut.mutate(v); }} className="text-xs text-green-600 hover:underline">Send</button>
        <button
          onClick={e => {
            e.stopPropagation();
            invoiceService.downloadPdf(v, `invoice-${row.invoiceNumber || v}.pdf`).catch(() => toast.error('PDF failed'));
          }}
          className="text-xs text-emerald-600 hover:underline"
        >
          PDF
        </button>
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
        {/* Summary Cards */}
        {data && data.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">
            <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
              <p className="text-xs text-blue-600 font-medium mb-1">Total Invoices</p>
              <p className="text-2xl font-bold text-blue-900">{data.length}</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200">
              <p className="text-xs text-green-600 font-medium mb-1">Paid</p>
              <p className="text-2xl font-bold text-green-900">
                {data.filter(inv => inv.status === 'paid').length}
              </p>
            </div>
            <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200">
              <p className="text-xs text-amber-600 font-medium mb-1">Pending</p>
              <p className="text-2xl font-bold text-amber-900">
                {data.filter(inv => inv.status === 'sent' || inv.status === 'partial' || inv.status === 'draft').length}
              </p>
            </div>
            <div className="p-4 bg-gradient-to-br from-red-50 to-rose-50 rounded-xl border border-red-200">
              <p className="text-xs text-red-600 font-medium mb-1">Overdue ⚠️</p>
              <p className="text-2xl font-bold text-red-900">
                {data.filter(inv => {
                  if (!inv.dueDate || inv.status === 'paid') return false;
                  return new Date(inv.dueDate) < new Date();
                }).length}
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-2 mb-5 flex-wrap">
          {['', 'draft', 'sent', 'paid', 'partial', 'overdue'].map(s => (
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
