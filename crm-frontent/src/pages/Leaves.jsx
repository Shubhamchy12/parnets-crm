import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { differenceInBusinessDays, parseISO } from 'date-fns';
import { leaveService } from '../services/leaveService';
import PageHeader from '../components/common/PageHeader';
import DataTable from '../components/common/DataTable';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import toast from 'react-hot-toast';
import { Plus, Bell, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';

const BalanceCard = ({ type, used, total, color }) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
    <p className="text-xs font-medium text-slate-500 mb-2">{type}</p>
    <div className="flex items-end justify-between mb-2">
      <span className="page-title text-2xl">{total - used}</span>
      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>of {total}</span>
    </div>
    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${Math.min((used / total) * 100, 100)}%` }} />
    </div>
    <p className="text-xs text-slate-400 mt-1">{used} used</p>
  </div>
);

const Leaves = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const isAdmin = ['admin', 'super_admin', 'manager'].includes(user?.role);

  const [modal, setModal] = useState(false);
  const [workingDays, setWorkingDays] = useState(0);
  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm();

  const fromDate = watch('fromDate');
  const toDate = watch('toDate');
  const leaveType = watch('leaveType');

  const { data: leaves, isLoading } = useQuery({
    queryKey: ['my-leaves'],
    queryFn: () => leaveService.getMyLeaves().then(r => r.data?.data?.leaves || r.data?.leaves || []),
  });

  const { data: balance } = useQuery({
    queryKey: ['leave-balance'],
    queryFn: () => leaveService.getBalance().then(r => r.data?.data?.balance || r.data?.balance || {}),
  });

  const { data: pendingLeaves } = useQuery({
    queryKey: ['team-leaves-pending-count'],
    queryFn: () => leaveService.getTeamLeaves({ status: 'pending' }).then(r => r.data?.data?.leaves || r.data?.leaves || []),
    enabled: isAdmin,
  });
  const pendingCount = pendingLeaves?.length || 0;

  useEffect(() => {
    if (fromDate && toDate && fromDate <= toDate) {
      const days = differenceInBusinessDays(parseISO(toDate), parseISO(fromDate)) + 1;
      setWorkingDays(Math.max(0, days));
    } else {
      setWorkingDays(0);
    }
  }, [fromDate, toDate]);

  const getRemaining = () => {
    if (!leaveType || !balance) return null;
    const key = leaveType === 'Casual Leave' ? 'cl' : leaveType === 'Sick Leave' ? 'sl' : leaveType === 'Earned Leave' ? 'el' : null;
    if (!key) return null;
    const b = balance[key];
    return b ? b.total - b.used : null;
  };

  const remaining = getRemaining();
  const overBalance = remaining !== null && workingDays > remaining;
  const needsMedical = leaveType === 'Sick Leave' && workingDays > 2;

  const applyMut = useMutation({
    mutationFn: (data) => leaveService.apply({
      leaveType: data.leaveType,
      fromDate: data.fromDate,
      toDate: data.toDate,
      reason: data.reason,
      days: workingDays || 1,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-leaves'] });
      qc.invalidateQueries({ queryKey: ['leave-balance'] });
      qc.invalidateQueries({ queryKey: ['team-leaves-pending-count'] });
      toast.success('Leave applied successfully');
      setModal(false);
      reset();
      setWorkingDays(0);
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to apply leave'),
  });

  const columns = [
    { key: 'leaveType', label: 'Type', render: v => v || '—' },
    { key: 'fromDate', label: 'From', render: v => v ? format(new Date(v), 'dd MMM yyyy') : '—' },
    { key: 'toDate', label: 'To', render: v => v ? format(new Date(v), 'dd MMM yyyy') : '—' },
    { key: 'days', label: 'Days', render: v => v || '—' },
    { key: 'reason', label: 'Reason', render: v => <span className="truncate max-w-xs block">{v || '—'}</span> },
    { key: 'status', label: 'Status', render: v => <StatusBadge status={v || 'pending'} /> },
  ];

  const balanceItems = [
    { type: 'Casual Leave', used: balance?.cl?.used || 0, total: balance?.cl?.total || 12, color: 'bg-blue-500' },
    { type: 'Sick Leave', used: balance?.sl?.used || 0, total: balance?.sl?.total || 10, color: 'bg-red-400' },
    { type: 'Earned Leave', used: balance?.el?.used || 0, total: balance?.el?.total || 15, color: 'bg-green-500' },
  ];

  return (
    <div>
      <PageHeader
        title="My Leaves"
        breadcrumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'Leaves' }]}
        actions={
          <button
            onClick={() => setModal(true)}
            className="modal-btn-primary flex items-center gap-2 px-4 py-2"
          >
            <Plus className="w-4 h-4" /> Apply Leave
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        {balanceItems.map(b => <BalanceCard key={b.type} {...b} />)}
      </div>

      {isAdmin && pendingCount > 0 && (
        <button
          onClick={() => navigate('/leaves/team')}
          className="w-full flex items-center gap-3 p-4 mb-5 bg-amber-50 border border-amber-200 rounded-2xl text-left hover:bg-amber-100 transition-colors"
        >
          <div className="flex-shrink-0 w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center">
            <Bell className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">
              {pendingCount} pending leave request{pendingCount > 1 ? 's' : ''} awaiting approval
            </p>
            <p className="text-xs text-amber-600">Click to review and approve/reject</p>
          </div>
          <span className="text-xs font-semibold text-amber-700 bg-amber-200 px-2.5 py-1 rounded-full">
            Review →
          </span>
        </button>
      )}

      <div className="crm-card p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Leave History</h3>
        <DataTable
          columns={columns}
          data={leaves || []}
          loading={isLoading}
          onRowClick={row => navigate(`/leaves/${row._id}`)}
        />
      </div>

      {/* Apply Leave Modal */}
      <Modal
        open={modal}
        onClose={() => { setModal(false); reset(); setWorkingDays(0); }}
        title="Apply for Leave"
        subtitle="Submit a new leave request"
        size="md"
      >
        <form onSubmit={handleSubmit(d => applyMut.mutate(d))} className="space-y-4">

          <div>
            <label className="modal-form-label">Leave Type *</label>
            <select {...register('leaveType', { required: 'Select leave type' })} className="modal-input">
              <option value="">Select type...</option>
              {['Casual Leave', 'Sick Leave', 'Earned Leave', 'Maternity Leave', 'Paternity Leave', 'Unpaid Leave'].map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            {errors.leaveType && <p className="modal-error-text">{errors.leaveType.message}</p>}
            {remaining !== null && (
              <p className="text-xs text-indigo-600 mt-1">{remaining} day{remaining !== 1 ? 's' : ''} remaining</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="modal-form-label">From Date *</label>
              <input
                {...register('fromDate', { required: 'From date required' })}
                type="date"
                className={`modal-input ${errors.fromDate ? 'modal-input-error' : ''}`}
                min={new Date().toISOString().split('T')[0]}
              />
              {errors.fromDate && <p className="modal-error-text">{errors.fromDate.message}</p>}
            </div>
            <div>
              <label className="modal-form-label">To Date *</label>
              <input
                {...register('toDate', { required: 'To date required' })}
                type="date"
                className={`modal-input ${errors.toDate ? 'modal-input-error' : ''}`}
                min={fromDate || new Date().toISOString().split('T')[0]}
              />
              {errors.toDate && <p className="modal-error-text">{errors.toDate.message}</p>}
            </div>
          </div>

          {workingDays > 0 && (
            <div className={`p-3 rounded-xl text-sm font-medium ${overBalance ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'}`}>
              {workingDays} working day{workingDays > 1 ? 's' : ''} selected
              {overBalance && <span className="ml-2">⚠ Exceeds balance</span>}
            </div>
          )}

          {overBalance && (
            <div className="flex items-start gap-2 p-3 bg-yellow-50 rounded-xl border border-yellow-200">
              <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-700">Requested days exceed remaining balance. This may be rejected.</p>
            </div>
          )}

          {needsMedical && (
            <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
              <p className="text-xs text-blue-700">Medical certificate required for Sick Leave more than 2 days.</p>
            </div>
          )}

          <div>
            <label className="modal-form-label">Reason *</label>
            <textarea
              {...register('reason', { required: 'Reason is required', minLength: { value: 5, message: 'Min 5 characters' } })}
              rows={3}
              className={`modal-input ${errors.reason ? 'modal-input-error' : ''}`}
              placeholder="Describe the reason for leave..."
            />
            {errors.reason && <p className="modal-error-text">{errors.reason.message}</p>}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={applyMut.isPending} className="modal-btn-primary">
              {applyMut.isPending ? 'Submitting...' : 'Submit Application'}
            </button>
            <button
              type="button"
              onClick={() => { setModal(false); reset(); setWorkingDays(0); }}
              className="modal-btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Leaves;
