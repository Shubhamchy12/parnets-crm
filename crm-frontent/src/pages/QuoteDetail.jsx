import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { quoteService } from '../services/quoteService';
import { invoiceService } from '../services/invoiceService';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Send, FileText, Mail, MessageCircle, Eye, FileDown } from 'lucide-react';
import { formatINR } from '../utils/currency';

const QuoteDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['quote', id],
    queryFn: () => quoteService.getOne(id).then(r => r.data?.data?.quote),
  });

  const sendMut = useMutation({
    mutationFn: () => quoteService.send(id),
    onSuccess: () => { qc.invalidateQueries(['quote', id]); toast.success('Quote marked as sent'); },
    onError: () => toast.error('Failed to send'),
  });

  const emailMut = useMutation({
    mutationFn: () => quoteService.sendEmail(id),
    onSuccess: (r) => { qc.invalidateQueries(['quote', id]); toast.success(r.data?.message || 'Sent via email'); },
    onError: (e) => toast.error(e.response?.data?.message || 'Email failed'),
  });

  const whatsappMut = useMutation({
    mutationFn: () => quoteService.sendWhatsApp(id),
    onSuccess: (r) => { qc.invalidateQueries(['quote', id]); toast.success(r.data?.message || 'Sent via WhatsApp'); },
    onError: (e) => toast.error(e.response?.data?.message || 'WhatsApp failed'),
  });

  const convertMut = useMutation({
    mutationFn: async () => {
      await quoteService.convertToInvoice(id);
      const q = data;
      const res = await invoiceService.create({
        client: q.clientId,
        clientName: q.clientName,
        project: q.project,
        items: q.items,
        subtotal: q.subtotal,
        tax: q.tax,
        total: q.total,
        budget: q.budget,
        paidAmount: q.paidAmount,
        remainingAmount: q.remainingAmount,
        notes: q.notes,
        dueDate: q.validUntil,
        fromQuote: id,
      });
      return res;
    },
    onSuccess: (res) => {
      qc.invalidateQueries(['quotes', 'invoices']);
      toast.success('Converted to invoice');
      navigate(`/invoices/${res.data?.data?.invoice?._id}`);
    },
    onError: () => toast.error('Conversion failed'),
  });

  const handlePdf = async (mode) => {
    try {
      if (mode === 'view') {
        await quoteService.viewPdf(id);
      } else {
        await quoteService.downloadPdf(id, `quote-${data?.quoteNumber || id}.pdf`);
      }
    } catch {
      toast.error('Failed to load PDF');
    }
  };

  if (isLoading) return <div className="p-8 text-slate-500 text-sm">Loading...</div>;
  if (!data) return <div className="p-8 text-slate-500 text-sm">Quote not found.</div>;

  const q = data;

  return (
    <div>
      <PageHeader
        title={q.quoteNumber || 'Quote'}
        breadcrumbs={[{ label: 'Quotes', href: '/quotes' }, { label: q.quoteNumber }]}
        actions={
          <div className="flex gap-2 flex-wrap">
            {q.status !== 'converted' && (
              <>
                <button onClick={() => sendMut.mutate()} disabled={sendMut.isPending || q.status === 'sent'}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                  <Send className="w-4 h-4" /> {q.status === 'sent' ? 'Sent' : 'Mark Sent'}
                </button>
                <button onClick={() => convertMut.mutate()} disabled={convertMut.isPending}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors">
                  <FileText className="w-4 h-4" /> Convert to Invoice
                </button>
              </>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main */}
        <div className="lg:col-span-2 space-y-5">
          <div className="crm-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-700">Quote Details</h3>
              <StatusBadge status={q.status || 'draft'} />
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-slate-500">Client</span><p className="font-medium mt-0.5">{q.clientName || q.client?.name || '—'}</p></div>
              <div><span className="text-slate-500">Project</span><p className="font-medium mt-0.5">{q.project?.name || q.project || '—'}</p></div>
              <div><span className="text-slate-500">Subject</span><p className="font-medium mt-0.5">{q.subject || '—'}</p></div>
              <div><span className="text-slate-500">Valid Until</span><p className="font-medium mt-0.5">{q.validUntil ? format(new Date(q.validUntil), 'dd MMM yyyy') : '—'}</p></div>
              <div><span className="text-slate-500">Created</span><p className="font-medium mt-0.5">{q.createdAt ? format(new Date(q.createdAt), 'dd MMM yyyy') : '—'}</p></div>
              {q.sentAt && <div><span className="text-slate-500">Sent</span><p className="font-medium mt-0.5">{format(new Date(q.sentAt), 'dd MMM yyyy')}{q.sentVia ? ` via ${q.sentVia}` : ''}</p></div>}
            </div>
          </div>

          {/* Line Items */}
          <div className="crm-card p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Line Items</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-100">
                  <th className="pb-2 font-medium">Description</th>
                  <th className="pb-2 font-medium text-right">Qty</th>
                  <th className="pb-2 font-medium text-right">Rate</th>
                  <th className="pb-2 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {(q.items || []).map((item, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    <td className="py-2">{item.description || '—'}</td>
                    <td className="py-2 text-right">{item.qty || item.quantity || 1}</td>
                    <td className="py-2 text-right">{formatINR(item.rate || 0)}</td>
                    <td className="py-2 text-right">{formatINR((item.qty || item.quantity || 1) * (item.rate || 0))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {q.notes && <p className="mt-4 text-xs text-slate-500 border-t border-slate-100 pt-3">{q.notes}</p>}
          </div>

          {/* Actions */}
          <div className="crm-card p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">Send & Download</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button onClick={() => emailMut.mutate()} disabled={emailMut.isPending}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors disabled:opacity-50">
                <Mail className="w-5 h-5 text-blue-600" />
                <span className="text-xs font-medium text-slate-700">{emailMut.isPending ? 'Sending...' : 'Send Email'}</span>
              </button>
              <button onClick={() => whatsappMut.mutate()} disabled={whatsappMut.isPending}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 hover:border-green-300 hover:bg-green-50 transition-colors disabled:opacity-50">
                <MessageCircle className="w-5 h-5 text-green-600" />
                <span className="text-xs font-medium text-slate-700">{whatsappMut.isPending ? 'Sending...' : 'WhatsApp'}</span>
              </button>
              <button onClick={() => handlePdf('view')}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors">
                <Eye className="w-5 h-5 text-indigo-600" />
                <span className="text-xs font-medium text-slate-700">View PDF</span>
              </button>
              <button onClick={() => handlePdf('download')}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors">
                <FileDown className="w-5 h-5 text-indigo-600" />
                <span className="text-xs font-medium text-slate-700">Download PDF</span>
              </button>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div>
          <div className="crm-card p-5 sticky top-4 space-y-2 text-sm">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Summary</h3>
            <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>{formatINR(q.subtotal || 0)}</span></div>
            <div className="flex justify-between text-slate-600"><span>GST</span><span>{formatINR(q.tax || 0)}</span></div>
            <div className="flex justify-between font-bold text-slate-900 text-base border-t border-slate-100 pt-2 mt-1">
              <span>Total</span><span>{formatINR(q.total || 0)}</span>
            </div>
            {q.budget > 0 && (
              <div className="border-t border-slate-100 pt-2 space-y-1">
                <div className="flex justify-between text-slate-600"><span>Budget</span><span>{formatINR(q.budget)}</span></div>
                <div className="flex justify-between text-green-600"><span>Paid</span><span>{formatINR(q.paidAmount || 0)}</span></div>
                <div className="flex justify-between text-orange-600 font-semibold"><span>Remaining</span><span>{formatINR(q.remainingAmount || 0)}</span></div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuoteDetail;
