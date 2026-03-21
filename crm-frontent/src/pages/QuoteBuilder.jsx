import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { quoteService } from '../services/quoteService';
import { invoiceService } from '../services/invoiceService';
import { clientService } from '../services/clientService';
import { projectService } from '../services/projectService';
import PageHeader from '../components/common/PageHeader';
import { Plus, Trash2 } from 'lucide-react';
import { formatINR } from '../utils/currency';

const QuoteBuilder = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { register, handleSubmit, watch } = useForm();
  const [items, setItems] = useState([{ description: '', qty: 1, rate: 0 }]);

  const selectedClient = watch('client');
  const budget = Number(watch('budget') || 0);
  const paidAmount = Number(watch('paidAmount') || 0);
  const remainingAmount = budget - paidAmount;

  const { data: clients } = useQuery({
    queryKey: ['clients-list'],
    queryFn: () => clientService.getAll({ limit: 200 }).then(r => r.data?.data?.clients || []),
  });

  const { data: projects } = useQuery({
    queryKey: ['projects-by-client', selectedClient],
    queryFn: () => projectService.getAll({ limit: 200 }).then(r => r.data?.data?.projects || []),
    enabled: true,
  });

  // Filter projects by selected client
  const filteredProjects = (projects || []).filter(p =>
    !selectedClient || p.client?._id === selectedClient || p.client === selectedClient
  );

  const addItem = () => setItems(p => [...p, { description: '', qty: 1, rate: 0 }]);
  const removeItem = (i) => setItems(p => p.filter((_, idx) => idx !== i));
  const updateItem = (i, field, val) => setItems(p => p.map((item, idx) => idx === i ? { ...item, [field]: val } : item));

  const subtotal = items.reduce((s, i) => s + (Number(i.qty) * Number(i.rate)), 0);
  const tax = subtotal * 0.18;
  const total = subtotal + tax;

  const mut = useMutation({
    mutationFn: (data) => quoteService.create({
      ...data,
      items, subtotal, tax, total,
      budget: Number(data.budget) || 0,
      paidAmount: Number(data.paidAmount) || 0,
      remainingAmount: Number(data.budget || 0) - Number(data.paidAmount || 0),
    }),
    onSuccess: (res) => {
      qc.invalidateQueries(['quotes']);
      toast.success('Quote created');
      navigate(`/quotes/${res.data?.data?.quote?._id || res.data?.quote?._id}`);
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  });

  // Convert quote directly to invoice
  const convertMut = useMutation({
    mutationFn: async (data) => {
      // First create the quote
      const quoteRes = await quoteService.create({
        ...data,
        items, subtotal, tax, total,
        budget: Number(data.budget) || 0,
        paidAmount: Number(data.paidAmount) || 0,
        remainingAmount: Number(data.budget || 0) - Number(data.paidAmount || 0),
      });
      const quoteId = quoteRes.data?.data?.quote?._id;
      // Then convert to invoice
      const convertRes = await quoteService.convertToInvoice(quoteId);
      const invoiceData = convertRes.data?.data?.invoiceData || {};
      // Create the invoice
      const invoiceRes = await invoiceService.create({
        client: data.client,
        clientName: clients?.find(c => c._id === data.client)?.name || '',
        project: data.project,
        items,
        subtotal,
        tax,
        total,
        budget: Number(data.budget) || 0,
        paidAmount: Number(data.paidAmount) || 0,
        remainingAmount: Number(data.budget || 0) - Number(data.paidAmount || 0),
        notes: data.notes,
        dueDate: data.validUntil,
        fromQuote: quoteId,
      });
      return invoiceRes;
    },
    onSuccess: (res) => {
      qc.invalidateQueries(['quotes', 'invoices']);
      toast.success('Quote converted to invoice');
      navigate(`/invoices/${res.data?.data?.invoice?._id}`);
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Conversion failed'),
  });

  return (
    <div>
      <PageHeader title="New Quote" breadcrumbs={[{ label: 'Quotes', href: '/quotes' }, { label: 'New' }]} />
      <form onSubmit={handleSubmit(d => mut.mutate(d))}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            {/* Header info */}
            <div className="crm-card p-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="modal-form-label">Client *</label>
                  <select {...register('client', { required: true })} className="modal-input">
                    <option value="">Select client</option>
                    {(clients || []).map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="modal-form-label">Project</label>
                  <select {...register('project')} className="modal-input">
                    <option value="">Select project</option>
                    {filteredProjects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="modal-form-label">Valid Until</label>
                  <input {...register('validUntil')} type="date" className="modal-input" />
                </div>
                <div>
                  <label className="modal-form-label">Subject</label>
                  <input {...register('subject')} className="modal-input" placeholder="Quote subject" />
                </div>
              </div>
            </div>

            {/* Budget & Payment */}
            <div className="crm-card p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">Budget & Payment</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="modal-form-label">Project Budget (₹)</label>
                  <input {...register('budget')} type="number" min="0" className="modal-input" placeholder="0" />
                </div>
                <div>
                  <label className="modal-form-label">Paid Amount (₹)</label>
                  <input {...register('paidAmount')} type="number" min="0" className="modal-input" placeholder="0" />
                </div>
                <div>
                  <label className="modal-form-label">Remaining Amount (₹)</label>
                  <input
                    readOnly
                    value={remainingAmount < 0 ? 0 : remainingAmount}
                    className="modal-input bg-slate-50 text-slate-500 cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* Line items */}
            <div className="crm-card p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">Line Items</h3>
              <div className="space-y-3">
                {items.map((item, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-6">
                      <input value={item.description} onChange={e => updateItem(i, 'description', e.target.value)}
                        className="modal-input" placeholder="Description" />
                    </div>
                    <div className="col-span-2">
                      <input type="number" value={item.qty} onChange={e => updateItem(i, 'qty', e.target.value)}
                        className="modal-input" placeholder="Qty" min="1" />
                    </div>
                    <div className="col-span-3">
                      <input type="number" value={item.rate} onChange={e => updateItem(i, 'rate', e.target.value)}
                        className="modal-input" placeholder="Rate" min="0" />
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <button type="button" onClick={() => removeItem(i)} disabled={items.length === 1}
                        className="p-1.5 text-red-400 hover:text-red-600 disabled:opacity-30 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button type="button" onClick={addItem}
                className="mt-3 flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium transition-colors">
                <Plus className="w-4 h-4" /> Add Item
              </button>
            </div>

            <div>
              <label className="modal-form-label">Notes</label>
              <textarea {...register('notes')} rows={3} className="modal-input" placeholder="Terms, notes..." />
            </div>
          </div>

          {/* Summary */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sticky top-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span><span>{formatINR(subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>GST (18%)</span><span>{formatINR(tax)}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-900 text-base border-t border-slate-100 pt-2 mt-2">
                  <span>Total</span><span>{formatINR(total)}</span>
                </div>
                {budget > 0 && (
                  <>
                    <div className="border-t border-slate-100 pt-2 mt-2 space-y-1">
                      <div className="flex justify-between text-slate-600">
                        <span>Budget</span><span>{formatINR(budget)}</span>
                      </div>
                      <div className="flex justify-between text-green-600">
                        <span>Paid</span><span>{formatINR(paidAmount)}</span>
                      </div>
                      <div className="flex justify-between text-orange-600 font-semibold">
                        <span>Remaining</span><span>{formatINR(Math.max(0, remainingAmount))}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
              <button type="submit" disabled={mut.isPending}
                className="w-full mt-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50">
                {mut.isPending ? 'Creating...' : 'Create Quote'}
              </button>
              <button type="button"
                disabled={convertMut.isPending}
                onClick={handleSubmit(d => convertMut.mutate(d))}
                className="w-full mt-2 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50">
                {convertMut.isPending ? 'Converting...' : 'Create & Convert to Invoice'}
              </button>
              <button type="button" onClick={() => navigate('/quotes')}
                className="w-full mt-2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default QuoteBuilder;
