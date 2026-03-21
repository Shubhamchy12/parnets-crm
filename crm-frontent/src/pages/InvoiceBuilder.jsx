import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { invoiceService } from '../services/invoiceService';
import { clientService } from '../services/clientService';
import { projectService } from '../services/projectService';
import PageHeader from '../components/common/PageHeader';
import { Plus, Trash2 } from 'lucide-react';

const InvoiceBuilder = () => {
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
    queryKey: ['projects-list'],
    queryFn: () => projectService.getAll({ limit: 200 }).then(r => r.data?.data?.projects || []),
  });

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
    mutationFn: (data) => invoiceService.create({
      client: data.client,
      clientName: clients?.find(c => c._id === data.client)?.name || '',
      project: data.project,
      dueDate: data.dueDate,
      notes: data.notes,
      items, subtotal, tax, total,
      budget: Number(data.budget) || 0,
      paidAmount: Number(data.paidAmount) || 0,
      remainingAmount: Math.max(0, Number(data.budget || 0) - Number(data.paidAmount || 0)),
    }),
    onSuccess: (res) => {
      qc.invalidateQueries(['invoices']);
      toast.success('Invoice created');
      navigate(`/invoices/${res.data?.data?.invoice?._id}`);
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  });

  return (
    <div>
      <PageHeader title="New Invoice" breadcrumbs={[{ label: 'Invoices', href: '/invoices' }, { label: 'New' }]} />
      <form onSubmit={handleSubmit(d => mut.mutate(d))}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
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
                  <label className="modal-form-label">Due Date</label>
                  <input {...register('dueDate')} type="date" className="modal-input" />
                </div>
              </div>
            </div>

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
                  <label className="modal-form-label">Remaining (₹)</label>
                  <input readOnly value={remainingAmount < 0 ? 0 : remainingAmount}
                    className="modal-input bg-slate-50 text-slate-500 cursor-not-allowed" />
                </div>
              </div>
            </div>

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

          <div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sticky top-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>₹{subtotal.toLocaleString()}</span></div>
                <div className="flex justify-between text-slate-600"><span>GST (18%)</span><span>₹{tax.toFixed(0)}</span></div>
                <div className="flex justify-between font-bold text-slate-900 text-base border-t border-slate-100 pt-2 mt-2">
                  <span>Total</span><span>₹{total.toFixed(0)}</span>
                </div>
                {budget > 0 && (
                  <div className="border-t border-slate-100 pt-2 mt-2 space-y-1">
                    <div className="flex justify-between text-slate-600"><span>Budget</span><span>₹{budget.toLocaleString()}</span></div>
                    <div className="flex justify-between text-green-600"><span>Paid</span><span>₹{paidAmount.toLocaleString()}</span></div>
                    <div className="flex justify-between text-orange-600 font-semibold"><span>Remaining</span><span>₹{Math.max(0, remainingAmount).toLocaleString()}</span></div>
                  </div>
                )}
              </div>
              <button type="submit" disabled={mut.isPending}
                className="w-full mt-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50">
                {mut.isPending ? 'Creating...' : 'Create Invoice'}
              </button>
              <button type="button" onClick={() => navigate('/invoices')}
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

export default InvoiceBuilder;
