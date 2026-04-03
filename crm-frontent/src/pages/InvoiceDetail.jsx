import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoiceService } from '../services/invoiceService';
import { quotationService } from '../services/quotationService';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Send, CreditCard, Mail, MessageCircle, Printer } from 'lucide-react';
import { formatINR } from '../utils/currency';

const InvoiceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [payModal, setPayModal] = useState(false);
  const [payForm, setPayForm] = useState({ amount: '', method: 'bank_transfer', reference: '', installmentId: '', selectedInvoiceId: '' });
  const [installmentModal, setInstallmentModal] = useState(false);
  const [installmentForm, setInstallmentForm] = useState({ installments: [{ label: '', amount: '', dueDate: '', description: '' }] });
  const [isPrinting, setIsPrinting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => invoiceService.getOne(id).then(r => r.data?.data?.invoice),
  });

  const fromQuote = data?.fromQuote?._id || data?.fromQuote || null;

  // Fetch all installments from same quotation
  const { data: siblings = [], refetch: refetchSiblings } = useQuery({
    queryKey: ['invoice-siblings', fromQuote],
    queryFn: () => invoiceService.getByQuote(fromQuote).then(r => r.data?.data?.invoices || []),
    enabled: !!fromQuote,
    staleTime: 0, // Always fetch fresh data
    cacheTime: 0, // Don't cache
  });

  // Fetch quotation details to show original items
  const { data: quotationData, isLoading: quotationLoading, error: quotationError } = useQuery({
    queryKey: ['quotation-for-invoice', fromQuote],
    queryFn: () => quotationService.getOne(fromQuote).then(r => {
      const quotation = r.data?.data?.quotation;
      console.log('� Fetching Quotation for Invoice...');
      console.log('   fromQuote ID:', fromQuote);
      console.log('   Response:', r.data);
      
      if (quotation) {
        console.log('✅ Quotation Data Received:', quotation.quotationNumber);
        console.log('   Development Budget:', quotation.developmentBudget);
        console.log('   Services Array:', quotation.services);
        console.log('   Services Count:', (quotation.services || []).length);
        
        if (quotation.services && quotation.services.length > 0) {
          console.log('📦 Services Details:');
          quotation.services.forEach((s, i) => {
            console.log(`   ${i + 1}. ${s.serviceName} - ₹${s.amount}`);
          });
        } else {
          console.warn('⚠️  No services found in quotation!');
        }
        
        // Calculate total items
        const totalItems = (quotation.developmentBudget > 0 ? 1 : 0) + (quotation.services || []).length;
        console.log(`📊 Total Items to Display: ${totalItems}`);
      } else {
        console.error('❌ No quotation data received');
      }
      
      return quotation;
    }),
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
    onSuccess: (r) => { 
      qc.invalidateQueries(['invoice', id]); 
      const waUrl = r.data?.data?.waUrl;
      if (waUrl) window.open(waUrl, '_blank', 'noopener,noreferrer');
      toast.success('WhatsApp opened with pre-filled message');
    },
    onError: (e) => toast.error(e.response?.data?.message || 'WhatsApp failed'),
  });

  const payMut = useMutation({
    mutationFn: (d) => invoiceService.recordPayment(id, d),
    onSuccess: async (response) => {
      // Invalidate all related queries
      qc.invalidateQueries(['invoice', id]);
      qc.invalidateQueries(['invoices']);
      qc.invalidateQueries(['invoice-siblings', fromQuote]);
      
      // Force refetch siblings to get updated payment data
      if (refetchSiblings) {
        await refetchSiblings();
      }
      
      const invoice = response.data?.data?.invoice;
      const paymentAmount = payForm.amount;
      
      // Show detailed success message based on payment status
      if (invoice?.status === 'paid') {
        toast.success(`✅ Payment of ${formatINR(paymentAmount)} recorded successfully! Invoice is now fully paid.`, { duration: 4000 });
      } else if (invoice?.status === 'partial') {
        const remaining = invoice.remainingAmount || 0;
        toast.success(`✅ Payment of ${formatINR(paymentAmount)} recorded! Remaining: ${formatINR(remaining)}`, { duration: 4000 });
      } else {
        toast.success(`✅ Payment of ${formatINR(paymentAmount)} recorded successfully!`, { duration: 3000 });
      }
      
      setPayModal(false);
      setPayForm({ amount: '', method: 'bank_transfer', reference: '', installmentId: '', selectedInvoiceId: '' });
    },
    onError: () => toast.error('❌ Failed to record payment'),
  });

  const installmentPlanMut = useMutation({
    mutationFn: (d) => invoiceService.createInstallmentPlan(id, d),
    onSuccess: () => {
      qc.invalidateQueries(['invoice', id]);
      toast.success('Installment plan created');
      setInstallmentModal(false);
      setInstallmentForm({ installments: [{ label: '', amount: '', dueDate: '', description: '' }] });
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to create installment plan'),
  });

  const removeInstallmentPlanMut = useMutation({
    mutationFn: () => invoiceService.removeInstallmentPlan(id),
    onSuccess: () => {
      qc.invalidateQueries(['invoice', id]);
      toast.success('Installment plan removed');
    },
    onError: () => toast.error('Failed to remove installment plan'),
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

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 100);
  };

  const addInstallment = () => {
    setInstallmentForm(prev => ({
      installments: [...prev.installments, { label: '', amount: '', dueDate: '', description: '' }]
    }));
  };

  const removeInstallment = (index) => {
    setInstallmentForm(prev => ({
      installments: prev.installments.filter((_, i) => i !== index)
    }));
  };

  const updateInstallment = (index, field, value) => {
    setInstallmentForm(prev => ({
      installments: prev.installments.map((inst, i) => 
        i === index ? { ...inst, [field]: value } : inst
      )
    }));
  };

  const handleCreateInstallmentPlan = () => {
    const total = installmentForm.installments.reduce((sum, inst) => sum + Number(inst.amount || 0), 0);
    if (Math.abs(total - inv.total) > 0.01) {
      toast.error(`Total installments (${formatINR(total)}) must equal invoice total (${formatINR(inv.total)})`);
      return;
    }
    installmentPlanMut.mutate(installmentForm);
  };

  if (isLoading) return <div className="p-8 text-slate-500 text-sm">Loading...</div>;
  if (!data) return <div className="p-8 text-slate-500 text-sm">Invoice not found.</div>;

  const inv = data;

  return (
    <>
      {/* Print Styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #printable-invoice, #printable-invoice * { visibility: visible; }
          #printable-invoice { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
          .crm-card { break-inside: avoid; page-break-inside: avoid; box-shadow: none !important; }
        }
      `}</style>
      
    <div>
      <PageHeader
        title={inv.invoiceNumber || 'Invoice'}
        breadcrumbs={[{ label: 'Invoices', href: '/invoices' }, { label: inv.invoiceNumber }]}
        actions={
          <div className="flex gap-2 flex-wrap no-print">
            <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-slate-600 text-white rounded-xl hover:bg-slate-700 transition-colors">
              <Printer className="w-4 h-4" /> Print
            </button>
            {inv.status !== 'paid' && (
              <>
                <button onClick={() => sendMut.mutate()} disabled={sendMut.isPending || inv.status === 'sent'}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                  <Send className="w-4 h-4" /> {inv.status === 'sent' ? 'Sent' : 'Mark Sent'}
                </button>
                {!inv.hasInstallmentPlan && (
                  <button onClick={() => setInstallmentModal(true)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors">
                    <CreditCard className="w-4 h-4" /> Setup Installments
                  </button>
                )}
                <button onClick={() => setPayModal(true)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors">
                  <CreditCard className="w-4 h-4" /> Record Payment
                </button>
                {inv.remainingAmount > 0 && (
                  <button 
                    onClick={() => {
                      setPayForm({ 
                        amount: inv.remainingAmount.toString(), 
                        method: 'bank_transfer', 
                        reference: '', 
                        installmentId: '',
                        selectedInvoiceId: ''
                      });
                      setPayModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors">
                    <CreditCard className="w-4 h-4" /> Complete Payment
                  </button>
                )}
              </>
            )}
          </div>
        }
      />

      {/* Printable Invoice Area */}
      <div id="printable-invoice">
        {/* Print Header - Only visible when printing */}
        {isPrinting && (
          <div className="mb-8 pb-6 border-b-2 border-gray-300">
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <div className="mb-3">
                  <img 
                    src="/logo.jpg" 
                    alt="ParNets Logo" 
                    className="h-16"
                  />
                </div>
                <div className="text-sm text-gray-600 leading-relaxed">
                  <div className="font-bold text-lg text-gray-900 mb-1">ParNets</div>
                  <div>So104/1/50, Singapura Main Rd,</div>
                  <div>Singapura Village, Varadharaja Nagar,</div>
                  <div>Vidyaranyapura, Bengaluru,</div>
                  <div>Karnataka 560097</div>
                  <div className="mt-2 font-medium">GST: 29AANCP7155K1ZN</div>
                  <div className="font-medium">Contact: 095909 26068</div>
                  <div className="text-indigo-600">hello@parnetsgroup.com</div>
                </div>
              </div>
              <div className="text-right">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">INVOICE</h1>
                <div className="text-lg font-semibold text-indigo-600 mb-4">{inv.invoiceNumber}</div>
                <div className="text-sm text-gray-600">
                  <div><strong>Date:</strong> {inv.createdAt ? format(new Date(inv.createdAt), 'dd MMM yyyy') : '—'}</div>
                  <div><strong>Due Date:</strong> {inv.dueDate ? format(new Date(inv.dueDate), 'dd MMM yyyy') : '—'}</div>
                  {inv.installmentLabel && (
                    <div className="mt-2 px-3 py-1 bg-green-100 text-green-800 font-semibold rounded">
                      {inv.installmentLabel}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Bill To */}
            <div className="mb-6">
              <div className="text-sm font-semibold text-gray-700 mb-2">BILL TO:</div>
              <div className="text-sm text-gray-900">
                <div className="font-bold text-base">{inv.clientName || '—'}</div>
                {inv.clientPhone && <div>{inv.clientPhone}</div>}
                {inv.projectName && <div className="mt-1 text-gray-600">Project: {inv.projectName}</div>}
              </div>
            </div>

            {/* Payment Summary for Print */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div>
                <div className="text-xs text-gray-500 mb-1">Invoice Total</div>
                <div className="text-lg font-bold text-gray-900">{formatINR(inv.total || 0)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Amount Paid</div>
                <div className="text-lg font-bold text-green-600">
                  {formatINR((inv.payments || []).reduce((s, p) => s + (p.amount || 0), 0))}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Remaining Amount</div>
                <div className="text-lg font-bold text-orange-600">
                  {formatINR(inv.remainingAmount || 0)}
                </div>
              </div>
            </div>

            {/* Transaction Details for Print */}
            {(inv.payments || []).length > 0 && (
              <div className="mt-4">
                <div className="text-sm font-semibold text-gray-700 mb-2">PAYMENT TRANSACTIONS:</div>
                <table className="w-full text-xs border border-gray-200">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border border-gray-200 px-2 py-1 text-left">Date</th>
                      <th className="border border-gray-200 px-2 py-1 text-left">Method</th>
                      <th className="border border-gray-200 px-2 py-1 text-left">Reference</th>
                      <th className="border border-gray-200 px-2 py-1 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inv.payments.map((p, i) => (
                      <tr key={i}>
                        <td className="border border-gray-200 px-2 py-1">{p.date ? format(new Date(p.date), 'dd MMM yyyy') : '—'}</td>
                        <td className="border border-gray-200 px-2 py-1 capitalize">{p.method?.replace('_', ' ') || '—'}</td>
                        <td className="border border-gray-200 px-2 py-1">{p.reference || '—'}</td>
                        <td className="border border-gray-200 px-2 py-1 text-right font-semibold">{formatINR(p.amount || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

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

          {/* Approved Quotation Details */}
          {fromQuote && (
            <div className="crm-card p-5 bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-indigo-900 mb-1">Approved Quotation</h3>
                  {quotationData && (
                    <p className="text-xs text-indigo-600">
                      {quotationData.quotationNumber} • {quotationData.clientName || quotationData.client?.name} • {quotationData.projectName || quotationData.project?.name}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => navigate(`/quotations/${fromQuote}`)}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-700 underline"
                >
                  View Full Quotation
                </button>
              </div>

              {quotationLoading && (
                <div className="bg-white rounded-xl p-4 text-center">
                  <div className="animate-spin inline-block w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
                  <p className="text-sm text-slate-500 mt-2">Loading quotation details...</p>
                </div>
              )}

              {quotationError && (
                <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                  <p className="text-sm text-red-700">Failed to load quotation details</p>
                  <p className="text-xs text-red-600 mt-1">{quotationError.message}</p>
                </div>
              )}

              {quotationData && (
                <div className="bg-white rounded-xl p-4 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                    Quotation Items & Services
                  </p>

                  {/* Development Budget */}
                  {quotationData.developmentBudget > 0 && (
                    <div className="flex items-center justify-between py-2 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                          1
                        </span>
                        <span className="text-sm font-medium text-slate-700">Development Budget</span>
                      </div>
                      <span className="text-sm font-bold text-indigo-700">
                        {formatINR(quotationData.developmentBudget)}
                      </span>
                    </div>
                  )}

                  {/* Services */}
                  {quotationData.services && quotationData.services.length > 0 ? (
                    quotationData.services.map((service, index) => (
                      <div key={index} className="flex items-center justify-between py-2 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-bold">
                            {(quotationData.developmentBudget > 0 ? 1 : 0) + index + 1}
                          </span>
                          <span className="text-sm font-medium text-slate-700">{service.serviceName}</span>
                        </div>
                        <span className="text-sm font-bold text-purple-700">
                          {formatINR(service.amount || 0)}
                        </span>
                      </div>
                    ))
                  ) : (
                    !quotationData.developmentBudget && (
                      <div className="text-center py-4 text-slate-500 text-sm">
                        No services found in this quotation
                      </div>
                    )
                  )}

                  {/* Debug Info - Remove after testing */}
                  {process.env.NODE_ENV === 'development' && (
                    <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <p className="text-xs font-semibold text-yellow-800 mb-1">Debug Info:</p>
                      <p className="text-xs text-yellow-700">
                        Development Budget: {quotationData.developmentBudget > 0 ? '✅' : '❌'} 
                        {quotationData.developmentBudget > 0 && ` (₹${quotationData.developmentBudget})`}
                      </p>
                      <p className="text-xs text-yellow-700">
                        Services Array: {quotationData.services ? `✅ (${quotationData.services.length} items)` : '❌ null/undefined'}
                      </p>
                      {quotationData.services && (
                        <p className="text-xs text-yellow-700 mt-1">
                          Services: {JSON.stringify(quotationData.services.map(s => s.serviceName))}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Totals */}
                  <div className="pt-3 mt-3 border-t-2 border-indigo-200 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Subtotal</span>
                      <span className="font-semibold text-slate-800">{formatINR(quotationData.subtotal || 0)}</span>
                    </div>
                    {quotationData.cgst > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">CGST</span>
                        <span className="font-semibold text-slate-800">{formatINR(quotationData.cgst || 0)}</span>
                      </div>
                    )}
                    {quotationData.sgst > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">SGST</span>
                        <span className="font-semibold text-slate-800">{formatINR(quotationData.sgst || 0)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-base font-bold pt-2 border-t border-indigo-200">
                      <span className="text-indigo-900">Grand Total</span>
                      <span className="text-indigo-700">{formatINR(quotationData.grandTotal || 0)}</span>
                    </div>
                  </div>

                  {/* Payment Terms */}
                  {quotationData.paymentTerms && (
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <p className="text-xs font-semibold text-slate-600 mb-2">Payment Terms:</p>
                      <p className="text-xs text-slate-500 whitespace-pre-line">{quotationData.paymentTerms}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Installment Plan */}
          {inv.hasInstallmentPlan && inv.installmentPlan && inv.installmentPlan.length > 0 && (
            <div className="crm-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-700">Installment Payment Plan</h3>
                <button 
                  onClick={() => removeInstallmentPlanMut.mutate()}
                  disabled={removeInstallmentPlanMut.isPending}
                  className="text-xs text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
                >
                  Remove Plan
                </button>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-100">
                    <th className="pb-2 font-medium">Installment</th>
                    <th className="pb-2 font-medium text-right">Amount</th>
                    <th className="pb-2 font-medium text-right">Due Date</th>
                    <th className="pb-2 font-medium text-right">Paid</th>
                    <th className="pb-2 font-medium text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {inv.installmentPlan.map((inst, i) => {
                    const statusColor = inst.status === 'paid' ? 'text-green-600 bg-green-50' : 
                                       inst.status === 'partial' ? 'text-amber-600 bg-amber-50' : 
                                       'text-slate-600 bg-slate-50';
                    return (
                      <tr key={inst._id || i} className="border-b border-slate-50">
                        <td className="py-2">
                          <div className="font-medium">{inst.label}</div>
                          {inst.description && <div className="text-xs text-slate-500">{inst.description}</div>}
                        </td>
                        <td className="py-2 text-right font-medium">{formatINR(inst.amount || 0)}</td>
                        <td className="py-2 text-right">{inst.dueDate ? format(new Date(inst.dueDate), 'dd MMM yyyy') : '—'}</td>
                        <td className="py-2 text-right text-green-600 font-medium">{formatINR(inst.paidAmount || 0)}</td>
                        <td className="py-2 text-center">
                          <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${statusColor}`}>
                            {inst.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

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
                <span className="text-xs font-medium text-slate-700">View PDF</span>
              </button>
              <button onClick={() => handlePdf('download')}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors">
                <span className="text-xs font-medium text-slate-700">Download PDF</span>
              </button>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div>
          <div className="crm-card p-5 sticky top-4 space-y-3 text-sm">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Summary</h3>
            
            {inv.installmentLabel && (
              <div className="p-3 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200 mb-3">
                <p className="text-xs text-green-600 font-medium mb-1">This Installment</p>
                <p className="text-lg font-bold text-green-800">{inv.installmentLabel}</p>
              </div>
            )}
            
            {/* This Invoice Summary */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-3 space-y-2">
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">This Invoice</p>
              <div className="flex justify-between text-slate-700">
                <span className="text-xs">Subtotal</span>
                <span className="font-medium">{formatINR(inv.subtotal || 0)}</span>
              </div>
              {inv.tax > 0 && (
                <div className="flex justify-between text-slate-700">
                  <span className="text-xs">GST</span>
                  <span className="font-medium">{formatINR(inv.tax || 0)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-blue-900 text-base border-t border-blue-200 pt-2">
                <span>Invoice Total</span>
                <span>{formatINR(inv.total || 0)}</span>
              </div>

              {/* This invoice's payment status */}
              {(() => {
                const thisPaid = (inv.payments || []).reduce((s, p) => s + (p.amount || 0), 0);
                const thisRemaining = Math.max(0, (inv.total || 0) - thisPaid);
                return (
                  <div className="border-t border-blue-200 pt-2 space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-xs text-green-700">Amount Paid</span>
                      <span className="font-semibold text-green-700">{formatINR(thisPaid)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-orange-700">Amount Due</span>
                      <span className="font-bold text-orange-700">{formatINR(thisRemaining)}</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Payment Schedule — all installments from same quotation */}
            {siblings.length > 0 && (
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200 p-3 mt-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-purple-700 mb-3">Payment Schedule</p>
                <div className="space-y-2">
                  {siblings.map((s) => {
                    const isCurrent = s._id === id;
                    const source = isCurrent ? inv : s;
                    const instPaid = (source.payments || []).reduce((sum, p) => sum + (p.amount || 0), 0);
                    const instDue = Math.max(0, (source.total || 0) - instPaid);
                    const statusColor = source.status === 'paid' ? 'text-green-600' : source.status === 'partial' ? 'text-amber-600' : 'text-slate-500';
                    return (
                      <div
                        key={s._id}
                        onClick={() => !isCurrent && navigate(`/invoices/${s._id}`)}
                        className={`p-2.5 rounded-lg text-xs transition-all ${
                          isCurrent 
                            ? 'bg-white border-2 border-indigo-400 shadow-sm' 
                            : 'bg-white/50 border border-purple-200 hover:bg-white hover:shadow-sm cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <p className={`font-semibold text-sm ${isCurrent ? 'text-indigo-700' : 'text-slate-700'}`}>
                            {s.installmentLabel || s.invoiceNumber}
                            {isCurrent && <span className="ml-1.5 text-indigo-500">◀ Current</span>}
                          </p>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            source.status === 'paid' ? 'bg-green-100 text-green-700' :
                            source.status === 'partial' ? 'bg-amber-100 text-amber-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {source.status}
                          </span>
                        </div>
                        {source.dueDate && (
                          <div className="text-xs text-slate-600 mb-1.5 flex items-center gap-1">
                            <span>📅</span>
                            <span>Due: {format(new Date(source.dueDate), 'dd MMM yyyy')}</span>
                          </div>
                        )}
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="text-center">
                            <div className="text-slate-500 text-[10px] uppercase">Amount</div>
                            <div className="font-semibold text-slate-800">{formatINR(source.total || 0)}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-green-600 text-[10px] uppercase">Paid</div>
                            <div className="font-semibold text-green-700">{formatINR(instPaid)}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-orange-600 text-[10px] uppercase">Due</div>
                            <div className="font-semibold text-orange-700">{formatINR(instDue)}</div>
                          </div>
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
                    <div className="border-t-2 border-purple-300 pt-3 mt-3 space-y-2">
                      <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-2">Project Summary</p>
                      <div className="flex justify-between text-slate-700">
                        <span className="text-xs">Total Contract Value</span>
                        <span className="font-semibold">{formatINR(grandTotal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-green-700">Total Received</span>
                        <span className="font-bold text-green-700">{formatINR(grandPaid)}</span>
                      </div>
                      <div className="flex justify-between bg-orange-100 -mx-3 -mb-3 px-3 py-2.5 rounded-b-xl">
                        <span className="text-sm font-semibold text-orange-800">Outstanding Balance</span>
                        <span className="text-base font-bold text-orange-800">{formatINR(remaining)}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Fallback: no siblings but has budget */}
            {siblings.length === 0 && inv.budget > 0 && (
              <div className="border-t border-slate-100 pt-2 space-y-1">
                <div className="flex justify-between text-slate-600"><span className="text-xs">Project Budget</span><span className="font-medium">{formatINR(inv.budget)}</span></div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Record Payment Modal */}
      <Modal open={payModal} onClose={() => setPayModal(false)} title="Record Payment">
        <div className="space-y-4">
          {/* Select Installment Invoice (if multiple siblings exist) */}
          {siblings.length > 1 && (
            <div>
              <label className="modal-form-label">Select Invoice to Pay *</label>
              <select 
                value={payForm.selectedInvoiceId || id} 
                onChange={e => {
                  const selectedId = e.target.value;
                  const selectedInv = siblings.find(s => s._id === selectedId) || inv;
                  const remaining = Math.max(0, (selectedInv.total || 0) - (selectedInv.payments || []).reduce((s, p) => s + (p.amount || 0), 0));
                  setPayForm(p => ({ 
                    ...p, 
                    selectedInvoiceId: selectedId,
                    amount: remaining > 0 ? remaining.toString() : ''
                  }));
                }}
                className="modal-input"
              >
                {siblings.map(s => {
                  const sPaid = (s.payments || []).reduce((sum, p) => sum + (p.amount || 0), 0);
                  const sRemaining = Math.max(0, (s.total || 0) - sPaid);
                  const statusText = s.status === 'paid' ? '✅ PAID' : sRemaining > 0 ? `⏳ Due: ${formatINR(sRemaining)}` : 'PENDING';
                  return (
                    <option key={s._id} value={s._id} disabled={s.status === 'paid'}>
                      {s.installmentLabel || s.invoiceNumber} - {formatINR(s.total)} ({statusText})
                    </option>
                  );
                })}
              </select>
              <p className="text-xs text-slate-500 mt-1">
                Select which installment invoice you want to record payment for
              </p>
            </div>
          )}

          {/* Payment Summary */}
          {(() => {
            const targetInvoice = siblings.length > 1 && payForm.selectedInvoiceId 
              ? siblings.find(s => s._id === payForm.selectedInvoiceId) || inv
              : inv;
            const targetPaid = (targetInvoice.payments || []).reduce((s, p) => s + (p.amount || 0), 0);
            const targetRemaining = Math.max(0, (targetInvoice.total || 0) - targetPaid);
            
            return (
              <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                {siblings.length > 1 && (
                  <div className="mb-3 pb-2 border-b border-blue-200">
                    <p className="text-xs font-semibold text-blue-700 mb-1">
                      {targetInvoice.installmentLabel || targetInvoice.invoiceNumber}
                    </p>
                  </div>
                )}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Invoice Total:</span>
                    <span className="font-semibold text-slate-900">{formatINR(targetInvoice.total || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-600">Total Paid:</span>
                    <span className="font-semibold text-green-700">{formatINR(targetPaid)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-blue-200">
                    <span className="text-orange-600 font-medium">Remaining Amount:</span>
                    <span className="font-bold text-orange-600 text-lg">{formatINR(targetRemaining)}</span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Transaction History */}
          {(() => {
            const targetInvoice = siblings.length > 1 && payForm.selectedInvoiceId 
              ? siblings.find(s => s._id === payForm.selectedInvoiceId) || inv
              : inv;
            return (targetInvoice.payments || []).length > 0 && (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-xs font-semibold text-slate-600 mb-2">Recent Transactions</p>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {targetInvoice.payments.slice(-3).reverse().map((p, i) => (
                    <div key={i} className="flex justify-between text-xs">
                      <div className="flex-1">
                        <span className="text-slate-700">{p.date ? format(new Date(p.date), 'dd MMM yyyy') : '—'}</span>
                        <span className="text-slate-500 ml-2">• {p.method?.replace('_', ' ')}</span>
                        {p.reference && <span className="text-slate-400 ml-1">({p.reference})</span>}
                      </div>
                      <span className="font-semibold text-green-600">{formatINR(p.amount || 0)}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {inv.hasInstallmentPlan && inv.installmentPlan && inv.installmentPlan.length > 0 && (
            <div>
              <label className="modal-form-label">Select Installment (Optional)</label>
              <select 
                value={payForm.installmentId} 
                onChange={e => setPayForm(p => ({ ...p, installmentId: e.target.value }))} 
                className="modal-input"
              >
                <option value="">General Payment</option>
                {inv.installmentPlan.filter(inst => inst.status !== 'paid').map(inst => (
                  <option key={inst._id} value={inst._id}>
                    {inst.label} - {formatINR(inst.amount)} (Due: {format(new Date(inst.dueDate), 'dd MMM yyyy')})
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="modal-form-label">Amount (₹) *</label>
            <input type="number" min="0" step="0.01" value={payForm.amount}
              onChange={e => setPayForm(p => ({ ...p, amount: e.target.value }))}
              className="modal-input" placeholder="Enter amount" />
            {(() => {
              const targetInvoice = siblings.length > 1 && payForm.selectedInvoiceId 
                ? siblings.find(s => s._id === payForm.selectedInvoiceId) || inv
                : inv;
              const targetPaid = (targetInvoice.payments || []).reduce((s, p) => s + (p.amount || 0), 0);
              const targetRemaining = Math.max(0, (targetInvoice.total || 0) - targetPaid);
              
              return targetRemaining > 0 && (
                <button
                  type="button"
                  onClick={() => setPayForm(p => ({ ...p, amount: targetRemaining.toString() }))}
                  className="mt-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  Pay full remaining amount ({formatINR(targetRemaining)})
                </button>
              );
            })()}
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
            <button 
              onClick={() => {
                // If a different invoice is selected, record payment to that invoice
                const targetId = (siblings.length > 1 && payForm.selectedInvoiceId) ? payForm.selectedInvoiceId : id;
                if (targetId !== id) {
                  // Record payment to the selected sibling invoice
                  invoiceService.recordPayment(targetId, {
                    amount: payForm.amount,
                    method: payForm.method,
                    reference: payForm.reference,
                    installmentId: payForm.installmentId
                  }).then(async () => {
                    // Invalidate all related queries
                    qc.invalidateQueries(['invoice', id]);
                    qc.invalidateQueries(['invoice', targetId]);
                    qc.invalidateQueries(['invoices']);
                    qc.invalidateQueries(['invoice-siblings', fromQuote]);
                    
                    // Force refetch siblings
                    if (refetchSiblings) {
                      await refetchSiblings();
                    }
                    
                    toast.success(`✅ Payment recorded for selected installment!`, { duration: 4000 });
                    setPayModal(false);
                    setPayForm({ amount: '', method: 'bank_transfer', reference: '', installmentId: '', selectedInvoiceId: '' });
                  }).catch(() => {
                    toast.error('❌ Failed to record payment');
                  });
                } else {
                  // Record payment to current invoice
                  payMut.mutate(payForm);
                }
              }} 
              disabled={!payForm.amount || payMut.isPending}
              className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition-colors">
              {payMut.isPending ? 'Saving...' : 'Record Payment'}
            </button>
            <button onClick={() => setPayModal(false)} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* Create Installment Plan Modal */}
      <Modal open={installmentModal} onClose={() => setInstallmentModal(false)} title="Setup Installment Payment Plan">
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 text-sm text-blue-700">
            Invoice Total: {formatINR(inv.total)} - Split this amount across installments
          </div>
          
          {installmentForm.installments.map((inst, idx) => (
            <div key={idx} className="p-4 border border-slate-200 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-700">Installment {idx + 1}</h4>
                {installmentForm.installments.length > 1 && (
                  <button 
                    onClick={() => removeInstallment(idx)}
                    className="text-xs text-red-600 hover:text-red-700"
                  >
                    Remove
                  </button>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="modal-form-label">Label *</label>
                  <input 
                    value={inst.label}
                    onChange={e => updateInstallment(idx, 'label', e.target.value)}
                    className="modal-input text-sm"
                    placeholder="e.g., First Payment"
                  />
                </div>
                <div>
                  <label className="modal-form-label">Amount (₹) *</label>
                  <input 
                    type="number"
                    min="0"
                    value={inst.amount}
                    onChange={e => updateInstallment(idx, 'amount', e.target.value)}
                    className="modal-input text-sm"
                    placeholder="0.00"
                  />
                </div>
              </div>
              
              <div>
                <label className="modal-form-label">Due Date *</label>
                <input 
                  type="date"
                  value={inst.dueDate}
                  onChange={e => updateInstallment(idx, 'dueDate', e.target.value)}
                  className="modal-input text-sm"
                />
              </div>
              
              <div>
                <label className="modal-form-label">Description (Optional)</label>
                <input 
                  value={inst.description}
                  onChange={e => updateInstallment(idx, 'description', e.target.value)}
                  className="modal-input text-sm"
                  placeholder="Additional notes"
                />
              </div>
            </div>
          ))}
          
          <button 
            onClick={addInstallment}
            className="w-full py-2 text-sm text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
          >
            + Add Another Installment
          </button>
          
          <div className="p-3 bg-slate-50 rounded-lg text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Total Installments:</span>
              <span className="font-semibold text-slate-900">
                {formatINR(installmentForm.installments.reduce((sum, inst) => sum + Number(inst.amount || 0), 0))}
              </span>
            </div>
          </div>
          
          <div className="flex gap-3 pt-2">
            <button 
              onClick={handleCreateInstallmentPlan}
              disabled={installmentPlanMut.isPending}
              className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition-colors"
            >
              {installmentPlanMut.isPending ? 'Creating...' : 'Create Plan'}
            </button>
            <button 
              onClick={() => setInstallmentModal(false)}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
      </div> {/* End printable-invoice */}
    </div> {/* End main container */}
    </>
  );
};

export default InvoiceDetail;
