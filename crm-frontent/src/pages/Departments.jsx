import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, Building2 } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import Modal from '../components/common/Modal';
import api from '../services/api';

const fetchDepartments = async () => {
  const res = await api.get('/departments');
  return res.data.data.departments;
};

const DeptForm = ({ initial = {}, onSubmit, loading }) => {
  const [name, setName] = useState(initial.name || '');
  const [description, setDescription] = useState(initial.description || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ name, description });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-600 mb-1.5">Department Name *</label>
        <input
          className="modal-input"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Engineering"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-600 mb-1.5">Description</label>
        <textarea
          className="modal-input"
          rows={3}
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Optional description"
        />
      </div>
      <div className="flex gap-3 pt-1">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  );
};

const Departments = () => {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const { data: departments = [], isLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: fetchDepartments,
  });

  const createMut = useMutation({
    mutationFn: (body) => api.post('/departments', body),
    onSuccess: () => { qc.invalidateQueries(['departments']); toast.success('Department created'); setShowCreate(false); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to create'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, body }) => api.put(`/departments/${id}`, body),
    onSuccess: () => { qc.invalidateQueries(['departments']); toast.success('Department updated'); setEditing(null); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to update'),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/departments/${id}`),
    onSuccess: () => { qc.invalidateQueries(['departments']); toast.success('Department deleted'); setDeleting(null); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to delete'),
  });

  return (
    <div>
      <PageHeader
        title="Department Management"
        breadcrumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'Departments' }]}
        actions={
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Department
          </button>
        }
      />

      <div className="max-w-3xl mx-auto">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-slate-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : departments.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
            <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No departments yet. Create your first one.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {departments.map((dept) => (
              <div
                key={dept._id}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{dept.name}</p>
                    {dept.description && (
                      <p className="text-xs text-slate-400 truncate">{dept.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => setEditing(dept)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleting(dept)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add Department">
        <DeptForm
          onSubmit={(body) => createMut.mutate(body)}
          loading={createMut.isPending}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Department">
        {editing && (
          <DeptForm
            initial={editing}
            onSubmit={(body) => updateMut.mutate({ id: editing._id, body })}
            loading={updateMut.isPending}
          />
        )}
      </Modal>

      {/* Delete Confirm */}
      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="Delete Department">
        {deleting && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Are you sure you want to delete <span className="font-semibold text-slate-800">{deleting.name}</span>? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => deleteMut.mutate(deleting._id)}
                disabled={deleteMut.isPending}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
              >
                {deleteMut.isPending ? 'Deleting...' : 'Delete'}
              </button>
              <button
                onClick={() => setDeleting(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Departments;
