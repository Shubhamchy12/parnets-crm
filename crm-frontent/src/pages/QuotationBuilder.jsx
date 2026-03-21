import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ChevronLeft } from 'lucide-react';
import { quotationService } from '../services/quotationService';
import { projectService } from '../services/projectService';
import api from '../services/api';
import { formatINR } from '../utils/currency';

const Lbl = ({ children, required }) => (
  <label className="block text-sm font-medium text-slate-600 mb-1.5">
    {children}{required && <span className="text-red-500 ml-0.5">*</span>}
  </label>
);

const QuotationBuilder = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const qc = useQueryClient();
  const isEdit = Boolean(id);

  const [projectId, setProjectId] = useState('');
  const [clientInfo, setClientInfo] = useState(null);
  const [developmentBudget, setDevelopmentBudget] = useState('');
  const [selectedServices, setSelectedServices] = useState([]);
  const [notes, setNotes] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [validUntil, setValidUntil] = useState('');

  const { data: projects = [] } = useQuery({
    queryKey: ['projects-dropdown'],
    queryFn: () => projectService.getAll({ limit: 200 }).then(r => r.data?.data?.projects || []),
  });

  const { data: availableServices = [] } = useQuery({
    queryKey: ['services'],
    queryFn: () => api.get('/services').then(r => r.data?.data?.services || []),
  });

  const { data: existing } = useQuery({
    queryKey: ['quotation', id],
    queryFn: () => quotationService.getOne(id).then(r => r.data?.data?.quotation),
    enabled: isEdit,
  });

  useEffect(() => {
    if (existing) {
      setProjectId(existing.project?._id || existing.project || '');
      setClientInfo(existing.client);
      setDevelopmentBudget(existing.developmentBudget ?? '');
      setSelectedServices(existing.services || []);
      setNotes(existing.notes || '');
      setPaymentTerms(existing.paymentTerms || '');
      setValidUntil(existing.validUntil ? existing.validUntil.slice(0, 10) : '');
    }
  }, [existing]);

  useEffect(() => {
    if (!projectId) { setClientInfo(null); return; }
    const proj = projects.find(p => p._id === projectId);
    if (proj?.client) setClientInfo(proj.client);
  }, [projectId, projects]);

  const toggleService = (svc) => {
    setSelectedServices(prev => {
      const exists = prev.find(s => s.service === svc._id);
      if (exists) return prev.filter(s => s.service !== svc._id);
      return [...prev, { service: svc._id, serviceName: svc.name, amount: svc.defaultAmount || 0 }];
    });
  };

  const updateServiceAmount = (serviceId, amount) => {
    setSelectedServices(prev => prev.map(s => s.service === serviceId ? { ...s, amount: Number(amount) || 0 } : s));
  };

  // Live tax calculation
  const devBudget = Number(developmentBudget) || 0;
  const servicesTotal = selectedServices.reduce((s, sv) => s + (Number(sv.amount) || 0), 0);
  const subtotal = devBudget + servicesTotal;
  const cgst = Math.round(subtotal * 0.09 * 100) / 100;
  const sgst = Math.round(subtotal * 0.09 * 100) / 100;
  const grandTotal = subtotal + cgst + sgst;

  const mut = useMutation({
    mutationFn: (data) => isEdit ? quotationService.update(id, data) : quotationService.create(data),
    onSuccess: (res) => {
      qc.invalidateQueries(['quotations']);
      toast.success(isEdit ? 'Quotation updated' : 'Quotation created');
      const qId = res.data?.data?.quotation?._id;
      navigate(qId ? `/quotations/${qId}` : '/quotations');
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!projectId) return toast.error('Please select a project');
    mut.mutate({ project: projectId, developmentBudget, services: selectedServices, notes, paymentTerms, validUntil });
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/quotations')} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-800">{isEdit ? 'Edit Quotation' : 'New Quotation'}</h1>
          <p className="text-sm text-slate-500">Fill in the details below</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Step 1: Project & Client */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Step 1 — Project & Client</p>
          <div>
            <Lbl required>Project</Lbl>
            <select className="modal-input" value={projectId} onChange={e => setProjectId(e.target.value)} required>
              <option value="">Select a project...</option>
              {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          </div>
          {clientInfo && (
            <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-xl border border-indigo-100">
              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {(clientInfo.name || '?')[0].toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">{clientInfo.name}</p>
                <p className="text-xs text-slate-500">{clientInfo.company}{clientInfo.email ? ` · ${clientInfo.email}` : ''}</p>
              </div>
              <span className="ml-auto text-xs text-indigo-600 font-medium bg-indigo-100 px-2 py-0.5 rounded-full">Auto-filled</span>
            </div>
          )}
        </div>

        {/* Step 2: Development Budget */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Step 2 — Development Budget</p>
          <div>
            <Lbl required>Development Budget (₹)</Lbl>
            <input
              className="modal-input"
              type="number"
              min="0"
              value={developmentBudget}
              onChange={e => setDevelopmentBudget(e.target.value)}
              placeholder="e.g. 50000"
              required
            />
          </div>
        </div>

        {/* Step 3: Add-on Services */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Step 3 — Add-on Services</p>
          {availableServices.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">No services configured. Add them from <strong>Services / Add-ons</strong> in the sidebar.</p>
          ) : (
            <div className="space-y-2">
              {availableServices.map(svc => {
                const selected = selectedServices.find(s => s.service === svc._id);
                return (
                  <div
                    key={svc._id}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-colors cursor-pointer ${selected ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'}`}
                    onClick={() => toggleService(svc)}
                  >
                    <input
                      type="checkbox"
                      checked={!!selected}
                      onChange={() => toggleService(svc)}
                      onClick={e => e.stopPropagation()}
                      className="w-4 h-4 accent-indigo-600 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800">{svc.name}</p>
                      {svc.description && <p className="text-xs text-slate-500 truncate">{svc.description}</p>}
                    </div>
                    {selected ? (
                      <div className="flex items-center gap-1.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
                        <span className="text-xs text-slate-500">₹</span>
                        <input
                          type="number"
                          min="0"
                          value={selected.amount}
                          onChange={e => updateServiceAmount(svc._id, e.target.value)}
                          className="w-28 text-sm border border-indigo-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                          placeholder="Amount"
                        />
                      </div>
                    ) : (
                      svc.defaultAmount > 0 && (
                        <span className="text-xs text-slate-400 flex-shrink-0">{formatINR(svc.defaultAmount)}</span>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Live Total Summary */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Total Summary</p>
          <div className="flex justify-between text-sm text-slate-600 py-1.5 border-b border-slate-100">
            <span>Development Budget</span>
            <span>{formatINR(devBudget)}</span>
          </div>
          {selectedServices.map(s => (
            <div key={s.service} className="flex justify-between text-sm text-slate-600 py-1.5 border-b border-slate-100">
              <span>{s.serviceName}</span>
              <span>{formatINR(s.amount)}</span>
            </div>
          ))}
          <div className="flex justify-between text-sm text-slate-700 py-1.5 border-b border-slate-200 font-medium">
            <span>Subtotal</span>
            <span>{formatINR(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm text-slate-600 py-1.5 border-b border-slate-100">
            <span>CGST (9%)</span>
            <span>{formatINR(cgst)}</span>
          </div>
          <div className="flex justify-between text-sm text-slate-600 py-1.5 border-b border-slate-100">
            <span>SGST (9%)</span>
            <span>{formatINR(sgst)}</span>
          </div>
          <div className="flex justify-between text-base font-bold text-slate-800 pt-2">
            <span>Grand Total</span>
            <span className="text-indigo-600">{formatINR(grandTotal)}</span>
          </div>
        </div>

        {/* Payment Terms */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Payment Terms</p>
          <div>
            <p className="text-xs text-slate-500 mb-2">Quick templates:</p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: '2 Installments', value: '1st Installment: At project start\n2nd Installment: At project delivery' },
                { label: '3 Installments', value: '1st Installment: At project kickoff\n2nd Installment: After design completion\n3rd Installment: At project delivery' },
                { label: '4 Installments', value: '1st Installment: At project start\n2nd Installment: After design approval\n3rd Installment: After development completion\nFinal Installment: At project handover' },
                { label: 'Milestone-Based', value: 'Initial payment at project kickoff\nSecond payment after first milestone\nThird payment after testing phase\nFinal payment upon project handover' },
              ].map(t => (
                <button key={t.label} type="button" onClick={() => setPaymentTerms(t.value)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors">
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Lbl>Payment Terms (Stage-Based)</Lbl>
            <textarea className="modal-input font-mono text-sm" rows={5} value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)}
              placeholder={'e.g.\n1st Installment: At project start\n2nd Installment: After design completion\n3rd Installment: After development completion\nFinal Installment: At project delivery'} />
            <p className="text-xs text-slate-400 mt-1.5">Define payment stages based on project milestones, not percentages.</p>
          </div>
        </div>

        {/* Notes & Valid Until */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Additional Details</p>
          <div>
            <Lbl>Valid Until</Lbl>
            <input className="modal-input" type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} />
          </div>
          <div>
            <Lbl>Notes</Lbl>
            <textarea className="modal-input" rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any additional notes..." />
          </div>
        </div>

        <div className="flex gap-3">
          <button type="button" onClick={() => navigate('/quotations')} className="flex-1 py-3 border border-slate-300 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={mut.isPending} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50">
            {mut.isPending ? 'Saving...' : isEdit ? 'Update Quotation' : 'Create Quotation'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default QuotationBuilder;
