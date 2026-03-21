import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ChevronLeft } from 'lucide-react';
import { invoiceService } from '../services/invoiceService';
import { formatINR } from '../utils/currency';

const ORDINALS = ['1st','2nd','3rd','4th','5th','6th','7th','8th','9th','10th'];

const Lbl = ({ children, required }) => (
  <label className="block text-sm font-medium text-slate-600 mb-1.5">
    {children}{required && <span className="text-red-500 ml-0.5">*</span>}
  </label>
);

const InvoiceBuilder = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const qc = useQueryClient();
  const isEdit = Boolean(id);

  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [installmentCount, setInstallmentCount] = useState(1);
  const [installments, setInstallments] = useState([{ label: '1st Installment', amount: '', dueDate: '' }]);

  const { data: quotations = [] } = useQuery({
    queryKey: ['approved-quotations'],
    queryFn: () => invoiceService.getApprovedQuotations().then(r => r.data?.data?.quotations || []),
    enabled: !isEdit,
  });

  const { data: existing } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => invoiceService.getOne(id).then(r => r.data?.data?.invoice),
    enabled: isEdit,
  });

  useEffect(() => {
    if (existing) {
      setDueDate(existing.dueDate ? existing.dueDate.slice(0, 10) : '');
      setNotes(existing.notes || '');
      if (existing.installments?.length) {
        setInstallmentCount(existing.installments.length);
        setInstallments(existing.installments.map((inst, i) => ({
          label: inst.label || `${ORDINALS[i]} Installment`,
          amount: inst.amount ?? '',
          dueDate: inst.dueDate ? inst.dueDate.slice(0, 10) : '',
        })));
      }
    }
  }, [existing]);

  // When installment count changes, resize array preserving existing values
  useEffect(() => {
    setInstallments(prev => Array.from({ length: installmentCount }, (_, i) => ({
      label: prev[i]?.label || `${ORDINALS[i] || (i + 1) + 'th'} Installment`,
      amount: prev[i]?.amount ?? '',
      dueDate: prev[i]?.dueDate ?? '',
    })));
  }, [installmentCount]);

  // Auto-fill installment amounts from quotation grandTotal when quotation changes
  useEffect(() => {
    if (!selectedQuotation) return;
    const total = selectedQuotation.grandTotal || 0;
    const perInstallment = installmentCount > 0 ? Math.round(total / installmentCount) : total;
    setInstallments(prev => prev.map((inst, i) => ({
      ...inst,
      amount: i === installmentCount - 1
        ? String(total - perInstallment * (installmentCount - 1)) // last gets remainder
        : String(perInstallment),
    })));
  }, [selectedQuotation, installmentCount]);

  const handleQuotationChange = (qId) => {
    const q = quotations.find(q => q._id === qId) || null;
    setSelectedQuotation(q);
  };

  const updateInstallment = (index, field, value) => {
    setInstallments(prev => prev.map((inst, i) => i === index ? { ...inst, [field]: value } : inst));
  };

  const totalInstallments = installments.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const clientInfo = selectedQuotation?.client || null;

  const mut = useMutation({
    mutationFn: (data) => isEdit ? invoiceService.update(id, data) : invoiceService.create(data),
    onSuccess: (res) => {
      qc.invalidateQueries(['invoices']);
      toast.success(isEdit ? 'Invoice updated' : 'Invoice created');
      const invId = res.data?.data?.invoice?._id;
      navigate(invId ? `/invoices/${invId}` : '/invoices');
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isEdit && !selectedQuotation) return toast.error('Please select a quotation');

    const q = selectedQuotation;
    const payload = {
      dueDate,
      notes,
      installments,
      // client & financial data from quotation
      ...(q && {
        client: q.client?._id || q.client,
        clientName: q.client?.name || '',
        clientAddress: q.client?.address || '',
        clientPhone: q.client?.phone || '',
        project: q.project?._id || q.project,
        projectName: q.project?.name || '',
        fromQuote: q._id,
        quotationNumber: q.quotationNumber,
        budget: q.grandTotal || 0,
        subtotal: q.subtotal || 0,
        tax: (q.cgst || 0) + (q.sgst || 0),
        total: totalInstallments || q.grandTotal || 0,
        paidAmount: 0,
        // Build line items from quotation services + dev budget
        items: [
          ...(q.developmentBudget > 0 ? [{ description: 'Development', qty: 1, rate: q.developmentBudget }] : []),
          ...(q.services || []).map(s => ({ description: s.serviceName, qty: 1, rate: s.amount })),
        ],
      }),
    };

    mut.mutate(payload);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/invoices')} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-800">{isEdit ? 'Edit Invoice' : 'New Invoice'}</h1>
          <p className="text-sm text-slate-500">Fill in the details below</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Step 1: Quotation */}
        {!isEdit && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Step 1 — Select Quotation</p>
            <div>
              <Lbl required>Approved Quotation</Lbl>
              <select className="modal-input" value={selectedQuotation?._id || ''} onChange={e => handleQuotationChange(e.target.value)} required>
                <option value="">Select a quotation...</option>
                {quotations.map(q => (
                  <option key={q._id} value={q._id}>
                    {q.quotationNumber || q._id} — {q.client?.name || 'Unknown Client'} ({formatINR(q.grandTotal || 0)})
                  </option>
                ))}
              </select>
            </div>

            {/* Client info card */}
            {clientInfo && (
              <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {(clientInfo.name || '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{clientInfo.name}</p>
                  <p className="text-xs text-slate-500 truncate">
                    {[clientInfo.company, clientInfo.email, clientInfo.phone].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <span className="text-xs text-indigo-600 font-medium bg-indigo-100 px-2 py-0.5 rounded-full flex-shrink-0">Auto-filled</span>
              </div>
            )}

            {/* Quotation amount summary */}
            {selectedQuotation && (
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-xs text-slate-500 mb-1">Subtotal</p>
                  <p className="text-sm font-semibold text-slate-800">{formatINR(selectedQuotation.subtotal || 0)}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-xs text-slate-500 mb-1">GST (18%)</p>
                  <p className="text-sm font-semibold text-slate-800">{formatINR((selectedQuotation.cgst || 0) + (selectedQuotation.sgst || 0))}</p>
                </div>
                <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200">
                  <p className="text-xs text-indigo-600 mb-1">Grand Total</p>
                  <p className="text-sm font-bold text-indigo-700">{formatINR(selectedQuotation.grandTotal || 0)}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Due Date */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{isEdit ? 'Step 1' : 'Step 2'} — Due Date</p>
          <div>
            <Lbl>Invoice Due Date</Lbl>
            <input className="modal-input" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </div>
        </div>

        {/* Step 3: Installments */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{isEdit ? 'Step 2' : 'Step 3'} — Payment Installments</p>
          <div>
            <Lbl>Number of Installments</Lbl>
            <select className="modal-input" value={installmentCount} onChange={e => setInstallmentCount(Number(e.target.value))}>
              {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="space-y-3">
            {installments.map((inst, i) => (
              <div key={i} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                <p className="text-xs font-semibold text-slate-500">{ORDINALS[i] || `${i+1}th`} Installment</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Lbl>Label</Lbl>
                    <input className="modal-input" value={inst.label} onChange={e => updateInstallment(i, 'label', e.target.value)} placeholder="e.g. At project start" />
                  </div>
                  <div>
                    <Lbl>Amount (Rs.)</Lbl>
                    <input className="modal-input" type="number" min="0" value={inst.amount} onChange={e => updateInstallment(i, 'amount', e.target.value)} placeholder="0" />
                  </div>
                </div>
                <div>
                  <Lbl>Due Date</Lbl>
                  <input className="modal-input" type="date" value={inst.dueDate} onChange={e => updateInstallment(i, 'dueDate', e.target.value)} />
                </div>
              </div>
            ))}
          </div>

          {/* Running total */}
          <div className="flex justify-between text-sm font-semibold text-slate-700 pt-2 border-t border-slate-200">
            <span>Total Installments</span>
            <span className={totalInstallments !== (selectedQuotation?.grandTotal || 0) && selectedQuotation ? 'text-orange-500' : 'text-indigo-600'}>
              {formatINR(totalInstallments)}
              {selectedQuotation && totalInstallments !== (selectedQuotation.grandTotal || 0) && (
                <span className="ml-2 text-xs font-normal text-orange-400">
                  (Quotation total: {formatINR(selectedQuotation.grandTotal || 0)})
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Notes</p>
          <div>
            <Lbl>Additional Notes</Lbl>
            <textarea className="modal-input" rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any additional notes..." />
          </div>
        </div>

        <div className="flex gap-3">
          <button type="button" onClick={() => navigate('/invoices')} className="flex-1 py-3 border border-slate-300 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={mut.isPending} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50">
            {mut.isPending ? 'Saving...' : isEdit ? 'Update Invoice' : 'Create Invoice'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default InvoiceBuilder;
