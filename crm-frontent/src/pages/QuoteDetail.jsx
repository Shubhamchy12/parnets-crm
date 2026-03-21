import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { quoteService } from '../services/quoteService';
import { invoiceService } from '../services/invoiceService';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Send, FileText } from 'lucide-react';

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
    onSuccess: () => { qc.invalidateQueries(['quote', id]); toast.success('Quote sent'); },
    onError: () => toast.error('Failed to send'),
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

  if (isLoading) return <div className="p-8 text-slate-500 text-sm">Loading...</div>;
  if (!data) return <div className="p-8 text-slate-500 text-sm">Quote not found.</div>;

  const q = data;

  return (
    <div>
      <PageHeader
        title={q.quoteNumber || 'Quote'}
        breadcrumbs={[{ label: 'Quotes', href: '/quotes' }, { label: q.quoteNumber }]}
        actions={
          <div className="flex gap-2">
            {q.status !== 'converted' && (
              <>
                <button onClick={() => sendMut.mutate()} disabled={sendMut.isPending || q.status === 'sent'}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                  <Send className="w-4 h-4" /> {q.status === 'sent' ? 'Sent' : 'Send'}
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
                    <td className="py-2 text-right">₹{Number(item.rate || 0).toLocaleString()}</td>
                    <td className="py-2 text-right">₹{((item.qty || item.quantity || 1) * (item.rate || 0)).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {q.notes && <p className="mt-4 text-xs text-slate-500 border-t border-slate-100 pt-3">{q.notes}</p>}
          </div>
        </div>

        {/* Summary */}
        <div>
          <div className="crm-card p-5 sticky top-4 space-y-2 text-sm">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Summary</h3>
            <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>₹{Number(q.subtotal || 0).toLocaleString()}</span></div>
            <div className="flex justify-between text-slate-600"><span>GST</span><span>₹{Number(q.tax || 0).toLocaleString()}</span></div>
            <div className="flex justify-between font-bold text-slate-900 text-base border-t border-slate-100 pt-2 mt-1">
              <span>Total</span><span>₹{Number(q.total || 0).toLocaleString()}</span>
            </div>
            {q.budget > 0 && (
              <div className="border-t border-slate-100 pt-2 space-y-1">
                <div className="flex justify-between text-slate-600"><span>Budget</span><span>₹{Number(q.budget).toLocaleString()}</span></div>
                <div className="flex justify-between text-green-600"><span>Paid</span><span>₹{Number(q.paidAmount || 0).toLocaleString()}</span></div>
                <div className="flex justify-between text-orange-600 font-semibold"><span>Remaining</span><span>₹{Number(q.remainingAmount || 0).toLocaleString()}</span></div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuoteDetail;
