import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leadService } from '../services/leadService';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import ConfirmDialog from '../components/common/ConfirmDialog';
import toast from 'react-hot-toast';
import { ArrowLeft, Printer } from 'lucide-react';
import { RiDeleteBin6Line } from 'react-icons/ri';
import { MdEdit } from 'react-icons/md';
import { format } from 'date-fns';
import { formatINR } from '../utils/currency';

const Field = ({ label, value }) => {
  const display = value === null || value === undefined
    ? '—'
    : typeof value === 'object'
      ? Object.values(value).filter(v => v && typeof v === 'string').join(', ') || '—'
      : String(value) || '—';
  return (
    <div>
      <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-3)' }}>{label}</p>
      <p className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>{display}</p>
    </div>
  );
};

const LeadDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editStage, setEditStage] = useState(false);
  const [stage, setStage] = useState('');
  const [isPrinting, setIsPrinting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['lead', id],
    queryFn: () => leadService.getOne(id).then(r => {
      const lead = r.data?.data?.lead || r.data?.lead;
      setStage(lead?.stage || 'new');
      return lead;
    }),
  });

  const deleteMut = useMutation({
    mutationFn: () => leadService.remove(id),
    onSuccess: () => { qc.invalidateQueries(['leads']); toast.success('Lead deleted'); navigate('/leads'); },
    onError: () => toast.error('Failed to delete'),
  });

  const stageMut = useMutation({
    mutationFn: (s) => leadService.updateStage(id, { stage: s }),
    onSuccess: () => { qc.invalidateQueries(['lead', id]); qc.invalidateQueries(['leads']); toast.success('Stage updated'); setEditStage(false); },
    onError: () => toast.error('Failed to update stage'),
  });

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 100);
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
    </div>
  );

  if (!data) return <div className="p-8 text-center text-slate-500">Lead not found.</div>;

  return (
    <>
      {/* Print Styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #printable-lead-area, #printable-lead-area * { visibility: visible; }
          #printable-lead-area { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
          .crm-card { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>

      <div>
      <PageHeader
        title={data.name}
        breadcrumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'Leads', href: '/leads' }, { label: data.name }]}
        actions={
          <div className="flex items-center gap-2 flex-wrap no-print">
            <button onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors">
              <Printer className="w-4 h-4" /> Print
            </button>
            <button onClick={() => navigate('/leads')}
              className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl transition-colors modal-btn-secondary">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button onClick={() => setDeleteOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors">
              <RiDeleteBin6Line size={15} /> Delete
            </button>
          </div>
        }
      />

      {/* Printable Area */}
      <div id="printable-lead-area">
        {/* Print Header - Only visible when printing */}
        {isPrinting && (
          <div className="mb-8 pb-6 border-b-2 border-gray-300">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Lead Report</h1>
                <p className="text-lg text-gray-600 mb-4">{data.name}</p>
                <div className="text-sm text-gray-500">
                  Generated on: {format(new Date(), 'dd MMM yyyy, hh:mm a')}
                </div>
              </div>
              <div className="text-right">
                <div className="mb-3">
                  <img 
                    src="/logo.jpg" 
                    alt="ParNets Logo" 
                    className="h-16 ml-auto"
                  />
                </div>
                <div className="text-sm text-gray-600">
                  <div className="font-bold text-lg text-gray-900 mb-2">ParNets Software India Pvt Ltd</div>
                  <div className="leading-relaxed">
                    <div>So104/1/50, Singapura Main Rd,</div>
                    <div>Singapura Village, Varadharaja Nagar,</div>
                    <div>Vidyaranyapura, Bengaluru,</div>
                    <div>Karnataka 560097</div>
                    <div className="mt-2 font-medium">GST: 29AANCP7155K1ZN</div>
                    <div className="font-medium">Contact: 095909 26068</div>
                    <div className="text-indigo-600">hello@parnetsgroup.com</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main info */}
        <div className="lg:col-span-2 crm-card p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold" style={{ color: 'var(--text-1)' }}>Lead Information</h2>
            <div className="flex items-center gap-2 no-print">
              {editStage ? (
                <>
                  <select value={stage} onChange={e => setStage(e.target.value)} className="modal-input text-xs py-1 px-2 h-auto">
                    {['new','contacted','qualified','proposal','won','lost'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button onClick={() => stageMut.mutate(stage)} disabled={stageMut.isPending}
                    className="px-3 py-1 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                    Save
                  </button>
                  <button onClick={() => setEditStage(false)} className="px-3 py-1 text-xs modal-btn-secondary rounded-lg">Cancel</button>
                </>
              ) : (
                <button onClick={() => setEditStage(true)}
                  className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg transition-colors"
                  style={{ background: 'var(--bg-surface2)', color: 'var(--text-3)' }}>
                  <MdEdit size={13} /> Edit Stage
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <Field label="Full Name" value={data.name} />
            <Field label="Company" value={data.company} />
            <Field label="Email" value={data.email} />
            <Field label="Phone" value={data.phone} />
            <Field label="Source" value={data.source} />
            <Field label="Deal Value" value={data.value ? formatINR(data.value) : null} />
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-3)' }}>Stage</p>
              <StatusBadge status={data.stage || 'new'} />
            </div>
            <Field label="Created" value={data.createdAt ? format(new Date(data.createdAt), 'dd MMM yyyy, hh:mm a') : null} />
          </div>
        </div>

        {/* Activity sidebar */}
        <div className="crm-card p-6">
          <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--text-1)' }}>Activities</h2>
          {data.activities?.length ? (
            <ul className="space-y-3">
              {data.activities.map(a => (
                <li key={a._id} className="text-sm p-3 rounded-xl" style={{ background: 'var(--bg-surface2)' }}>
                  <p style={{ color: 'var(--text-1)' }}>{a.note}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>
                    {a.by?.name} · {a.createdAt ? format(new Date(a.createdAt), 'dd MMM') : ''}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm" style={{ color: 'var(--text-3)' }}>No activities yet.</p>
          )}
        </div>
      </div>
      </div> {/* End printable-area */}

      <ConfirmDialog open={deleteOpen} onClose={() => setDeleteOpen(false)} onConfirm={() => deleteMut.mutate()} loading={deleteMut.isPending} title="Delete this lead?" message="This action cannot be undone." />
    </div>
    </>
  );
};

export default LeadDetail;
