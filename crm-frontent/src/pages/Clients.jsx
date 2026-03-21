import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { clientService } from '../services/clientService';
import PageHeader from '../components/common/PageHeader';
import DataTable from '../components/common/DataTable';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import toast from 'react-hot-toast';
import { Plus, Search, Users, Trash2, X } from 'lucide-react';
import { MdOutlineRemoveRedEye } from 'react-icons/md';
import { RiDeleteBin6Line } from 'react-icons/ri';

const EMPTY_CONTACT = { name: '', designation: '', email: '', phone: '', isPrimary: false };

const INDUSTRIES = ['Technology', 'Healthcare', 'Finance', 'Education', 'Retail', 'Manufacturing', 'Real Estate', 'Hospitality', 'Logistics', 'Media', 'Government', 'Other'];
const SOURCES = [
  { value: 'referral', label: 'Referral' },
  { value: 'website', label: 'Website' },
  { value: 'cold_call', label: 'Cold Call' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'advertisement', label: 'Advertisement' },
  { value: 'other', label: 'Other' },
];
const TAG_OPTIONS = ['VIP', 'Startup', 'Government', 'Retainer', 'Enterprise', 'SME'];

const Clients = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const [form, setForm] = useState({
    name: '', email: '', phone: '', company: '',
    industry: '', gstNumber: '', website: '',
    address: { street: '', city: '', state: '', zipCode: '', country: 'India' },
    source: 'other', status: 'active', notes: '', tags: [],
  });
  const [contacts, setContacts] = useState([{ ...EMPTY_CONTACT }]);
  const [tagInput, setTagInput] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['clients', search],
    queryFn: () => clientService.getAll({ search }).then(r => r.data?.data?.clients || r.data?.clients || []),
  });

  const resetForm = () => {
    setForm({ name: '', email: '', phone: '', company: '', industry: '', gstNumber: '', website: '', address: { street: '', city: '', state: '', zipCode: '', country: 'India' }, source: 'other', status: 'active', notes: '', tags: [] });
    setContacts([{ ...EMPTY_CONTACT }]);
    setTagInput('');
  };

  const createMut = useMutation({
    mutationFn: (payload) => clientService.create(payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clients'] }); toast.success('Client created'); setModal(false); resetForm(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to create client'),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => clientService.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clients'] }); toast.success('Deleted'); setDeleteId(null); },
    onError: () => toast.error('Failed to delete'),
  });

  const handleSubmit = () => {
    if (!form.name.trim()) return toast.error('Client name is required');
    if (!form.email.trim()) return toast.error('Email is required');
    if (!form.phone.trim() || !/^\d{10}$/.test(form.phone)) return toast.error('Phone must be 10 digits');
    if (!form.company.trim()) return toast.error('Company name is required');

    const validContacts = contacts.filter(c => c.name.trim());
    const payload = {
      ...form,
      contacts: validContacts,
      notes: form.notes ? [{ content: form.notes }] : [],
    };
    createMut.mutate(payload);
  };

  const addContact = () => setContacts(p => [...p, { ...EMPTY_CONTACT }]);
  const removeContact = (i) => setContacts(p => p.filter((_, idx) => idx !== i));
  const updateContact = (i, field, value) => {
    setContacts(p => p.map((c, idx) => {
      if (idx !== i) return c;
      // If marking primary, unset others
      if (field === 'isPrimary' && value) return { ...c, isPrimary: true };
      return { ...c, [field]: value };
    }).map((c, idx) => field === 'isPrimary' && value && idx !== i ? { ...c, isPrimary: false } : c));
  };

  const toggleTag = (tag) => {
    setForm(p => ({
      ...p,
      tags: p.tags.includes(tag) ? p.tags.filter(t => t !== tag) : [...p.tags, tag],
    }));
  };

  const addCustomTag = () => {
    const t = tagInput.trim();
    if (t && !form.tags.includes(t)) setForm(p => ({ ...p, tags: [...p.tags, t] }));
    setTagInput('');
  };

  const columns = [
    { key: 'name', label: 'Name', render: v => <span className="font-semibold" style={{ color: 'var(--text-1)' }}>{v}</span> },
    { key: 'company', label: 'Company' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'industry', label: 'Industry', render: v => v || '—' },
    { key: 'source', label: 'Source', render: v => v ? v.replace(/_/g, ' ') : '—' },
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
        <DataTable columns={columns} data={data || []} loading={isLoading} onRowClick={row => navigate(`/clients/${row._id}`)} />
      </div>

      <Modal open={modal} onClose={() => { setModal(false); resetForm(); }} title="Register New Client" subtitle="Fill in all client details" icon={Users} size="xl">
        <div className="space-y-6">

          {/* Basic Info */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-3)' }}>Basic Information</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="modal-form-label">Full Name *</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="modal-input" placeholder="Client full name" />
              </div>
              <div>
                <label className="modal-form-label">Company Name *</label>
                <input value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))} className="modal-input" placeholder="Company / Organization" />
              </div>
              <div>
                <label className="modal-form-label">Email Address *</label>
                <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className="modal-input" placeholder="email@company.com" />
              </div>
              <div>
                <label className="modal-form-label">Phone Number *</label>
                <input type="tel" maxLength={10} value={form.phone}
                  onKeyDown={e => { if (!/[\d\b]/.test(e.key) && !['ArrowLeft','ArrowRight','Delete','Tab'].includes(e.key)) e.preventDefault(); }}
                  onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className="modal-input" placeholder="10-digit number" />
              </div>
              <div>
                <label className="modal-form-label">Industry Type</label>
                <select value={form.industry} onChange={e => setForm(p => ({ ...p, industry: e.target.value }))} className="modal-input">
                  <option value="">Select industry...</option>
                  {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <div>
                <label className="modal-form-label">GST Number</label>
                <input value={form.gstNumber} onChange={e => setForm(p => ({ ...p, gstNumber: e.target.value }))} className="modal-input" placeholder="22AAAAA0000A1Z5" />
              </div>
              <div className="col-span-2">
                <label className="modal-form-label">Website</label>
                <input value={form.website} onChange={e => setForm(p => ({ ...p, website: e.target.value }))} className="modal-input" placeholder="https://company.com" />
              </div>
            </div>
          </div>

          {/* Address */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-3)' }}>Full Address</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="modal-form-label">Street Address</label>
                <input value={form.address.street} onChange={e => setForm(p => ({ ...p, address: { ...p.address, street: e.target.value } }))} className="modal-input" placeholder="Street / Building / Area" />
              </div>
              <div>
                <label className="modal-form-label">City</label>
                <input value={form.address.city} onChange={e => setForm(p => ({ ...p, address: { ...p.address, city: e.target.value } }))} className="modal-input" placeholder="City" />
              </div>
              <div>
                <label className="modal-form-label">State</label>
                <input value={form.address.state} onChange={e => setForm(p => ({ ...p, address: { ...p.address, state: e.target.value } }))} className="modal-input" placeholder="State" />
              </div>
              <div>
                <label className="modal-form-label">ZIP / PIN Code</label>
                <input value={form.address.zipCode} onChange={e => setForm(p => ({ ...p, address: { ...p.address, zipCode: e.target.value } }))} className="modal-input" placeholder="400001" />
              </div>
              <div>
                <label className="modal-form-label">Country</label>
                <input value={form.address.country} onChange={e => setForm(p => ({ ...p, address: { ...p.address, country: e.target.value } }))} className="modal-input" placeholder="India" />
              </div>
            </div>
          </div>

          {/* Contact Persons */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Contact Persons</p>
              <button type="button" onClick={addContact}
                className="flex items-center gap-1 text-xs px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors">
                <Plus className="w-3 h-3" /> Add Contact
              </button>
            </div>
            <div className="space-y-3">
              {contacts.map((c, i) => (
                <div key={i} className="p-3 rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface2)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium" style={{ color: 'var(--text-3)' }}>Contact {i + 1}</span>
                    {contacts.length > 1 && (
                      <button onClick={() => removeContact(i)} className="text-red-400 hover:text-red-600 transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="modal-form-label">Name *</label>
                      <input value={c.name} onChange={e => updateContact(i, 'name', e.target.value)} className="modal-input" placeholder="Contact name" />
                    </div>
                    <div>
                      <label className="modal-form-label">Designation</label>
                      <input value={c.designation} onChange={e => updateContact(i, 'designation', e.target.value)} className="modal-input" placeholder="CEO, Manager..." />
                    </div>
                    <div>
                      <label className="modal-form-label">Email</label>
                      <input type="email" value={c.email} onChange={e => updateContact(i, 'email', e.target.value)} className="modal-input" placeholder="contact@company.com" />
                    </div>
                    <div>
                      <label className="modal-form-label">Phone</label>
                      <input type="tel" value={c.phone} onChange={e => updateContact(i, 'phone', e.target.value)} className="modal-input" placeholder="Phone number" />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 mt-2 cursor-pointer">
                    <input type="checkbox" checked={c.isPrimary} onChange={e => updateContact(i, 'isPrimary', e.target.checked)} className="rounded" />
                    <span className="text-xs" style={{ color: 'var(--text-2)' }}>Mark as primary contact</span>
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Other Details */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-3)' }}>Other Details</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="modal-form-label">Client Source</label>
                <select value={form.source} onChange={e => setForm(p => ({ ...p, source: e.target.value }))} className="modal-input">
                  {SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="modal-form-label">Status</label>
                <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} className="modal-input">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="modal-form-label">Tags</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {TAG_OPTIONS.map(tag => (
                    <button key={tag} type="button" onClick={() => toggleTag(tag)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${form.tags.includes(tag) ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-200 text-slate-600 hover:border-indigo-300'}`}>
                      {tag}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input value={tagInput} onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomTag())}
                    className="modal-input flex-1" placeholder="Custom tag (press Enter)" />
                  <button type="button" onClick={addCustomTag} className="px-3 py-2 text-xs bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">Add</button>
                </div>
                {form.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {form.tags.map(t => (
                      <span key={t} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {t}
                        <button onClick={() => setForm(p => ({ ...p, tags: p.tags.filter(x => x !== t) }))} className="hover:text-red-500 transition-colors">
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="col-span-2">
                <label className="modal-form-label">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  rows={2} className="modal-input" style={{ resize: 'none' }} placeholder="Any initial notes about this client..." />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={handleSubmit} disabled={createMut.isPending} className="modal-btn-primary disabled:opacity-50">
              {createMut.isPending ? 'Creating...' : 'Register Client'}
            </button>
            <button onClick={() => { setModal(false); resetForm(); }} className="modal-btn-secondary">Cancel</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteMut.mutate(deleteId)} loading={deleteMut.isPending} title="Delete Client?" message="This action cannot be undone." />
    </div>
  );
};

export default Clients;
