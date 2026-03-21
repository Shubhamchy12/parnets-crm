import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { leaveService } from '../services/leaveService';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import Avatar from '../components/common/Avatar';
import Modal from '../components/common/Modal';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Check, X, Clock } from 'lucide-react';

const TABS = [
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'All', value: '' },
];

const LeaveTeam = () => {
  const qc = useQueryClient();
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [activeTab, setActiveTab] = useState('pending');

  const { data, isLoading } = useQuery({
    queryKey: ['team-leaves', activeTab],
    queryFn: () =>
      leaveService
        .getTeamLeaves(activeTab ? { status: activeTab } : {})
        .then(r => r.data?.data?.leaves || r.data?.leaves || []),
  });

  const approveMut = useMutation({
    mutationFn: (id) => leaveService.approve(id, {}),
    onSuccess: () => {
      qc.invalidateQueries(['team-leaves']);
      toast.success('Leave approved');
    },
    onError: () => toast.error('Failed to approve'),
  });

  const rejectMut = useMutation({
    mutationFn: ({ id, reason }) => leaveService.reject(id, { reason }),
    onSuccess: () => {
      qc.invalidateQueries(['team-leaves']);
      toast.success('Leave rejected');
      setRejectModal(null);
      setRejectReason('');
    },
    onError: () => toast.error('Failed to reject'),
  });

  const leaves = data || [];
  const pendingCount = leaves.filter(l => l.status === 'pending').length;

  return (
    <div>
      <PageHeader
        title="Leave Approvals"
        breadcrumbs={[{ label: 'Leaves', href: '/leaves' }, { label: 'Approvals' }]}
      />

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-slate-100 p-1 rounded-xl w-fit">
        {TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className="relative px-4 py-1.5 text-sm font-medium rounded-lg transition-all"
            style={{
              background: activeTab === tab.value ? 'white' : 'transparent',
              color: activeTab === tab.value ? 'var(--text-primary, #1e293b)' : 'var(--text-muted, #64748b)',
              boxShadow: activeTab === tab.value ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            {tab.label}
            {tab.value === 'pending' && pendingCount > 0 && activeTab !== 'pending' && (
              <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold bg-red-500 text-white rounded-full">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center py-10 text-slate-400">Loading...</div>
      ) : leaves.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No {activeTab || ''} leave requests</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {leaves.map(leave => (
            <div key={leave._id} className="crm-card p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Avatar name={leave.employeeName || leave.employee?.name || 'Employee'} size="md" />
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">
                      {leave.employeeName || leave.employee?.name || 'Employee'}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {leave.employee?.department || 'Staff'}
                    </p>
                  </div>
                </div>
                <StatusBadge status={leave.status || 'pending'} />
              </div>

              <div className="space-y-1.5 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Type</span>
                  <span className="font-medium text-slate-800">{leave.leaveType}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Dates</span>
                  <span className="font-medium text-slate-800">
                    {leave.fromDate ? format(new Date(leave.fromDate), 'dd MMM') : '—'} –{' '}
                    {leave.toDate ? format(new Date(leave.toDate), 'dd MMM yyyy') : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Days</span>
                  <span className="font-medium text-slate-800">{leave.days}</span>
                </div>
                {leave.reason && (
                  <div className="text-sm">
                    <span className="text-slate-500">Reason: </span>
                    <span className="text-slate-700">{leave.reason}</span>
                  </div>
                )}
                {leave.status === 'rejected' && leave.rejectionReason && (
                  <div className="text-sm p-2 bg-red-50 rounded-lg border border-red-100">
                    <span className="text-red-500 font-medium">Rejection reason: </span>
                    <span className="text-red-700">{leave.rejectionReason}</span>
                  </div>
                )}
                <div className="text-xs text-slate-400">
                  Applied: {leave.createdAt ? format(new Date(leave.createdAt), 'dd MMM yyyy, hh:mm a') : '—'}
                </div>
              </div>

              {leave.status === 'pending' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => approveMut.mutate(leave._id)}
                    disabled={approveMut.isPending}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-xl transition-colors disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" /> Approve
                  </button>
                  <button
                    onClick={() => { setRejectModal(leave._id); setRejectReason(''); }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl transition-colors"
                  >
                    <X className="w-3.5 h-3.5" /> Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={!!rejectModal} onClose={() => setRejectModal(null)} title="Reject Leave" size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Reason for rejection</label>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300"
              placeholder="Provide a reason..."
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => rejectMut.mutate({ id: rejectModal, reason: rejectReason })}
              disabled={rejectMut.isPending}
              className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
            >
              {rejectMut.isPending ? 'Rejecting...' : 'Reject'}
            </button>
            <button
              onClick={() => setRejectModal(null)}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default LeaveTeam;
