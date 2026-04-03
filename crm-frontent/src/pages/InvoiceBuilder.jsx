import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ChevronLeft, CheckCircle2, AlertCircle, Plus, Trash2 } from 'lucide-react';
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
  const [paymentType, setPaymentType] = useState('full');
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [installmentCount, setInstallmentCount] = useState(2);
  const [installments, setInstallments] = useState([
    { label: '1st Installment', amount: '', dueDate: '' },
    { label: '2nd Installment', amount: '', dueDate: '' }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingInvoices, setExistingInvoices] = useState([]);
  const [selectedInstallmentIndexes, setSelectedInstallmentIndexes] = useState([]);

  // Fetch approved quotations
  const { data: quotations = [], isLoading: quotationsLoading, error: quotationsError } = useQuery({
    queryKey: ['approved-quotations'],
    queryFn: () => invoiceService.getApprovedQuotations().then(r => r.data?.data?.quotations || []),
    enabled: !isEdit,
    staleTime: 0,
    cacheTime: 0,
    refetchOnMount: 'always',
  });

  const { data: existing } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => invoiceService.getOne(id).then(r => r.data?.data?.invoice),
    enabled: isEdit,
  });

  // Populate form when editing
  useEffect(() => {
    if (existing) {
      setDueDate(existing.dueDate ? existing.dueDate.slice(0, 10) : '');
      setNotes(existing.notes || '');
    }
  }, [existing]);

  // Resize installments array when count changes
  useEffect(() => {
    setInstallments(prev => {
      const newInstallments = Array.from({ length: installmentCount }, (_, i) => {
        // Keep existing installment data if available
        if (prev[i]) {
          return prev[i];
        }
        
        // Create new installment with auto-calculated due date
        const dueDate = calculateInstallmentDueDate(i, installmentCount);
        
        return {
          label: `${ORDINALS[i] || (i + 1) + 'th'} Installment`,
          amount: '',
          dueDate: dueDate,
        };
      });
      
      return newInstallments;
    });
  }, [installmentCount]);

  // Helper function to calculate installment due dates
  const calculateInstallmentDueDate = (index, total) => {
    if (!selectedQuotation) return '';
    
    // Use quotation validUntil as base, or default to 30 days from now
    let baseDate;
    if (selectedQuotation.validUntil) {
      baseDate = new Date(selectedQuotation.validUntil);
    } else {
      baseDate = new Date();
      baseDate.setDate(baseDate.getDate() + 30);
    }
    
    // Calculate days between installments
    const daysPerInstallment = 15; // 15 days between each installment
    
    // Calculate due date for this installment
    const installmentDate = new Date(baseDate);
    installmentDate.setDate(installmentDate.getDate() + (index * daysPerInstallment));
    
    return installmentDate.toISOString().slice(0, 10);
  };

  // Auto-split total across installments (only if amounts are empty)
  useEffect(() => {
    if (paymentType !== 'installment' || installmentCount === 0) return;
    
    const total = calculateTotal();
    if (total === 0) return;
    
    // Only auto-split if installments don't have amounts set
    const hasAmounts = installments.some(inst => inst.amount && Number(inst.amount) > 0);
    if (hasAmounts) {
      console.log('⏭️ Skipping auto-split - installments already have amounts');
      return; // Don't overwrite existing amounts
    }
    
    const per = Math.round(total / installmentCount);
    
    console.log(`🔢 Auto-splitting ₹${total.toLocaleString('en-IN')} into ${installmentCount} installments`);
    console.log(`   Per installment: ₹${per.toLocaleString('en-IN')}`);
    
    setInstallments(prev =>
      prev.map((inst, i) => {
        const amount = i === installmentCount - 1
          ? String(total - per * (installmentCount - 1))
          : String(per);
        console.log(`   ${i + 1}. ${inst.label}: ₹${Number(amount).toLocaleString('en-IN')}`);
        return { ...inst, amount };
      })
    );
  }, [paymentType, installmentCount, invoiceItems]);

  const calculateTotal = () => {
    return invoiceItems.reduce((sum, item) => sum + (Number(item.rate) || 0) * (Number(item.qty) || 1), 0);
  };

  const calculatePaidAmount = () => {
    return existingInvoices
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + (inv.total || 0), 0);
  };

  const calculateRemainingAmount = () => {
    const total = calculateTotal();
    const paid = calculatePaidAmount();
    return Math.max(0, total - paid);
  };

  const handleQuotationChange = (qId) => {
    const q = quotations.find(q => q._id === qId) || null;
    setSelectedQuotation(q);
    
    if (q) {
      console.log('🔍 Selected Quotation:', q.quotationNumber);
      console.log('   Development Budget:', q.developmentBudget);
      console.log('   Services:', q.services);
      console.log('   Services Count:', (q.services || []).length);
      
      const items = [];
      if (q.developmentBudget > 0) {
        items.push({ description: 'Development Budget', qty: 1, rate: q.developmentBudget });
        console.log('   ✅ Added Development Budget:', q.developmentBudget);
      }
      (q.services || []).forEach((s, index) => {
        items.push({ description: s.serviceName, qty: 1, rate: Number(s.amount) || 0 });
        console.log(`   ✅ Added Service ${index + 1}:`, s.serviceName, '- ₹', s.amount);
      });
      
      console.log('📦 Total Items to be added:', items.length);
      console.log('📋 Items:', items);
      
      setInvoiceItems(items);
      
      // Set default due date from quotation validUntil
      if (q.validUntil) {
        const validDate = new Date(q.validUntil);
        if (!isNaN(validDate.getTime())) {
          setDueDate(validDate.toISOString().slice(0, 10));
        }
      } else {
        // Default to 30 days from now
        const defaultDue = new Date();
        defaultDue.setDate(defaultDue.getDate() + 30);
        setDueDate(defaultDue.toISOString().slice(0, 10));
      }
      
      // Parse payment terms from quotation if available
      if (q.paymentTerms) {
        parsePaymentTermsFromQuotation(q.paymentTerms);
      } else {
        // Reset to default payment type
        setPaymentType('full');
      }
      
      fetchExistingInvoices(q._id);
    } else {
      setInvoiceItems([]);
      setExistingInvoices([]);
      setSelectedInstallmentIndexes([]);
      setDueDate('');
      setPaymentType('full');
    }
  };

  const parsePaymentTermsFromQuotation = (paymentTerms) => {
    console.log('📋 Parsing payment terms:', paymentTerms);
    
    // Pattern 1: With amounts - "1st Installment (1 Jan 2024 - 31 Jan 2024): ₹50,000"
    const patternWithAmount = /(\d+)(?:st|nd|rd|th)\s+Installment\s*(?:\(([^)]+)\))?\s*:?\s*₹?\s*([\d,]+)/gi;
    const matchesWithAmount = [...paymentTerms.matchAll(patternWithAmount)];
    
    // Pattern 2: Without amounts - "1st Installment (1 Apr 2026 - 31 May 2026): Payment due"
    const patternWithoutAmount = /(\d+)(?:st|nd|rd|th)\s+Installment\s*\(([^)]+)\)\s*:?\s*Payment\s+due/gi;
    const matchesWithoutAmount = [...paymentTerms.matchAll(patternWithoutAmount)];
    
    console.log('🔍 Found matches with amounts:', matchesWithAmount.length);
    console.log('🔍 Found matches without amounts:', matchesWithoutAmount.length);
    
    let parsedInstallments = [];
    
    // Try pattern with amounts first
    if (matchesWithAmount.length > 0) {
      parsedInstallments = matchesWithAmount.map((match, i) => {
        const ordinal = match[1];
        const dateRange = match[2] || '';
        const amount = match[3] ? match[3].replace(/,/g, '') : '';
        
        console.log(`  ${i + 1}. ${ordinal} - Range: "${dateRange}" - Amount: ${amount}`);
        
        const dueDate = extractDueDateFromRange(dateRange);
        
        return {
          label: `${ordinal}${getOrdinalSuffix(ordinal)} Installment`,
          amount: amount || '',
          dueDate: dueDate,
        };
      });
    }
    // Try pattern without amounts
    else if (matchesWithoutAmount.length > 0) {
      console.log('💡 No amounts found in payment terms, will auto-calculate equal split');
      
      parsedInstallments = matchesWithoutAmount.map((match, i) => {
        const ordinal = match[1];
        const dateRange = match[2] || '';
        
        console.log(`  ${i + 1}. ${ordinal} - Range: "${dateRange}" - Amount: (will auto-calculate)`);
        
        const dueDate = extractDueDateFromRange(dateRange);
        
        return {
          label: `${ordinal}${getOrdinalSuffix(ordinal)} Installment`,
          amount: '', // Will be auto-calculated by useEffect
          dueDate: dueDate,
        };
      });
    }
    
    if (parsedInstallments.length > 0) {
      console.log('✅ Parsed installments:', parsedInstallments);
      setInstallmentCount(parsedInstallments.length);
      setInstallments(parsedInstallments);
      setPaymentType('installment'); // Auto-switch to installment mode
      return;
    }
    
    console.log('⚠️ No structured installments found, using defaults');
  };

  // Helper function to get ordinal suffix
  const getOrdinalSuffix = (num) => {
    const n = parseInt(num);
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
  };

  // Helper function to extract due date from date range
  const extractDueDateFromRange = (dateRange) => {
    if (!dateRange) return '';
    
    const dateParts = dateRange.split('-');
    if (dateParts.length === 2) {
      const endDateStr = dateParts[1].trim();
      try {
        // Try multiple date formats
        let parsed = new Date(endDateStr);
        
        // If invalid, try parsing with year
        if (isNaN(parsed.getTime())) {
          // Try format: "31 May 2026"
          const parts = endDateStr.split(' ');
          if (parts.length >= 3) {
            const day = parts[0];
            const month = parts[1];
            const year = parts[2];
            parsed = new Date(`${month} ${day}, ${year}`);
          }
        }
        
        if (!isNaN(parsed.getTime())) {
          const dueDateStr = parsed.toISOString().slice(0, 10);
          console.log(`     ✅ Parsed due date: ${dueDateStr}`);
          return dueDateStr;
        }
      } catch (e) {
        console.warn('     ❌ Could not parse date:', endDateStr);
      }
    }
    return '';
  };

  const fetchExistingInvoices = async (quotationId) => {
    try {
      console.log('🔄 Fetching existing invoices for quotation:', quotationId);
      const response = await invoiceService.getByQuote(quotationId);
      const invoices = response.data?.data?.invoices || [];
      console.log('📦 Received invoices:', invoices.length);
      invoices.forEach((inv, i) => {
        console.log(`  ${i + 1}. #${inv.installmentNumber} - ${inv.invoiceNumber}`);
        console.log(`     Status: ${inv.status}`);
        console.log(`     Due: ${inv.dueDate}`);
        console.log(`     Total: ${inv.total}, Paid: ${inv.paidAmount}`);
        console.log(`     Payments:`, inv.payments?.length || 0, 'transactions');
        if (inv.payments && inv.payments.length > 0) {
          inv.payments.forEach((p, pi) => {
            console.log(`       ${pi + 1}. ${p.amount} on ${p.date} via ${p.method}`);
          });
        }
      });
      
      setExistingInvoices(invoices);
      
      // Auto-select unpaid installments
      const unpaidIndexes = [];
      for (let i = 0; i < installments.length; i++) {
        const existingInv = invoices.find(inv => inv.installmentNumber === i + 1);
        if (!existingInv || existingInv.status !== 'paid') {
          unpaidIndexes.push(i);
        }
      }
      console.log('✅ Auto-selected unpaid indexes:', unpaidIndexes);
      setSelectedInstallmentIndexes(unpaidIndexes.slice(0, 1)); // Select first unpaid by default
    } catch (error) {
      console.error('❌ Error fetching existing invoices:', error);
      setExistingInvoices([]);
      setSelectedInstallmentIndexes([0]);
    }
  };

  const addInvoiceItem = () => {
    setInvoiceItems([...invoiceItems, { description: '', qty: 1, rate: 0 }]);
  };

  const updateInvoiceItem = (index, field, value) => {
    setInvoiceItems(prev =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const removeInvoiceItem = (index) => {
    setInvoiceItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateInstallment = (index, field, value) => {
    setInstallments(prev =>
      prev.map((inst, i) => (i === index ? { ...inst, [field]: value } : inst))
    );
  };

  const toggleInstallmentSelection = (index) => {
    setSelectedInstallmentIndexes(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      } else {
        return [...prev, index].sort((a, b) => a - b);
      }
    });
  };

  const recalculateInstallments = () => {
    const total = calculateTotal();
    if (total === 0) {
      toast.error('Please add invoice items first');
      return;
    }
    
    const per = Math.round(total / installmentCount);
    
    console.log(`🔄 Recalculating installments:`);
    console.log(`   Total: ₹${total.toLocaleString('en-IN')}`);
    console.log(`   Count: ${installmentCount}`);
    console.log(`   Per installment: ₹${per.toLocaleString('en-IN')}`);
    
    setInstallments(prev =>
      prev.map((inst, i) => {
        const amount = i === installmentCount - 1
          ? String(total - per * (installmentCount - 1))
          : String(per);
        console.log(`   ${i + 1}. ${inst.label}: ₹${Number(amount).toLocaleString('en-IN')}`);
        return { ...inst, amount };
      })
    );
    
    toast.success('Installment amounts recalculated');
  };

  const totalInstallments = installments.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const invoiceTotal = calculateTotal();
  const totalMismatch = paymentType === 'installment' && totalInstallments !== invoiceTotal;
  const clientInfo = selectedQuotation?.client || null;

  const editMut = useMutation({
    mutationFn: (data) => invoiceService.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries(['invoices']);
      qc.invalidateQueries(['invoice', id]);
      toast.success('Invoice updated');
      navigate(`/invoices/${id}`);
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Update failed'),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isEdit) {
      editMut.mutate({ dueDate, notes });
      return;
    }

    if (!selectedQuotation) return toast.error('Please select an approved quotation');
    if (invoiceItems.length === 0) return toast.error('Please add at least one invoice item');
    if (invoiceItems.some(item => !item.description || Number(item.rate) <= 0)) {
      return toast.error('All items must have a description and amount greater than 0');
    }
    
    if (paymentType === 'installment') {
      if (selectedInstallmentIndexes.length === 0) {
        return toast.error('Please select at least one installment to create');
      }
      const selectedInsts = selectedInstallmentIndexes.map(i => installments[i]);
      if (selectedInsts.some(inst => !inst.amount || Number(inst.amount) <= 0)) {
        return toast.error('All selected installments must have an amount greater than 0');
      }
    }

    const q = selectedQuotation;
    const resolvedClient = q.client || null;
    const clientId = resolvedClient?._id ? String(resolvedClient._id) : (typeof resolvedClient === 'string' ? resolvedClient : null);

    const flatAddress = (() => {
      const addr = resolvedClient?.address;
      if (!addr) return '';
      if (typeof addr === 'string') return addr;
      return [addr.street, addr.city, addr.state, addr.zipCode, addr.country].filter(Boolean).join(', ');
    })();

    setIsSubmitting(true);
    try {
      if (paymentType === 'full') {
        const payload = {
          client: clientId || undefined,
          clientName: resolvedClient?.name || '',
          clientAddress: flatAddress,
          clientPhone: resolvedClient?.phone || '',
          project: (q.project?._id ? String(q.project._id) : null) || undefined,
          projectName: q.project?.name || '',
          fromQuote: q._id,
          quotationNumber: q.quotationNumber,
          items: invoiceItems,
          subtotal: invoiceTotal,
          tax: 0,
          discount: 0,
          total: invoiceTotal,
          budget: invoiceTotal,
          paidAmount: 0,
          totalPaidSoFar: 0,
          remainingAmount: invoiceTotal,
          dueDate: dueDate || undefined,
          notes,
        };

        const res = await invoiceService.create(payload);
        qc.invalidateQueries(['invoices']);
        toast.success('✅ Invoice created successfully!');
        navigate(`/invoices/${res.data?.data?.invoice?._id}`);
      } else {
        // Create multiple installment invoices
        const created = [];
        const failed = [];
        let alreadyPaid = calculatePaidAmount();

        for (const instIndex of selectedInstallmentIndexes) {
          const inst = installments[instIndex];
          const instAmount = Number(inst.amount) || 0;
          const remaining = Math.max(0, invoiceTotal - alreadyPaid - instAmount);

          const payload = {
            client: clientId || undefined,
            clientName: resolvedClient?.name || '',
            clientAddress: flatAddress,
            clientPhone: resolvedClient?.phone || '',
            project: (q.project?._id ? String(q.project._id) : null) || undefined,
            projectName: q.project?.name || '',
            fromQuote: q._id,
            quotationNumber: q.quotationNumber,
            installmentNumber: instIndex + 1,
            installmentLabel: inst.label || `${ORDINALS[instIndex]} Installment`,
            description: inst.label || '',
            items: invoiceItems,
            subtotal: instAmount,
            tax: 0,
            discount: 0,
            total: instAmount,
            budget: invoiceTotal,
            paidAmount: 0,
            totalPaidSoFar: alreadyPaid,
            remainingAmount: remaining,
            dueDate: inst.dueDate || dueDate || undefined,
            notes,
          };

          console.log(`📤 Creating invoice for installment ${instIndex + 1}:`, {
            installmentNumber: payload.installmentNumber,
            installmentLabel: payload.installmentLabel,
            dueDate: payload.dueDate,
            amount: payload.total,
          });

          try {
            const res = await invoiceService.create(payload);
            console.log(`✅ Invoice created:`, res.data?.data?.invoice?.invoiceNumber);
            created.push(res.data?.data?.invoice);
            alreadyPaid += instAmount;
          } catch (err) {
            console.error(`❌ Failed to create installment ${instIndex + 1}:`, err.response?.data || err.message);
            const errData = err.response?.data;
            if (errData?.error === 'DUPLICATE_INSTALLMENT') {
              const existing = errData.existingInvoice;
              failed.push({
                installment: instIndex + 1,
                label: inst.label,
                message: `${inst.label} already exists (Invoice #${existing.invoiceNumber})`,
              });
            } else {
              failed.push({
                installment: instIndex + 1,
                label: inst.label,
                message: errData?.message || 'Failed to create',
              });
            }
          }
        }

        qc.invalidateQueries(['invoices']);
        
        if (created.length > 0 && failed.length === 0) {
          toast.success(`✅ ${created.length} installment invoice(s) created successfully!`);
          navigate(`/invoices/${created[0]?._id}`);
        } else if (created.length > 0 && failed.length > 0) {
          toast.success(`✅ ${created.length} invoice(s) created`);
          failed.forEach(f => toast.error(`❌ ${f.message}`, { duration: 5000 }));
          navigate(`/invoices/${created[0]?._id}`);
        } else {
          failed.forEach(f => toast.error(`❌ ${f.message}`, { duration: 5000 }));
          setIsSubmitting(false);
          return;
        }
      }
    } catch (err) {
      const errData = err.response?.data;
      const errMsg = errData?.message || errData?.error || err.message || 'Failed to create invoice';
      console.error('Invoice create error:', errData, err.message);
      toast.error(`❌ ${errMsg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/invoices')}
          className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-800">
            {isEdit ? 'Edit Invoice' : 'New Invoice'}
          </h1>
          <p className="text-sm text-slate-500">
            {isEdit ? 'Update invoice details' : 'Create invoice from an approved quotation'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {!isEdit && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Step 1 — Select Approved Quotation
            </p>

            <div>
              <Lbl required>Approved Quotation</Lbl>
              {quotationsLoading ? (
                <div className="modal-input flex items-center gap-2 text-slate-400 text-sm">
                  <span className="animate-spin inline-block w-4 h-4 border-2 border-slate-300 border-t-indigo-500 rounded-full" />
                  Loading quotations...
                </div>
              ) : quotationsError ? (
                <div className="flex flex-col gap-2 p-3 bg-red-50 rounded-xl border border-red-200 text-sm text-red-700">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span className="font-medium">Error loading quotations</span>
                  </div>
                  <p className="text-xs text-red-600">
                    {quotationsError.response?.data?.message || quotationsError.message || 'Failed to fetch approved quotations'}
                  </p>
                  <button
                    type="button"
                    onClick={() => qc.invalidateQueries(['approved-quotations'])}
                    className="text-xs text-red-600 hover:text-red-700 font-medium underline text-left"
                  >
                    Try again
                  </button>
                </div>
              ) : quotations.length === 0 ? (
                <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200 text-sm text-amber-700">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  No approved quotations found. Please approve a quotation first.
                </div>
              ) : (
                <select
                  className="modal-input"
                  value={selectedQuotation?._id || ''}
                  onChange={e => handleQuotationChange(e.target.value)}
                  required
                >
                  <option value="">— Select a quotation —</option>
                  {quotations.map(q => (
                    <option key={q._id} value={q._id}>
                      {q.quotationNumber} — {q.client?.name || q.clientName || 'No Client'} | {q.project?.name || q.projectName || 'No Project'} ({formatINR(q.grandTotal || 0)})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {selectedQuotation && clientInfo && (
              <div className="bg-white rounded-xl border border-indigo-200 p-4 shadow-sm mt-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white text-lg font-bold flex-shrink-0 shadow-md">
                    {(clientInfo.name || '?')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-base font-bold text-slate-800">{clientInfo.name}</p>
                      <span className="text-xs text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded-full">
                        Client
                      </span>
                    </div>
                    {clientInfo.company && (
                      <p className="text-sm text-slate-600 mb-1">
                        <span className="font-medium">Company:</span> {clientInfo.company}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                      {clientInfo.email && (
                        <span className="flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full bg-indigo-400"></span>
                          {clientInfo.email}
                        </span>
                      )}
                      {clientInfo.phone && (
                        <span className="flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full bg-indigo-400"></span>
                          {clientInfo.phone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {!isEdit && selectedQuotation && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Step 2 — Invoice Items & Services
            </p>

            <div className="space-y-3">
              {invoiceItems.map((item, i) => (
                <div key={i} className="flex gap-3 items-start p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex-1 grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <Lbl>Description</Lbl>
                      <input
                        className="modal-input"
                        value={item.description}
                        onChange={e => updateInvoiceItem(i, 'description', e.target.value)}
                        placeholder="Service description"
                      />
                    </div>
                    <div>
                      <Lbl>Qty</Lbl>
                      <input
                        className="modal-input"
                        type="number"
                        min="1"
                        value={item.qty}
                        onChange={e => updateInvoiceItem(i, 'qty', e.target.value)}
                      />
                    </div>
                    <div className="col-span-3">
                      <Lbl>Amount (₹)</Lbl>
                      <input
                        className="modal-input"
                        type="number"
                        min="0"
                        value={item.rate}
                        onChange={e => updateInvoiceItem(i, 'rate', e.target.value)}
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeInvoiceItem(i)}
                    className="mt-7 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addInvoiceItem}
              className="w-full py-2 border-2 border-dashed border-indigo-300 text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2 font-medium"
            >
              <Plus className="w-4 h-4" />
              Add Service / Item
            </button>

            <div className="flex justify-between items-center pt-3 border-t-2 border-indigo-200">
              <span className="text-base font-bold text-indigo-700">Total Amount</span>
              <span className="text-lg font-bold text-indigo-700">
                {formatINR(invoiceTotal)}
              </span>
            </div>
          </div>
        )}

        {!isEdit && selectedQuotation && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Step 3 — Payment Type
            </p>

            <div className="grid grid-cols-2 gap-3">
              <label className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                paymentType === 'full' 
                  ? 'border-indigo-500 bg-indigo-50' 
                  : 'border-slate-200 hover:border-indigo-300'
              }`}>
                <input
                  type="radio"
                  name="paymentType"
                  value="full"
                  checked={paymentType === 'full'}
                  onChange={e => {
                    e.preventDefault();
                    setPaymentType(e.target.value);
                  }}
                  className="sr-only"
                />
                <div className="text-center">
                  <p className="text-sm font-bold text-slate-800">Full Payment</p>
                  <p className="text-xs text-slate-500 mt-1">Single invoice for total amount</p>
                </div>
              </label>

              <label className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                paymentType === 'installment' 
                  ? 'border-indigo-500 bg-indigo-50' 
                  : 'border-slate-200 hover:border-indigo-300'
              }`}>
                <input
                  type="radio"
                  name="paymentType"
                  value="installment"
                  checked={paymentType === 'installment'}
                  onChange={e => {
                    e.preventDefault();
                    setPaymentType(e.target.value);
                  }}
                  className="sr-only"
                />
                <div className="text-center">
                  <p className="text-sm font-bold text-slate-800">Installments</p>
                  <p className="text-xs text-slate-500 mt-1">Split into multiple payments</p>
                </div>
              </label>
            </div>

            {existingInvoices.length > 0 && (
              <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
                    Payment Status
                  </p>
                  <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                    {existingInvoices.length} invoice(s)
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center mb-4">
                  <div className="bg-white rounded-lg p-2">
                    <p className="text-xs text-slate-500">Total</p>
                    <p className="text-sm font-bold text-slate-800">{formatINR(invoiceTotal)}</p>
                  </div>
                  <div className="bg-green-100 rounded-lg p-2">
                    <p className="text-xs text-green-600">Paid</p>
                    <p className="text-sm font-bold text-green-700">{formatINR(calculatePaidAmount())}</p>
                  </div>
                  <div className="bg-amber-100 rounded-lg p-2">
                    <p className="text-xs text-amber-600">Remaining</p>
                    <p className="text-sm font-bold text-amber-700">{formatINR(calculateRemainingAmount())}</p>
                  </div>
                </div>

                {/* Transaction Details */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">
                    Transaction History
                  </p>
                  {existingInvoices.map((inv) => (
                    <div key={inv._id} className="bg-white rounded-lg p-3 border border-blue-100">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">
                            {inv.installmentLabel || `Installment ${inv.installmentNumber}`}
                          </p>
                          <p className="text-xs text-slate-500">{inv.invoiceNumber}</p>
                        </div>
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                          inv.status === 'paid' 
                            ? 'bg-green-100 text-green-700' 
                            : inv.status === 'partial'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {inv.status === 'paid' ? 'PAID' : inv.status === 'partial' ? 'PARTIAL' : 'PENDING'}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                        <div>
                          <span className="text-slate-500">Amount:</span>
                          <span className="ml-1 font-semibold text-slate-700">{formatINR(inv.total)}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Paid:</span>
                          <span className="ml-1 font-semibold text-green-600">{formatINR(inv.paidAmount || 0)}</span>
                        </div>
                      </div>

                      {inv.dueDate && (
                        <p className="text-xs text-slate-500 mb-2">
                          📅 Due: {new Date(inv.dueDate).toLocaleDateString('en-IN', { 
                            day: 'numeric', 
                            month: 'short', 
                            year: 'numeric' 
                          })}
                        </p>
                      )}

                      {/* Payment Transactions */}
                      {inv.payments && inv.payments.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-blue-100">
                          <p className="text-xs font-medium text-slate-600 mb-1">Payments:</p>
                          <div className="space-y-1">
                            {inv.payments.map((payment, idx) => (
                              <div key={payment._id || idx} className="flex items-center justify-between text-xs bg-green-50 rounded px-2 py-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-green-600">💰</span>
                                  <span className="text-slate-600">
                                    {new Date(payment.date).toLocaleDateString('en-IN', { 
                                      day: 'numeric', 
                                      month: 'short',
                                      year: 'numeric'
                                    })}
                                  </span>
                                  {payment.method && (
                                    <span className="text-slate-500">• {payment.method}</span>
                                  )}
                                  {payment.reference && (
                                    <span className="text-slate-500">• Ref: {payment.reference}</span>
                                  )}
                                </div>
                                <span className="font-semibold text-green-700">{formatINR(payment.amount)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {inv.status !== 'paid' && inv.remainingAmount > 0 && (
                        <div className="mt-2 pt-2 border-t border-amber-100">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-amber-600 font-medium">Remaining Balance:</span>
                            <span className="font-bold text-amber-700">{formatINR(inv.remainingAmount)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!isEdit && selectedQuotation && paymentType === 'installment' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Step 4 — Installment Setup
            </p>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Lbl>Number of Installments</Lbl>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      // Force clear amounts first
                      setInstallments(prev => prev.map(inst => ({ ...inst, amount: '' })));
                      // Then recalculate will trigger via useEffect
                      setTimeout(recalculateInstallments, 100);
                    }}
                    className="text-xs text-purple-600 hover:text-purple-700 font-medium underline"
                  >
                    Clear & Auto-Split
                  </button>
                  <button
                    type="button"
                    onClick={recalculateInstallments}
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-medium underline"
                  >
                    Recalculate
                  </button>
                </div>
              </div>
              <select
                className="modal-input"
                value={installmentCount}
                onChange={e => setInstallmentCount(Number(e.target.value))}
              >
                {[2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                  <option key={n} value={n}>
                    {n} Installments
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1.5">
                Click "Clear & Auto-Split" to evenly divide the total amount
              </p>
            </div>

            {existingInvoices.length > 0 && (
              <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-3">
                  Existing Installments
                </p>
                <div className="space-y-2">
                  {existingInvoices.map((inv, i) => (
                    <div 
                      key={inv._id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        inv.status === 'paid' 
                          ? 'bg-green-50 border-green-200' 
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                          inv.status === 'paid' ? 'bg-green-500 text-white' : 'bg-slate-300 text-slate-600'
                        }`}>
                          {i + 1}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">
                            {inv.installmentLabel || `${ORDINALS[i]} Installment`}
                          </p>
                          <p className="text-xs text-slate-500">{inv.invoiceNumber}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-800">{formatINR(inv.total)}</p>
                        {inv.status === 'paid' ? (
                          <span className="text-xs font-semibold text-green-600 flex items-center gap-1 justify-end">
                            <CheckCircle2 className="w-3 h-3" /> Paid
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-slate-500">Pending</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border-2 border-purple-200 p-4">
              <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-3">
                Select Installments to Create
              </p>
              <div className="space-y-2">
                {installments.map((inst, i) => {
                  const existingInvoice = existingInvoices.find(inv => inv.installmentNumber === i + 1);
                  const isPaid = existingInvoice?.status === 'paid';
                  const isSelected = selectedInstallmentIndexes.includes(i);
                  const isDisabled = isPaid;
                  
                  return (
                    <label 
                      key={i}
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                        isPaid 
                          ? 'bg-green-100 border-green-300 cursor-not-allowed opacity-60' 
                          : isSelected
                          ? 'bg-indigo-50 border-indigo-400 cursor-pointer'
                          : 'bg-white border-slate-300 cursor-pointer hover:border-indigo-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => !isDisabled && toggleInstallmentSelection(i)}
                        disabled={isDisabled}
                        className="w-5 h-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            isPaid ? 'bg-green-500 text-white' : isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-400 text-white'
                          }`}>
                            {i + 1}
                          </span>
                          <span className="text-sm font-semibold text-slate-800">
                            {inst.label || `${ORDINALS[i]} Installment`}
                          </span>
                        </div>
                        <div className="ml-8 mt-1 space-y-0.5">
                          {/* Status */}
                          <p className="text-xs">
                            {existingInvoice ? (
                              <>
                                {isPaid ? (
                                  <span className="text-green-600 font-medium">✅ Paid</span>
                                ) : existingInvoice.status === 'partial' ? (
                                  <span className="text-amber-600 font-medium">⚠️ Partially Paid</span>
                                ) : (
                                  <span className="text-amber-600 font-medium">⏳ Pending Payment</span>
                                )}
                                <span className="text-slate-500"> • {existingInvoice.invoiceNumber}</span>
                              </>
                            ) : (
                              <span className="text-slate-400">Not created yet</span>
                            )}
                          </p>
                          
                          {/* Due Date */}
                          {(existingInvoice?.dueDate || inst.dueDate) && (
                            <p className="text-xs text-slate-500">
                              📅 Due: {new Date(existingInvoice?.dueDate || inst.dueDate).toLocaleDateString('en-IN', { 
                                day: 'numeric', 
                                month: 'short', 
                                year: 'numeric' 
                              })}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-800">
                          {formatINR(inst.amount || 0)}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
              <p className="text-xs text-purple-600 mt-3 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                Select one or more installments to create ({selectedInstallmentIndexes.length} selected)
              </p>
            </div>

            {selectedInstallmentIndexes.length > 0 && (
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border-2 border-indigo-200 p-4">
                <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide mb-3">
                  Selected Installment Details ({selectedInstallmentIndexes.length})
                </p>
                <div className="space-y-3">
                  {selectedInstallmentIndexes.map((instIndex) => (
                    <div key={instIndex} className="bg-white rounded-lg p-3 border border-indigo-200">
                      <p className="text-xs font-semibold text-indigo-600 mb-2">
                        {ORDINALS[instIndex] || `${instIndex + 1}th`} Installment
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Lbl>Label</Lbl>
                          <input
                            className="modal-input text-sm"
                            value={installments[instIndex].label}
                            onChange={e => updateInstallment(instIndex, 'label', e.target.value)}
                            placeholder="e.g. At project start"
                          />
                        </div>
                        <div>
                          <Lbl>Amount (₹)</Lbl>
                          <input
                            className="modal-input text-sm"
                            type="number"
                            min="0"
                            value={installments[instIndex].amount}
                            onChange={e => updateInstallment(instIndex, 'amount', e.target.value)}
                            placeholder="0"
                          />
                        </div>
                        <div className="col-span-2">
                          <Lbl>Due Date</Lbl>
                          <input
                            className="modal-input text-sm"
                            type="date"
                            value={installments[instIndex].dueDate}
                            onChange={e => updateInstallment(instIndex, 'dueDate', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {totalMismatch && (
              <p className="text-xs text-orange-500 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                Installment total ({formatINR(totalInstallments)}) doesn't match invoice total ({formatINR(invoiceTotal)})
              </p>
            )}
          </div>
        )}

        {!isEdit && selectedQuotation && paymentType === 'full' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Step 4 — Additional Details
            </p>
            <div>
              <Lbl>Invoice Due Date</Lbl>
              <input
                className="modal-input"
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
              />
              {selectedQuotation?.validUntil && (
                <p className="text-xs text-slate-500 mt-1">
                  Quotation valid until: {new Date(selectedQuotation.validUntil).toLocaleDateString('en-IN')}
                </p>
              )}
            </div>
            <div>
              <Lbl>Additional Notes</Lbl>
              <textarea
                className="modal-input"
                rows={3}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Any additional notes..."
              />
            </div>
          </div>
        )}

        {isEdit && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Invoice Details
            </p>
            <div>
              <Lbl>Invoice Due Date</Lbl>
              <input
                className="modal-input"
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
              />
            </div>
            <div>
              <Lbl>Additional Notes</Lbl>
              <textarea
                className="modal-input"
                rows={3}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Any additional notes..."
              />
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate('/invoices')}
            className="flex-1 py-3 border border-slate-300 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || editMut.isPending}
            className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
          >
            {isSubmitting || editMut.isPending
              ? 'Saving...'
              : isEdit
              ? 'Update Invoice'
              : paymentType === 'installment' && selectedInstallmentIndexes.length > 0
              ? selectedInstallmentIndexes.length === 1
                ? `Create ${ORDINALS[selectedInstallmentIndexes[0]] || `${selectedInstallmentIndexes[0] + 1}th`} Installment`
                : `Create ${selectedInstallmentIndexes.length} Installments`
              : 'Create Invoice'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default InvoiceBuilder;
