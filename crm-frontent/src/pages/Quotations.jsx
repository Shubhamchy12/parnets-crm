import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { quotationService } from '../services/quotationService';
import PageHeader from '../components/common/PageHeader';
import DataTable from '../components/common/DataTable';
import StatusBadge from '../components/common/StatusBadge';
import ConfirmDialog from '../components/common/ConfirmDialog';
import toast from 'react-hot-toast';
import { Plus } from 'lucide-react';
import { format } from 'date-fns';
import { formatINR } from '../utils/currency';

const Quotations = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [deleteId, setDeleteId] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['quotations'],
    queryFn: () => quotationService.getAll().then(r => r.data?.data?.quotations || []),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => quotationService.remove(id),
    onSuccess: () => { qc.invalidateQueries(['quotations']); toast.success('Deleted'); setDeleteId(null); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const columns = [
    { key: 'quotationNumber', label: 'Quotation #', render: v => <span className="font-mono text-sm font-medium text-indigo-600">{v || '—'}</span> },
    { key: 'project', label: 'Project', render: (v) => v?.name || '—' },
    { key: 'client', label: 'Client', render: (v) => v?.name || '—' },
    { key: 'grandTotal', label: 'Grand Total', render: v => v != null ? formatINR(v) : '—' },
    { key: 'validUntil', label: 'Valid Until', render: v => v ? format(new Date(v), 'dd MMM yyyy') : '—' },
    { key: 'status', label: 'Status', render: (v, row) => (
      <div className="flex items-center gap-1.5">
        <StatusBadge status={v || 'pending'} />
        {row.isSent && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Sent</span>}
      </div>
    )},
    {
      key: '_id', label: 'Actions', sortable: false, render: (v) => (
        <div className="flex items-center gap-2">
          <button onClick={e => { e.stopPropagation(); navigate(`/quotations/${v}`); }} className="text-xs text-indigo-600 hover:underline">View</button>
          <button onClick={e => { e.stopPropagation(); navigate(`/quotations/${v}/edit`); }} className="text-xs text-amber-600 hover:underline">Edit</button>
          <button onClick={e => { e.stopPropagation(); setDeleteId(v); }} className="text-xs text-red-500 hover:underline">Delete</button>
        </div>
      )
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Quotations"
        subtitle="Manage project quotations"
        actions={
          <button onClick={() => navigate('/quotations/new')} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors">
            <Plus className="w-4 h-4" /> New Quotation
          </button>
        }
      />

      <DataTable
        columns={columns}
        data={data || []}
        loading={isLoading}
        onRowClick={(row) => navigate(`/quotations/${row._id}`)}
      />

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteMut.mutate(deleteId)}
        title="Delete Quotation"
        message="This quotation will be permanently deleted."
        confirmLabel="Delete"
        loading={deleteMut.isPending}
      />
    </div>
  );
};

export default Quotations;
