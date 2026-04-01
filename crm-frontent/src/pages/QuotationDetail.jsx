import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Pencil, Trash2, Mail, MessageCircle, FileDown, Eye, ChevronLeft, CheckCircle, XCircle, Clock } from 'lucide-react';
import { quotationService } from '../services/quotationService';
import StatusBadge from '../components/common/StatusBadge';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { format } from 'date-fns';
import { formatINR } from '../utils/currency';
import { useAuth } from '../contexts/AuthContext';

const InfoRow = ({ label, value }) => (
  <div className="flex justify-between py-2.5 border-b border-slate-100 last:border-0">
    <span className="text-sm text-slate-500">{label}</span>
    <span className="text-sm font-medium text-slate-800 text-right max-w-[60%]">{value || '—'}</span>
  </div>
);

const QuotationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const isAdmin = ['admin', 'super_admin'].includes(user?.role);
  const [showDelete, setShowDelete] = useState(false);

  const { data: quotation, isLoading } = useQuery({
    queryKey: ['quotation', id],
    queryFn: () => quotationService.getOne(id).then(r => r.data?.data?.quotation),
  });

  const deleteMut = useMutation({
    mutationFn: () => quotationService.remove(id),
    onSuccess: () => { qc.invalidateQueries(['quotations']); toast.success('Deleted'); navigate('/quotations'); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const emailMut = useMutation({
    mutationFn: () => quotationService.sendEmail(id),
    onSuccess: (r) => { qc.invalidateQueries(['quotation', id]); toast.success(r.data?.message || 'Sent via email'); },
    onError: (e) => toast.error(e.response?.data?.message || 'Email failed'),
  });

  const whatsappMut = useMutation({
    mutationFn: () => quotationService.sendWhatsApp(id),
    onSuccess: (r) => {
      qc.invalidateQueries(['quotation', id]);
      const waUrl = r.data?.data?.waUrl;
      if (waUrl) window.open(waUrl, '_blank', 'noopener,noreferrer');
      toast.success('WhatsApp opened with pre-filled message');
    },
    onError: (e) => toast.error(e.response?.data?.message || 'WhatsApp failed'),
  });

  const statusMut = useMutation({
    mutationFn: (status) => quotationService.updateStatus(id, status),
    onSuccess: (r) => { qc.invalidateQueries(['quotation', id]); qc.invalidateQueries(['quotations']); toast.success(r.data?.message); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to update status'),
  });

  const handlePdf = async (mode) => {
    try {
      if (mode === 'view') {
        await quotationService.viewPdf(id);
      } else {
        await quotationService.downloadPdf(id, `quotation-${quotation?.quotationNumber || id}.pdf`);
      }
    } catch (e) {
      toast.error('Failed to load PDF');
    }
  };

  if (isLoading) return (
    <div className="p-6 space-y-4">
      {[...Array(4)].map((_, i) => <div key={i} className="h-16 rounded-2xl bg-slate-100 animate-pulse" />)}
    </div>
  );

  if (!quotation) return (
    <div className="p-6 text-center text-slate-500">Quotation not found.</div>
  );

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/quotations')} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-slate-800">{quotation.quotationNumber}</h1>
              <StatusBadge status={quotation.status} />
              {quotation.isSent && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                  Sent
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              Created {format(new Date(quotation.createdAt), 'dd MMM yyyy')}
              {quotation.sentAt && ` · Sent ${format(new Date(quotation.sentAt), 'dd MMM yyyy')} via ${quotation.sentVia}`}
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <button onClick={() => navigate(`/quotations/${id}/edit`)} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium border border-slate-300 rounded-xl hover:bg-slate-50 text-slate-700 transition-colors">
            <Pencil className="w-3.5 h-3.5" /> Edit
          </button>
          <button onClick={() => setShowDelete(true)} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium border border-red-200 rounded-xl hover:bg-red-50 text-red-600 transition-colors">
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
        </div>
      </div>

      {/* Project & Client */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Project</p>
          <p className="font-semibold text-slate-800">{quotation.project?.name || '—'}</p>
          <p className="text-xs text-slate-500 mt-1">{quotation.project?.status || ''}</p>
          {quotation.validUntil && <p className="text-xs text-slate-500 mt-1">Valid until: {format(new Date(quotation.validUntil), 'dd MMM yyyy')}</p>}
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Client</p>
          <p className="font-semibold text-slate-800">{quotation.client?.name || '—'}</p>
          <p className="text-xs text-slate-500 mt-0.5">{quotation.client?.company}</p>
          <p className="text-xs text-slate-500">{quotation.client?.email}</p>
          <p className="text-xs text-slate-500">{quotation.client?.phone}</p>
        </div>
      </div>

      {/* Tax & Grand Total */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Total Breakdown</p>
        <InfoRow label="Development Budget" value={formatINR(quotation.developmentBudget)} />
        {quotation.services?.map((s, i) => (
          <InfoRow key={i} label={s.serviceName} value={formatINR(s.amount)} />
        ))}
        <InfoRow label="Subtotal" value={formatINR(quotation.subtotal ?? (quotation.developmentBudget + (quotation.servicesTotal || 0)))} />
        <InfoRow label="CGST (9%)" value={formatINR(quotation.cgst ?? 0)} />
        <InfoRow label="SGST (9%)" value={formatINR(quotation.sgst ?? 0)} />
      </div>

      <div className="bg-indigo-600 rounded-2xl p-5 flex justify-between items-center">
        <span className="text-white font-semibold">Grand Total (incl. GST)</span>
        <span className="text-white text-xl font-bold">{formatINR(quotation.grandTotal)}</span>
      </div>

      {/* Notes */}
      {quotation.notes && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Notes</p>
          <p className="text-sm text-slate-700 leading-relaxed">{quotation.notes}</p>
        </div>
      )}

      {/* Payment Terms */}
      {quotation.paymentTerms && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Payment Terms</p>
          <div className="space-y-2">
            {quotation.paymentTerms.split('\n').filter(Boolean).map((line, i) => (
              <div key={i} className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <p className="text-sm text-slate-700">{line}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PDF Actions */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">PDF</p>
        <div className="flex gap-3">
          <button onClick={() => handlePdf('view')}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors">
            View PDF
          </button>
          <button onClick={() => handlePdf('download')}
            className="flex items-center gap-2 px-4 py-2 border border-indigo-300 hover:bg-indigo-50 text-indigo-700 text-sm font-semibold rounded-xl transition-colors">
            Download PDF
          </button>
        </div>
      </div>

      {/* Admin Status Control */}
      {isAdmin && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">Approval Status</p>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">Current:</span>
              <StatusBadge status={quotation.status} />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => statusMut.mutate('pending')}
                disabled={statusMut.isPending || quotation.status === 'pending'}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl border border-yellow-300 bg-yellow-50 text-yellow-700 hover:bg-yellow-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Clock className="w-3.5 h-3.5" /> Pending
              </button>
              <button
                onClick={() => statusMut.mutate('approved')}
                disabled={statusMut.isPending || quotation.status === 'approved'}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl border border-green-300 bg-green-50 text-green-700 hover:bg-green-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <CheckCircle className="w-3.5 h-3.5" /> Approve
              </button>
              <button
                onClick={() => statusMut.mutate('rejected')}
                disabled={statusMut.isPending || quotation.status === 'rejected'}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl border border-red-300 bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <XCircle className="w-3.5 h-3.5" /> Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">Actions</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => emailMut.mutate()}
            disabled={emailMut.isPending}
            className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors disabled:opacity-50"
          >
            <Mail className="w-5 h-5 text-blue-600" />
            <span className="text-xs font-medium text-slate-700">{emailMut.isPending ? 'Sending...' : 'Send Email'}</span>
          </button>
          <button
            onClick={() => whatsappMut.mutate()}
            disabled={whatsappMut.isPending}
            className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 hover:border-green-300 hover:bg-green-50 transition-colors disabled:opacity-50"
          >
            <MessageCircle className="w-5 h-5 text-green-600" />
            <span className="text-xs font-medium text-slate-700">{whatsappMut.isPending ? 'Sending...' : 'WhatsApp'}</span>
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={() => deleteMut.mutate()}
        title="Delete Quotation"
        message="This quotation will be permanently deleted."
        confirmLabel="Delete"
        loading={deleteMut.isPending}
      />
    </div>
  );
};

export default QuotationDetail;
