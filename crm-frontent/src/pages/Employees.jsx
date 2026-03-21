import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter } from 'lucide-react';
import { employeeService } from '../services/employeeService';
import PageHeader from '../components/common/PageHeader';
import DataTable from '../components/common/DataTable';
import StatusBadge from '../components/common/StatusBadge';
import Avatar from '../components/common/Avatar';
import ConfirmDialog from '../components/common/ConfirmDialog';
import toast from 'react-hot-toast';

const Employees = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [dept, setDept] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [deleteName, setDeleteName] = useState('');
  const [deletedIds, setDeletedIds] = useState(new Set());

  const { data, isLoading } = useQuery({
    queryKey: ['employees', search, dept],
    queryFn: () => employeeService.getAll({ search, department: dept }).then(r => r.data),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => employeeService.remove(id),
    onSuccess: (_, id) => {
      setDeletedIds(prev => new Set([...prev, id]));
      toast.success('Employee removed');
      setDeleteId(null);
      setDeleteName('');
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to delete'),
  });

  const employees = (data?.data?.employees || data?.employees || []).filter(e => !deletedIds.has(e._id));

  const columns = [
    { key: 'name', label: 'Employee', render: (v, row) => (
      <div className="flex items-center gap-3">
        <Avatar name={row.name || row.user?.name || ''} size="sm" />
        <div>
          <p className="font-medium text-sm" style={{ color:"var(--text-1)" }}>{row.name || row.user?.name}</p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>{row.employeeId || row.email || row.user?.email}</p>
        </div>
      </div>
    )},
    { key: 'department', label: 'Department', render: (v) => v || '—' },
    { key: 'designation', label: 'Designation', render: (v) => v || '—' },
    { key: 'phone', label: 'Phone', render: (v) => v || '—' },
    { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v || 'active'} /> },
    { key: '_id', label: 'Actions', sortable: false, render: (v, row) => (
      <div className="flex items-center gap-2">
        <button onClick={e => { e.stopPropagation(); navigate(`/employees/${v}`); }}
          className="text-xs text-indigo-600 hover:underline">View</button>
        <button onClick={e => { e.stopPropagation(); navigate(`/employees/${v}/edit`); }}
          className="text-xs text-slate-500 hover:underline">Edit</button>
        <button onClick={e => { e.stopPropagation(); setDeleteId(v); setDeleteName(row.name || ''); }}
          className="text-xs text-red-500 hover:underline">Delete</button>
      </div>
    )},
  ];

  return (
    <div>
      <PageHeader title="Employees"
        breadcrumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'Employees' }]}
        actions={
          <button onClick={() => navigate('/employees/new')}
            className="modal-btn-primary flex items-center gap-2 px-4 py-2">
            <Plus className="w-4 h-4" /> Add Employee
          </button>
        }
      />

      <div className="crm-card p-5">
        <div className="flex flex-wrap gap-3 mb-5">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employees..."
              className="crm-input pl-9" />
          </div>
          <select value={dept} onChange={e => setDept(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300">
            <option value="">All Departments</option>
            {['Engineering','Sales','HR','Finance','Support','Operations','Marketing'].map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
        <DataTable columns={columns} data={employees} loading={isLoading} onRowClick={row => navigate(`/employees/${row._id}`)} />
      </div>

      <ConfirmDialog open={!!deleteId} onClose={() => { setDeleteId(null); setDeleteName(''); }}
        onConfirm={() => { const id = deleteId; deleteMut.mutate(id); }} loading={deleteMut.isPending}
        title="Delete Employee?" message={`Remove ${deleteName || 'this employee'}? This cannot be undone.`} />
    </div>
  );
};

export default Employees;
