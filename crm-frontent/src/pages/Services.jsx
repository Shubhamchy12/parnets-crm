import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, Puzzle } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import api from '../services/api';
import { formatINR } from '../utils/currency';

const fetchServices = async () => {
  const res = await api.get('/services');
  return res.data.data.services;
};

const ServiceForm = ({ initial = {}, onSubmit, loading }) => {
  const [name, setName] = useState(initial.name || '');
  const [description, setDescription] = useState(initial.description || '');
  const [defaultAmount, setDefaultAmount] = useState(initial.defaultAmount ?? '');

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit({ name, description, defaultAmount }); }} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-600 mb-1.5">Service Name *</label>
        <input className="modal-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. SSL Certificate" required />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-600 mb-1.5">Description</label>
        <textarea className="modal-input" rows={2} value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description" />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-600 mb-1.5">Default Amount (₹)</label>
        <input className="modal-input" type="number" min="0" value={defaultAmount} onChange={e => setDefaultAmount(e.target.value)} placeholder="0" />
      </div>
      <button type="submit" disabled={loading} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50">
        {loading ? 'Saving...' : 'Save'}
      </button>
    </form>
  );
};

const Services = () => {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const { data: services = [], isLoading } = useQuery({ queryKey: ['services'], queryFn: fetchServices });

  const createMut = useMutation({
    mutationFn: (data) => api.post('/services', data),
    onSuccess: () => { qc.invalidateQueries(['services']); toast.success('Service created'); setShowCreate(false); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => api.put(`/services/${id}`, data),
    onSuccess: () => { qc.invalidateQueries(['services']); toast.success('Service updated'); setEditItem(null); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/services/${id}`),
    onSuccess: () => { qc.invalidateQueries(['services']); toast.success('Service deleted'); setDeleteId(null); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  });

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Services / Add-ons"
        subtitle="Manage dynamic services used in quotations"
        actions={
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors">
            <Plus className="w-4 h-4" /> Add Service
          </button>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-24 rounded-2xl bg-slate-100 animate-pulse" />)}
        </div>
      ) : services.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Puzzle className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm">No services yet. Add your first one.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map(s => (
            <div key={s._id} className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col gap-2 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                    <Puzzle className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">{s.name}</p>
                    {s.defaultAmount > 0 && (
                      <p className="text-xs text-indigo-600 font-medium">{formatINR(s.defaultAmount)}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <button onClick={() => setEditItem(s)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-indigo-600 transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setDeleteId(s._id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-500 hover:text-red-500 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              {s.description && <p className="text-xs text-slate-500 leading-relaxed">{s.description}</p>}
            </div>
          ))}
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add Service">
        <ServiceForm onSubmit={createMut.mutate} loading={createMut.isPending} />
      </Modal>

      <Modal open={!!editItem} onClose={() => setEditItem(null)} title="Edit Service">
        {editItem && (
          <ServiceForm
            initial={editItem}
            onSubmit={(data) => updateMut.mutate({ id: editItem._id, data })}
            loading={updateMut.isPending}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteMut.mutate(deleteId)}
        title="Delete Service"
        message="This service will be removed. Existing quotations won't be affected."
        confirmLabel="Delete"
        loading={deleteMut.isPending}
      />
    </div>
  );
};

export default Services;
