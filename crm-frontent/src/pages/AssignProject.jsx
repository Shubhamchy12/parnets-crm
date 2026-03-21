import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { assignmentService } from '../services/assignmentService';
import { projectService } from '../services/projectService';
import { employeeService } from '../services/employeeService';
import { invoiceService } from '../services/invoiceService';
import PageHeader from '../components/common/PageHeader';
import Avatar from '../components/common/Avatar';
import StatusBadge from '../components/common/StatusBadge';
import ConfirmDialog from '../components/common/ConfirmDialog';
import toast from 'react-hot-toast';
import { GitBranch, Plus, X, ExternalLink, AlertCircle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

const AssignProject = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState({ projectId: '', employeeId: '', note: '' });
  const [removeId, setRemoveId] = useState(null);

  const { data: projects } = useQuery({
    queryKey: ['projects-dropdown'],
    queryFn: () => projectService.getAll({ limit: 200 }).then(r => r.data?.data?.projects || []),
    staleTime: 30000,
  });

  const { data: employees } = useQuery({
    queryKey: ['employees-dropdown'],
    queryFn: () => employeeService.getAll({ limit: 200 }).then(r => r.data?.data?.employees || []),
    staleTime: 30000,
  });

  // Fetch invoices for selected project to check payment status
  const { data: projectInvoices = [] } = useQuery({
    queryKey: ['project-invoices', form.projectId],
    queryFn: () => invoiceService.getAll({ project: form.projectId, limit: 50 }).then(r => r.data?.data?.invoices || []),
    enabled: !!form.projectId,
  });

  const paymentReceived = projectInvoices.some(inv => inv.status === 'paid' || inv.status === 'partial');
  const hasInvoice = projectInvoices.length > 0;

  const { data: assignments, refetch } = useQuery({
    queryKey: ['all-assignments'],
    queryFn: () => assignmentService.getAll({ status: 'active' }).then(r => r.data?.data?.assignments || []),
  });

  const assignMut = useMutation({
    mutationFn: (d) => assignmentService.assign(d),
    onSuccess: () => {
      refetch();
      qc.invalidateQueries(['projects']);
      toast.success('Employee assigned successfully');
      setForm({ projectId: '', employeeId: '', note: '' });
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to assign'),
  });

  const removeMut = useMutation({
    mutationFn: (id) => assignmentService.remove(id),
    onSuccess: () => { refetch(); toast.success('Assignment removed'); setRemoveId(null); },
    onError: () => toast.error('Failed to remove'),
  });

  const handleAssign = () => {
    if (!form.projectId || !form.employeeId) return toast.error('Select both project and employee');
    assignMut.mutate(form);
  };

  return (
    <div>
      <PageHeader
        title="Assign Project"
        breadcrumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'Assign Project' }]}
      />

      {/* Assignment Form */}
      <div className="crm-card p-6 mb-5">
        <h2 className="text-base font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-1)' }}>
          <GitBranch className="w-4 h-4 text-indigo-500" /> New Assignment
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="modal-form-label">Select Project *</label>
            <select value={form.projectId} onChange={e => setForm(p => ({ ...p, projectId: e.target.value }))} className="modal-input">
              <option value="">Choose project...</option>
              {(projects || []).map(p => (
                <option key={p._id} value={p._id}>{p.name} — {p.client?.name || 'No client'}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="modal-form-label">Select Employee *</label>
            <select value={form.employeeId} onChange={e => setForm(p => ({ ...p, employeeId: e.target.value }))} className="modal-input">
              <option value="">Choose employee...</option>
              {(employees || []).map(e => (
                <option key={e._id} value={e._id}>{e.name} — {e.designation || e.role}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="modal-form-label">Note for Employee (optional)</label>
            <input value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
              className="modal-input" placeholder="Any message for the employee..." />
          </div>
        </div>

        {/* Payment status banner */}
        {form.projectId && (
          <div className={`mt-4 flex items-start gap-3 p-4 rounded-xl border text-sm ${
            paymentReceived
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            {paymentReceived
              ? <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              : <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            }
            <div>
              {paymentReceived ? (
                <p className="font-medium">Payment received — project can be assigned.</p>
              ) : !hasInvoice ? (
                <>
                  <p className="font-semibold">No invoice found for this project.</p>
                  <p className="text-xs mt-0.5 opacity-80">Create an invoice and record a payment before assigning employees.</p>
                </>
              ) : (
                <>
                  <p className="font-semibold">Payment has not been received yet.</p>
                  <p className="text-xs mt-0.5 opacity-80">The invoice exists but no payment has been recorded. Please collect payment first.</p>
                </>
              )}
            </div>
          </div>
        )}

        <div className="mt-4">
          <button onClick={handleAssign} disabled={assignMut.isPending || (!!form.projectId && !paymentReceived)}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            <Plus className="w-4 h-4" />
            {assignMut.isPending ? 'Assigning...' : 'Assign Employee'}
          </button>
        </div>
      </div>

      {/* Current Assignments */}
      <div className="crm-card p-6">
        <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--text-1)' }}>
          Active Assignments ({assignments?.length || 0})
        </h2>
        {assignments?.length ? (
          <div className="space-y-3">
            {assignments.map((a) => (
              <div key={a._id} className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'var(--bg-surface2)' }}>
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <Avatar name={a.employee?.name || ''} size="sm" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{a.employee?.name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-3)' }}>{a.employee?.department}</p>
                  </div>
                  <div className="hidden md:block text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">→</div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-1)' }}>{a.project?.name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                      {a.project?.client?.name} · {a.project?.endDate ? `Due ${format(new Date(a.project.endDate), 'dd MMM yyyy')}` : 'No deadline'}
                    </p>
                  </div>
                  <StatusBadge status={a.project?.status || 'planning'} />
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button onClick={() => navigate(`/projects/${a.project?._id}`)}
                    className="p-1.5 text-indigo-500 hover:text-indigo-700 transition-colors">
                    <ExternalLink className="w-4 h-4" />
                  </button>
                  <button onClick={() => setRemoveId(a._id)}
                    className="p-1.5 text-red-400 hover:text-red-600 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>No active assignments yet.</p>
        )}
      </div>

      <ConfirmDialog open={!!removeId} onClose={() => setRemoveId(null)} onConfirm={() => removeMut.mutate(removeId)}
        loading={removeMut.isPending} title="Remove Assignment?" message="The employee will be unassigned from this project." />
    </div>
  );
};

export default AssignProject;
