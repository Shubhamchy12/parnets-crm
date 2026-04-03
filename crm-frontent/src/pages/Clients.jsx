import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { clientService } from '../services/clientService';
import api from '../services/api';
import PageHeader from '../components/common/PageHeader';
import DataTable from '../components/common/DataTable';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import toast from 'react-hot-toast';
import { Plus, Search, Users, X, Upload, FileText, UserCircle2 } from 'lucide-react';
import { MdOutlineRemoveRedEye } from 'react-icons/md';
import { RiDeleteBin6Line } from 'react-icons/ri';

const INDUSTRIES = ['Technology','Healthcare','Finance','Education','Retail','Manufacturing','Real Estate','Hospitality','Logistics','Media','Government','Other'];

const EMPTY_FORM = {
  name: '', email: '', phone: '', landline: '', company: '',
  industry: '', gstNumber: '', panNumber: '',
  street: '', city: '', state: '', zipCode: '', country: 'India',
  status: 'active', notes: '',
  bankName: '', accountHolderName: '', accountNumber: '', ifscCode: '', branchName: '',
};

const SectionTitle = ({ children }) => (
  <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-3)' }}>{children}</p>
);

const Field = ({ label, children }) => (
  <div>
    <label className="modal-form-label">{label}</label>
    {children}
  </div>
);

// Reusable file picker
const FilePicker = ({ label, file, onChange }) => {
  const ref = useRef();
  return (
    <div>
      <label className="modal-form-label">{label}</label>
      <div
        onClick={() => ref.current?.click()}
        className="flex items-center gap-3 border border-dashed border-slate-300 rounded-xl px-3 py-2.5 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-colors"
      >
        {file ? (
          <>
            <FileText className="w-4 h-4 text-indigo-500 flex-shrink-0" />
            <span className="text-xs text-slate-700 truncate flex-1">{file.name}</span>
            <button type="button" onClick={e => { e.stopPropagation(); onChange(null); }} className="text-slate-400 hover:text-red-500">
              <X className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <>
            <Upload className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span className="text-xs text-slate-400">Click to upload (PDF, JPG, PNG)</span>
          </>
        )}
      </div>
      <input ref={ref} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" className="hidden"
        onChange={e => onChange(e.target.files?.[0] || null)} />
    </div>
  );
};

const Clients = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const photoRef = useRef();

  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [docFiles, setDocFiles] = useState({ aadhaarDoc: null, panDoc: null, gstDoc: null });

  const setDoc = (key, file) => setDocFiles(p => ({ ...p, [key]: file }));

  const setField = (key, val) => setForm(p => ({ ...p, [key]: val }));

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const resetForm = () => {
    setForm({ ...EMPTY_FORM });
    setPhotoFile(null);
    setPhotoPreview(null);
    setDocFiles({ aadhaarDoc: null, panDoc: null, gstDoc: null });
  };

  const { data, isLoading } = useQuery({
    queryKey: ['clients', search],
    queryFn: () => clientService.getAll({ search }).then(r => r.data?.data?.clients || r.data?.clients || []),
  });

  const createMut = useMutation({
    mutationFn: (fd) => api.post('/clients/register', fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Client registered');
      setModal(false);
      resetForm();
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to register client'),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => clientService.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clients'] }); toast.success('Deleted'); setDeleteId(null); },
    onError: () => toast.error('Failed to delete'),
  });

  const handleSubmit = () => {
    if (!form.name.trim()) return toast.error('Client name is required');
    if (!form.email.trim()) return toast.error('Email is required');
    if (!form.phone.trim()) return toast.error('Phone is required');

    const fd = new FormData();
    // text fields
    Object.entries(form).forEach(([k, v]) => { if (v !== undefined && v !== '') fd.append(k, v); });
    if (photoFile) fd.append('photo', photoFile);
    Object.entries(docFiles).forEach(([k, f]) => { if (f) fd.append(k, f); });
    createMut.mutate(fd);
  };

  const columns = [
    {
      key: 'name', label: 'Client',
      render: (v, row) => (
        <div className="flex items-center gap-2.5">
          {row.photo?.filename ? (
            <img src={`${ 'https://parnetscrm.onrender.com'}/api/clients/docs/${row.photo.filename}`}
              alt={v} className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-slate-200" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-indigo-600">{v?.[0]?.toUpperCase()}</span>
            </div>
          )}
          <span className="font-semibold" style={{ color: 'var(--text-1)' }}>{v}</span>
        </div>
      ),
    },
    { key: 'company', label: 'Company' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'industry', label: 'Industry', render: v => v || '—' },
    { key: 'status', label: 'Status', render: v => <StatusBadge status={v || 'active'} /> },
    { key: '_id', label: 'Actions', sortable: false, render: (v) => (
      <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
        <button title="View" onClick={() => navigate(`/clients/${v}`)}
          className="p-1.5 rounded-lg transition-colors hover:bg-indigo-50 text-indigo-600">
          <MdOutlineRemoveRedEye size={17} />
        </button>
        <button title="Delete" onClick={() => setDeleteId(v)}
          className="p-1.5 rounded-lg transition-colors hover:bg-red-50 text-red-500">
          <RiDeleteBin6Line size={16} />
        </button>
      </div>
    )},
  ];

  return (
    <div>
      <PageHeader title="Clients"
        breadcrumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'Clients' }]}
        actions={
          <button onClick={() => setModal(true)}
            className="modal-btn-primary flex items-center gap-2 px-4 py-2">
            <Plus className="w-4 h-4" /> New Client
          </button>
        }
      />

      <div className="crm-card p-5">
        <div className="relative mb-5 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clients..."
            className="crm-input pl-9" />
        </div>
        <DataTable columns={columns} data={data || []} loading={isLoading}
          onRowClick={row => navigate(`/clients/${row._id}`)} />
      </div>

      {/* ── Registration Modal ── */}
      <Modal open={modal} onClose={() => { setModal(false); resetForm(); }}
        title="Register New Client" subtitle="Fill in all client details" icon={Users} size="xl">
        <div className="space-y-7">

          {/* Client Photo */}
          <div className="flex flex-col items-center gap-3">
            <div
              onClick={() => photoRef.current?.click()}
              className="w-24 h-24 rounded-full overflow-hidden bg-slate-100 border-4 border-indigo-100 flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
            >
              {photoPreview
                ? <img src={photoPreview} alt="Client" className="w-full h-full object-cover" />
                : <UserCircle2 className="w-10 h-10 text-slate-300" />
              }
            </div>
            <p className="text-xs text-slate-400">Click to upload client photo</p>
            <input ref={photoRef} type="file" accept=".jpg,.jpeg,.png" className="hidden" onChange={handlePhotoChange} />
          </div>

          {/* Basic Information */}
          <div>
            <SectionTitle>Basic Information</SectionTitle>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Client Name *">
                <input value={form.name} onChange={e => setField('name', e.target.value)} className="modal-input" placeholder="Full name" />
              </Field>
              <Field label="Company Name">
                <input value={form.company} onChange={e => setField('company', e.target.value)} className="modal-input" placeholder="Company / Organization" />
              </Field>
              <Field label="Email Address *">
                <input type="email" value={form.email} onChange={e => setField('email', e.target.value)} className="modal-input" placeholder="email@company.com" />
              </Field>
              <Field label="Mobile Number *">
                <input type="tel" maxLength={10} value={form.phone}
                  onKeyDown={e => { if (!/[\d\b]/.test(e.key) && !['ArrowLeft','ArrowRight','Delete','Tab'].includes(e.key)) e.preventDefault(); }}
                  onChange={e => setField('phone', e.target.value)} className="modal-input" placeholder="10-digit mobile" />
              </Field>
              <Field label="Landline Number">
                <input type="tel" value={form.landline} onChange={e => setField('landline', e.target.value)} className="modal-input" placeholder="022-12345678" />
              </Field>
              <Field label="Industry">
                <select value={form.industry} onChange={e => setField('industry', e.target.value)} className="modal-input">
                  <option value="">Select industry...</option>
                  {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </Field>
              <Field label="GST Number">
                <input value={form.gstNumber} onChange={e => setField('gstNumber', e.target.value)} className="modal-input" placeholder="22AAAAA0000A1Z5" />
              </Field>
              <Field label="PAN Number">
                <input value={form.panNumber} onChange={e => setField('panNumber', e.target.value.toUpperCase())} className="modal-input" placeholder="ABCDE1234F" />
              </Field>
            </div>
          </div>

          {/* Address */}
          <div>
            <SectionTitle>Address</SectionTitle>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Field label="Street Address">
                  <input value={form.street} onChange={e => setField('street', e.target.value)} className="modal-input" placeholder="Street / Building / Area" />
                </Field>
              </div>
              <Field label="City">
                <input value={form.city} onChange={e => setField('city', e.target.value)} className="modal-input" placeholder="City" />
              </Field>
              <Field label="State">
                <input value={form.state} onChange={e => setField('state', e.target.value)} className="modal-input" placeholder="State" />
              </Field>
              <Field label="PIN Code">
                <input value={form.zipCode} onChange={e => setField('zipCode', e.target.value)} className="modal-input" placeholder="400001" />
              </Field>
              <Field label="Country">
                <input value={form.country} onChange={e => setField('country', e.target.value)} className="modal-input" placeholder="India" />
              </Field>
            </div>
          </div>

          {/* Bank Details */}
          <div>
            <SectionTitle>Bank Details</SectionTitle>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Bank Name">
                <input value={form.bankName} onChange={e => setField('bankName', e.target.value)} className="modal-input" placeholder="State Bank of India" />
              </Field>
              <Field label="Account Holder Name">
                <input value={form.accountHolderName} onChange={e => setField('accountHolderName', e.target.value)} className="modal-input" placeholder="Account holder" />
              </Field>
              <Field label="Account Number">
                <input value={form.accountNumber} onChange={e => setField('accountNumber', e.target.value)} className="modal-input" placeholder="1234567890" />
              </Field>
              <Field label="IFSC Code">
                <input value={form.ifscCode} onChange={e => setField('ifscCode', e.target.value.toUpperCase())} className="modal-input" placeholder="SBIN0001234" />
              </Field>
              <Field label="Branch Name">
                <input value={form.branchName} onChange={e => setField('branchName', e.target.value)} className="modal-input" placeholder="MG Road Branch" />
              </Field>
            </div>
          </div>

          {/* Document Upload */}
          <div>
            <SectionTitle>Document Upload</SectionTitle>
            <p className="text-xs text-slate-400 mb-4">PDF, JPG, PNG or DOC — max 10 MB each</p>
            <div className="grid grid-cols-2 gap-4">
              <FilePicker label="Aadhar Card" file={docFiles.aadhaarDoc} onChange={f => setDoc('aadhaarDoc', f)} />
              <FilePicker label="PAN Card" file={docFiles.panDoc} onChange={f => setDoc('panDoc', f)} />
              <div className="col-span-2">
                <FilePicker label="GST Document" file={docFiles.gstDoc} onChange={f => setDoc('gstDoc', f)} />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Field label="Notes">
              <textarea value={form.notes} onChange={e => setField('notes', e.target.value)}
                rows={2} className="modal-input" style={{ resize: 'none' }} placeholder="Any initial notes..." />
            </Field>
          </div>

          <div className="flex gap-3 pt-1">
            <button onClick={handleSubmit} disabled={createMut.isPending} className="modal-btn-primary disabled:opacity-50">
              {createMut.isPending ? 'Registering...' : 'Register Client'}
            </button>
            <button onClick={() => { setModal(false); resetForm(); }} className="modal-btn-secondary">Cancel</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)}
        onConfirm={() => deleteMut.mutate(deleteId)} loading={deleteMut.isPending}
        title="Delete Client?" message="This action cannot be undone." />
    </div>
  );
};

export default Clients;
