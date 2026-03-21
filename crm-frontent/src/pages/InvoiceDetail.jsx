import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoiceService } from '../services/invoiceService';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Send, CreditCard } from 'lucide-react';

const InvoiceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [payModal, setPayModal] = useState(false);
  const [payForm, setPayForm] = useState({ amount: '', method: 'bank_transfer', reference: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => invoiceService.getOne(id).then(r => r.data?.data?.invoice),
  });

  const sendMut = useMutation({
    mutationFn: () => invoiceService.send(id),
    onSuccess: () => { qc.invalidateQueries(['invoice', id]); toast.success('Invoice sent'); },
    onError: () => toast.error('Failed to send'),
  });

  const payMut = useMutation({
    mutationFn: (d) => invoiceService.recordPayment(id, d),
    onSuccess: () => {
      qc.invalidateQueries(['invoice', id]);
      qc.invalidateQueries(['invoices']);
      toast.success('Payment recorded');
      setPayModal(false);
      setPayForm({ amount: '', method: 'bank_transfer', reference: '' });
    },
    onError: () => toast.error('Failed to record payment'),
  });

  if (isLoading) return <div className="p-8 text-slate-500 text-sm">Loading...</div>;
  if (!data) return <div className="p-8 text-slate-500 text-sm">Invoice not found.</div>;

  const inv = data;

  return (
    <div>
      <PageHeader
        title={inv.invoiceNumber || 'Invoice'}
        breadcrumbs={[{ label: 'Invoices', href: '/invoices' }, { label: inv.invoiceNumber }]}
        actions={
          <div className="flex gap-2">
            {inv.status !== 'paid' && (
              <>
                <button onClick={() => sendMut.mutate()} disabled={sendMut.isPending || inv.status === 'sent'}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                  <Send className="w-4 h-4" /> {inv.status === 'sent' ? 'Sent' : 'Send'}
                </button>
                <button onClick={() => setPayModal(true)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors">
                  <CreditCard className="w-4 h-4" /> Record Payment
                </button>
              </>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {/* Details */}
          <div className="crm-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-700">Invoice Details</h3>
              <StatusBadge status={inv.status || 'draft'} />
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-slate-500">Client</span><p className="font-medium mt-0.5">{inv.clientName || '—'}</p></div>
              <div><span className="text-slate-500">Project</span><p className="font-medium mt-0.5">{inv.project?.name || inv.project || '—'}</p></div>
              <div><span className="text-slate-500">Due Date</span><p className="font-medium mt-0.5">{inv.dueDate ? format(new Date(inv.dueDate), 'dd MMM yyyy') : '—'}</p></div>
              <div><span className="text-slate-500">Created</span><p className="font-medium mt-0.5">{inv.createdAt ? format(new Date(inv.createdAt), 'dd MMM yyyy') : '—'}</p></div>
              {inv.fromQuote && <div><span className="text-slate-500">From Quote</span><p className="font-medium mt-0.5 text-indigo-600 cursor-pointer hover:underline" onClick={() => navigate(`/quotes/${inv.fromQuote}`)}>View Quote</p></div>}
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
                {(inv.items || []).map((item, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    <td className="py-2">{item.description || '—'}</td>
                    <td className="py-2 text-right">{item.qty || item.quantity || 1}</td>
                    <td className="py-2 text-right">₹{Number(item.rate || 0).toLocaleString()}</td>
                    <td className="py-2 text-right">₹{((item.qty || item.quantity || 1) * (item.rate || 0)).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {inv.notes && <p className="mt-4 text-xs text-slate-500 border-t border-slate-100 pt-3">{inv.notes}</p>}
          </div>

          {/* Payment History */}
          {(inv.payments || []).length > 0 && (
            <div className="crm-card p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">Payment History</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-100">
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium">Method</th>
                    <th className="pb-2 font-medium">Reference</th>
                    <th className="pb-2 font-medium text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {inv.payments.map((p, i) => (
                    <tr key={i} className="border-b border-slate-50">
                      <td className="py-2">{p.date ? format(new Date(p.date), 'dd MMM yyyy') : '—'}</td>
                      <td className="py-2 capitalize">{p.method?.replace('_', ' ') || '—'}</td>
                      <td className="py-2">{p.reference || '—'}</td>
                      <td className="py-2 text-right text-green-600 font-medium">₹{Number(p.amount || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Summary */}
        <div>
          <div className="crm-card p-5 sticky top-4 space-y-2 text-sm">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Summary</h3>
            <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>₹{Number(inv.subtotal || 0).toLocaleString()}</span></div>
            <div className="flex justify-between text-slate-600"><span>GST</span><span>₹{Number(inv.tax || 0).toLocaleString()}</span></div>
            <div className="flex justify-between font-bold text-slate-900 text-base border-t border-slate-100 pt-2 mt-1">
              <span>Invoice Total</span><span>₹{Number(inv.total || 0).toLocaleString()}</span>
            </div>
            {inv.budget > 0 && (
              <div className="border-t border-slate-100 pt-2 space-y-1">
                <div className="flex justify-between text-slate-600"><span>Project Budget</span><span>₹{Number(inv.budget).toLocaleString()}</span></div>
                <div className="flex justify-between text-green-600"><span>Paid</span><span>₹{Number(inv.paidAmount || 0).toLocaleString()}</span></div>
                <div className="flex justify-between text-orange-600 font-semibold"><span>Remaining</span><span>₹{Number(inv.remainingAmount || 0).toLocaleString()}</span></div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Record Payment Modal */}
      <Modal open={payModal} onClose={() => setPayModal(false)} title="Record Payment">
        <div className="space-y-4">
          <div>
            <label className="modal-form-label">Amount (₹) *</label>
            <input type="number" min="0" value={payForm.amount}
              onChange={e => setPayForm(p => ({ ...p, amount: e.target.value }))}
              className="modal-input" placeholder="Enter amount" />
          </div>
          <div>
            <label className="modal-form-label">Payment Method</label>
            <select value={payForm.method} onChange={e => setPayForm(p => ({ ...p, method: e.target.value }))} className="modal-input">
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cash">Cash</option>
              <option value="cheque">Cheque</option>
              <option value="upi">UPI</option>
              <option value="card">Card</option>
            </select>
          </div>
          <div>
            <label className="modal-form-label">Reference / Transaction ID</label>
            <input value={payForm.reference} onChange={e => setPayForm(p => ({ ...p, reference: e.target.value }))}
              className="modal-input" placeholder="Optional" />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => payMut.mutate(payForm)} disabled={!payForm.amount || payMut.isPending}
              className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition-colors">
              {payMut.isPending ? 'Saving...' : 'Record Payment'}
            </button>
            <button onClick={() => setPayModal(false)} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default InvoiceDetail;
