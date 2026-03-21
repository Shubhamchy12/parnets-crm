import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { quoteService } from '../services/quoteService';
import PageHeader from '../components/common/PageHeader';
import DataTable from '../components/common/DataTable';
import StatusBadge from '../components/common/StatusBadge';
import ConfirmDialog from '../components/common/ConfirmDialog';
import toast from 'react-hot-toast';
import { Plus, Send, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { formatINR } from '../utils/currency';

const Quotes = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [deleteId, setDeleteId] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['quotes'],
    queryFn: () => quoteService.getAll().then(r => r.data?.data?.quotes || []),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => quoteService.remove(id),
    onSuccess: () => { qc.invalidateQueries(['quotes']); toast.success('Deleted'); setDeleteId(null); },
  });

  const sendMut = useMutation({
    mutationFn: (id) => quoteService.send(id),
    onSuccess: () => { qc.invalidateQueries(['quotes']); toast.success('Quote sent'); },
    onError: () => toast.error('Failed to send'),
  });

  const columns = [
    { key: 'quoteNumber', label: 'Quote #', render: v => <span className="font-mono text-sm font-medium text-indigo-600">{v || '—'}</span> },
    { key: 'client', label: 'Client', render: (v, row) => row.clientName || row.client?.name || '—' },
    { key: 'total', label: 'Total', render: v => v ? formatINR(v) : '—' },
    { key: 'validUntil', label: 'Valid Until', render: v => v ? format(new Date(v), 'dd MMM yyyy') : '—' },
    { key: 'status', label: 'Status', render: v => <StatusBadge status={v || 'draft'} /> },
    { key: '_id', label: 'Actions', sortable: false, render: (v, row) => (
      <div className="flex items-center gap-2">
        <button onClick={e => { e.stopPropagation(); navigate(`/quotes/${v}`); }} className="text-xs text-indigo-600 hover:underline">View</button>
        <button onClick={e => { e.stopPropagation(); sendMut.mutate(v); }} className="text-xs text-green-600 hover:underline">Send</button>
        <button onClick={e => { e.stopPropagation(); setDeleteId(v); }} className="text-xs text-red-500 hover:underline">Delete</button>
      </div>
    )},
  ];

  return (
    <div>
      <PageHeader title="Quotes"
        breadcrumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'Quotes' }]}
        actions={
          <button onClick={() => navigate('/quotes/new')}
            className="modal-btn-primary flex items-center gap-2 px-4 py-2">
            <Plus className="w-4 h-4" /> New Quote
          </button>
        }
      />
      <div className="crm-card p-5">
        <DataTable columns={columns} data={data || []} loading={isLoading} onRowClick={row => navigate(`/quotes/${row._id}`)} />
      </div>
      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteMut.mutate(deleteId)} loading={deleteMut.isPending} title="Delete Quote?" />
    </div>
  );
};

export default Quotes;
