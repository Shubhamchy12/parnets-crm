import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import api from '../services/api';
import PageHeader from '../components/common/PageHeader';
import DataTable from '../components/common/DataTable';
import StatusBadge from '../components/common/StatusBadge';
import Avatar from '../components/common/Avatar';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Plus, Search, UserCog } from 'lucide-react';

const UserManagement = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const { register, handleSubmit, reset } = useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['users', search],
    queryFn: () => api.get('/users', { params: { search } }).then(r => r.data?.data?.users || r.data?.users || []),
  });

  const createMut = useMutation({
    mutationFn: (d) => api.post('/users', d),
    onSuccess: () => { qc.invalidateQueries(['users']); toast.success('User created'); setModal(false); reset(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/users/${id}`),
    onSuccess: () => { qc.invalidateQueries(['users']); toast.success('Deleted'); setDeleteId(null); },
  });

  const columns = [
    { key: 'name', label: 'User', render: (v, row) => (
      <div className="flex items-center gap-3">
        <Avatar name={row.name || ''} size="sm" />
        <div>
          <p className="font-medium text-sm" style={{ color:"var(--text-1)" }}>{row.name}</p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>{row.email}</p>
        </div>
      </div>
    )},
    { key: 'role', label: 'Role', render: v => <span className="capitalize text-sm">{v?.replace(/_/g, ' ')}</span> },
    { key: 'status', label: 'Status', render: v => <StatusBadge status={v || 'active'} /> },
    { key: '_id', label: 'Actions', sortable: false, render: (v) => (
      <button onClick={e => { e.stopPropagation(); setDeleteId(v); }} className="text-xs text-red-500 hover:underline">Delete</button>
    )},
  ];

  return (
    <div>
      <PageHeader title="User Management"
        breadcrumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'Users' }]}
        actions={
          <button onClick={() => setModal(true)}
            className="modal-btn-primary flex items-center gap-2 px-4 py-2">
            <Plus className="w-4 h-4" /> Add User
          </button>
        }
      />

      <div className="crm-card p-5">
        <div className="relative mb-5 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..."
            className="crm-input pl-9" />
        </div>
        <DataTable columns={columns} data={data || []} loading={isLoading} />
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Add User" subtitle="Create admin or sales users. Employees are created via the Employees page." icon={UserCog} size="sm">
        <form onSubmit={handleSubmit(d => createMut.mutate(d))} className="space-y-4">
          <div>
            <label className="modal-form-label">Name</label>
            <input {...register('name')} className="modal-input" />
          </div>
          <div>
            <label className="modal-form-label">Email</label>
            <input {...register('email')} type="email" className="modal-input" />
          </div>
          <div>
            <label className="modal-form-label">Role</label>
            <select {...register('role')} className="modal-input">
              <option value="admin">Admin</option>
              <option value="sales">Sales</option>
            </select>
          </div>
          <div>
            <label className="modal-form-label">Password</label>
            <input {...register('password')} type="password" className="modal-input" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={createMut.isPending}
              className="modal-btn-primary">
              {createMut.isPending ? 'Creating...' : 'Create User'}
            </button>
            <button type="button" onClick={() => setModal(false)}
              className="modal-btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteMut.mutate(deleteId)} loading={deleteMut.isPending} title="Delete User?" />
    </div>
  );
};

export default UserManagement;
