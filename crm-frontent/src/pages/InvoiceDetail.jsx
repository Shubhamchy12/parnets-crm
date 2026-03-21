import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoiceService } from '../services/invoiceService';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Send, CreditCard, Mail, MessageCircle, Eye, FileDown } from 'lucide-react';
import { formatINR } from '../utils/currency';

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

  const fromQuote = data?.fromQuote?._id || data?.fromQuote || null;

  // Fetch all installments from same quotation
  const { data: siblings = [] } = useQuery({
    queryKey: ['invoice-siblings', fromQuote],
    queryFn: () => invoiceService.getByQuote(fromQuote).then(r => r.data?.data?.invoices || []),
    enabled: !!fromQuote,
  });

  const sendMut = useMutation({
    mutationFn: () => invoiceService.send(id),
    onSuccess: () => { qc.invalidateQueries(['invoice', id]); toast.success('Invoice marked as sent'); },
    onError: () => toast.error('Failed to send'),
  });

  const emailMut = useMutation({
    mutationFn: () => invoiceService.sendEmail(id),
    onSuccess: (r) => { qc.invalidateQueries(['invoice', id]); toast.success(r.data?.message || 'Sent via email'); },
    onError: (e) => toast.error(e.response?.data?.message || 'Email failed'),
  });

  const whatsappMut = useMutation({
    mutationFn: () => invoiceService.sendWhatsApp(id),
    onSuccess: (r) => { qc.invalidateQueries(['invoice', id]); toast.success(r.data?.message || 'Sent via WhatsApp'); },
    onError: (e) => toast.error(e.response?.data?.message || 'WhatsApp failed'),
  });

  const payMut = useMutation({
    mutationFn: (d) => invoiceService.recordPayment(id, d),
    onSuccess: () => {
      qc.invalidateQueries(['invoice', id]);
      qc.invalidateQueries(['invoices']);
      qc.invalidateQueries(['invoice-siblings', fromQuote]);
      toast.success('Payment recorded');
      setPayModal(false);
      setPayForm({ amount: '', method: 'bank_transfer', reference: '' });
    },
    onError: () => toast.error('Failed to record payment'),
  });

  const handlePdf = async (mode) => {
    try {
      if (mode === 'view') {
        await invoiceService.viewPdf(id);
      } else {
        await invoiceService.downloadPdf(id, `invoice-${data?.invoiceNumber || id}.pdf`);
      }
    } catch {
      toast.error('Failed to load PDF');
    }
  };

  if (isLoading) return <div className="p-8 text-slate-500 text-sm">Loading...</div>;
  if (!data) return <div className="p-8 text-slate-500 text-sm">Invoice not found.</div>;

  const inv = data;

  return (
    <div>
      <PageHeader
        title={inv.invoiceNumber || 'Invoice'}
        breadcrumbs={[{ label: 'Invoices', href: '/invoices' }, { label: inv.invoiceNumber }]}
        actions={
          <div className="flex gap-2 flex-wrap">
            {inv.status !== 'paid' && (
              <>
                <button onClick={() => sendMut.mutate()} disabled={sendMut.isPending || inv.status === 'sent'}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                  <Send className="w-4 h-4" /> {inv.status === 'sent' ? 'Sent' : 'Mark Sent'}
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
              <div><span className="text-slate-500">Client</span><p className="font-medium mt-0.5">{inv.clientName || '—'}</p>{inv.clientPhone && <p className="text-xs text-slate-400">{inv.clientPhone}</p>}</div>
              <div><span className="text-slate-500">Project</span><p className="font-medium mt-0.5">{inv.projectName || inv.project?.name || inv.project || '—'}</p></div>
              {inv.installmentLabel && (
                <div className="col-span-2">
                  <span className="text-slate-500">Installment</span>
                  <p className="font-semibold mt-0.5 text-green-700">{inv.installmentLabel}</p>
                </div>
              )}
              {inv.description && (
                <div className="col-span-2">
                  <span className="text-slate-500">Description</span>
                  <p className="font-medium mt-0.5">{inv.description}</p>
                </div>
              )}
              <div><span className="text-slate-500">Due Date</span><p className="font-medium mt-0.5">{inv.dueDate ? format(new Date(inv.dueDate), 'dd MMM yyyy') : '—'}</p></div>
              <div><span className="text-slate-500">Created</span><p className="font-medium mt-0.5">{inv.createdAt ? format(new Date(inv.createdAt), 'dd MMM yyyy') : '—'}</p></div>
              {inv.sentAt && <div><span className="text-slate-500">Sent</span><p className="font-medium mt-0.5">{format(new Date(inv.sentAt), 'dd MMM yyyy')}{inv.sentVia ? ` via ${inv.sentVia}` : ''}</p></div>}
              {inv.fromQuote && (
                <div>
                  <span className="text-slate-500">Quotation Ref</span>
                  <p className="font-medium mt-0.5 text-indigo-600 cursor-pointer hover:underline" onClick={() => navigate(`/quotations/${inv.fromQuote}`)}>
                    {inv.quotationNumber || 'View Quotation'}
                  </p>
                </div>
              )}
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
                    <td className="py-2 text-right">{formatINR(item.rate || 0)}</td>
                    <td className="py-2 text-right">{formatINR((item.qty || item.quantity || 1) * (item.rate || 0))}</td>
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
                      <td className="py-2 text-right text-green-600 font-medium">{formatINR(p.amount || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

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
            {inv.installmentLabel && (
              <div className="p-2.5 bg-green-50 rounded-xl border border-green-100 mb-3">
                <p className="text-xs text-green-600 font-medium">This Installment</p>
                <p className="font-semibold text-green-800">{inv.installmentLabel}</p>
              </div>
            )}
            <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>{formatINR(inv.subtotal || 0)}</span></div>
            {inv.tax > 0 && <div className="flex justify-between text-slate-600"><span>GST</span><span>{formatINR(inv.tax || 0)}</span></div>}
            <div className="flex justify-between font-bold text-slate-900 text-base border-t border-slate-100 pt-2 mt-1">
              <span>Invoice Total</span><span>{formatINR(inv.total || 0)}</span>
            </div>

            {/* This invoice's own payment status — always show */}
            {(() => {
              const thisPaid = (inv.payments || []).reduce((s, p) => s + (p.amount || 0), 0);
              const thisRemaining = Math.max(0, (inv.total || 0) - thisPaid);
              return (
                <div className="border-t border-slate-100 pt-2 space-y-1">
                  <div className="flex justify-between text-green-600 font-medium">
                    <span>Paid (this invoice)</span>
                    <span>{formatINR(thisPaid)}</span>
                  </div>
                  <div className="flex justify-between text-orange-600 font-semibold">
                    <span>Due (this invoice)</span>
                    <span>{formatINR(thisRemaining)}</span>
                  </div>
                </div>
              );
            })()}

            {/* Payment Schedule — all installments from same quotation */}
            {siblings.length > 0 && (
              <div className="border-t border-slate-100 pt-3 mt-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">All Installments</p>
                <div className="space-y-1.5">
                  {siblings.map((s) => {
                    const isCurrent = s._id === id;
                    const source = isCurrent ? inv : s;
                    const instPaid = (source.payments || []).reduce((sum, p) => sum + (p.amount || 0), 0);
                    const instDue = Math.max(0, (source.total || 0) - instPaid);
                    const statusColor = source.status === 'paid' ? 'text-green-600' : source.status === 'partial' ? 'text-amber-600' : 'text-slate-400';
                    return (
                      <div
                        key={s._id}
                        onClick={() => !isCurrent && navigate(`/invoices/${s._id}`)}
                        className={`px-2.5 py-2 rounded-lg text-xs cursor-pointer transition-colors
                          ${isCurrent ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-slate-50 border border-transparent'}`}
                      >
                        <div className="flex items-center justify-between">
                          <p className={`font-medium truncate ${isCurrent ? 'text-indigo-700' : 'text-slate-700'}`}>
                            {s.installmentLabel || s.invoiceNumber}
                            {isCurrent && <span className="ml-1 text-indigo-400">◀</span>}
                          </p>
                          <p className={`text-xs ${statusColor} capitalize ml-2`}>{source.status}</p>
                        </div>
                        <div className="flex justify-between mt-1 text-slate-500">
                          <span>Amount: <span className="font-semibold text-slate-700">{formatINR(source.total || 0)}</span></span>
                          <span>Paid: <span className="font-semibold text-green-600">{formatINR(instPaid)}</span></span>
                          <span>Due: <span className="font-semibold text-orange-500">{formatINR(instDue)}</span></span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Grand totals */}
                {(() => {
                  const grandTotal = siblings.reduce((s, x) => s + (x.total || 0), 0);
                  const grandPaid = siblings.reduce((s, x) => {
                    // Use fresh inv data for current invoice, sibling data for others
                    const source = String(x._id) === String(id) ? inv : x;
                    return s + (source.payments || []).reduce((ps, p) => ps + (p.amount || 0), 0);
                  }, 0);
                  const remaining = Math.max(0, grandTotal - grandPaid);
                  return (
                    <div className="border-t border-slate-100 pt-2 mt-2 space-y-1">
                      <div className="flex justify-between text-slate-600"><span>Project Total</span><span className="font-medium">{formatINR(grandTotal)}</span></div>
                      <div className="flex justify-between text-green-600 font-medium"><span>Total Paid</span><span>{formatINR(grandPaid)}</span></div>
                      <div className="flex justify-between text-orange-600 font-semibold"><span>Remaining</span><span>{formatINR(remaining)}</span></div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Fallback: no siblings but has budget */}
            {siblings.length === 0 && inv.budget > 0 && (
              <div className="border-t border-slate-100 pt-2 space-y-1">
                <div className="flex justify-between text-slate-600"><span>Project Budget</span><span>{formatINR(inv.budget)}</span></div>
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
