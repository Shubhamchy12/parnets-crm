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

const todayStr = () => new Date().toISOString().split('T')[0];

const fmtDate = (val) => {
  if (!val) return '—';
  try { return format(new Date(val), 'dd MMM yyyy'); } catch { return val; }
};

const AssignProject = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState({ projectId: '', employeeId: '', assignedDate: todayStr(), dueDate: '', note: '' });
  const [showNote, setShowNote] = useState(false);
  const [removeId, setRemoveId] = useState(null);
  const [showWorkPlan, setShowWorkPlan] = useState(false);
  const [dayWisePlans, setDayWisePlans] = useState([{ dateFrom: '', dateTo: '', taskDescription: '' }]);
  const [showCredentials, setShowCredentials] = useState(false);
  const [credentials, setCredentials] = useState([{ title: '', link: '', userId: '', password: '' }]);

  const addDayWisePlan = () => setDayWisePlans(p => [...p, { dateFrom: '', dateTo: '', taskDescription: '' }]);
  const removeDayWisePlan = (i) => setDayWisePlans(p => p.filter((_, idx) => idx !== i));
  const updateDayWisePlan = (i, field, val) => setDayWisePlans(p => p.map((item, idx) => idx === i ? { ...item, [field]: val } : item));

  const addCredential = () => setCredentials(p => [...p, { title: '', link: '', userId: '', password: '' }]);
  const removeCredential = (i) => setCredentials(p => p.filter((_, idx) => idx !== i));
  const updateCredential = (i, field, val) => setCredentials(p => p.map((item, idx) => idx === i ? { ...item, [field]: val } : item));

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

  const { data: projectInvoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ['project-invoices', form.projectId],
    queryFn: () => invoiceService.getAll({ project: form.projectId, limit: 50 }).then(r => r.data?.data?.invoices || []),
    enabled: !!form.projectId,
  });

  const paymentReceived = projectInvoices.some(inv => inv.status === 'paid' || inv.status === 'partial');
  const hasInvoice = projectInvoices.length > 0;
  const invoiceCheckDone = !!form.projectId && !invoicesLoading;

  const selectedEmployee = (employees || []).find(e => e._id === form.employeeId);

  const { data: assignments, refetch } = useQuery({
    queryKey: ['all-assignments'],
    queryFn: () => assignmentService.getAll({ status: 'active' }).then(r => r.data?.data?.assignments || []),
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const assignMut = useMutation({
    mutationFn: (d) => assignmentService.assign(d),
    onSuccess: (response) => {
      console.log('Assignment created:', response);
      refetch();
      qc.invalidateQueries(['projects']);
      qc.invalidateQueries(['my-assignments']); // sync Tasks page dropdown
      toast.success('Employee assigned successfully');
      setForm({ projectId: '', employeeId: '', assignedDate: todayStr(), dueDate: '', note: '' });
      setShowNote(false);
      setShowWorkPlan(false);
      setDayWisePlans([{ dateFrom: '', dateTo: '', taskDescription: '' }]);
      setShowCredentials(false);
      setCredentials([{ title: '', link: '', userId: '', password: '' }]);
    },
    onError: (e) => {
      console.error('Assignment error:', e);
      toast.error(e.response?.data?.message || 'Failed to assign');
    },
  });

  const removeMut = useMutation({
    mutationFn: (id) => assignmentService.remove(id),
    onSuccess: () => {
      refetch();
      qc.invalidateQueries(['my-assignments']); // sync Tasks page dropdown
      toast.success('Assignment removed');
      setRemoveId(null);
    },
    onError: () => toast.error('Failed to remove'),
  });

  const handleAssign = () => {
    if (!form.projectId || !form.employeeId) return toast.error('Select both project and employee');
    if (invoiceCheckDone && !paymentReceived) return toast.error('Payment not received. Cannot assign employee.');
    
    const validPlans = dayWisePlans.filter(p => p.dateFrom && p.taskDescription);
    
    if (showWorkPlan && validPlans.length === 0) {
      return toast.error('Please add at least one complete day-wise plan or remove the work plan section');
    }

    const validCredentials = credentials.filter(c => c.title && (c.link || c.userId || c.password));
    
    if (showCredentials && validCredentials.length === 0) {
      return toast.error('Please add at least one complete credential or remove the credentials section');
    }
    
    const payload = {
      projectId: form.projectId,
      employeeId: form.employeeId,
      assignedDate: form.assignedDate,
      ...(form.dueDate ? { dueDate: form.dueDate } : {}),
      ...(form.note ? { note: form.note } : {}),
      ...(showWorkPlan && validPlans.length > 0 ? {
        workPlan: {
          dayWisePlans: validPlans.map(p => ({
            dateFrom: p.dateFrom,
            dateTo: p.dateTo || p.dateFrom,
            taskDescription: p.taskDescription,
            status: 'pending',
          })),
        },
      } : {}),
      ...(showCredentials && validCredentials.length > 0 ? {
        credentials: validCredentials,
      } : {}),
    };
    
    console.log('Assignment payload:', JSON.stringify(payload, null, 2));
    assignMut.mutate(payload);
  };

  return (
    <div>
      <PageHeader
        title="Assign Project"
        breadcrumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'Assign Project' }]}
      />

      {/* ── Assignment Form ── */}
      <div className="crm-card p-6 mb-5">
        <h2 className="text-base font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-1)' }}>
          <GitBranch className="w-4 h-4 text-indigo-500" /> New Assignment
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {/* Project */}
          <div>
            <label className="modal-form-label">Select Project *</label>
            <select
              value={form.projectId}
              onChange={e => {
                const pid = e.target.value;
                const proj = (projects || []).find(p => p._id === pid);
                setForm(prev => ({
                  ...prev,
                  projectId: pid,
                  assignedDate: proj?.startDate ? proj.startDate.split('T')[0] : todayStr(),
                  dueDate: proj?.endDate ? proj.endDate.split('T')[0] : '',
                }));
              }}
              className="modal-input text-sm py-2"
            >
              <option value="">Choose project...</option>
              {(projects || []).map(p => (
                <option key={p._id} value={p._id}>{p.name} — {p.client?.name || 'No client'}</option>
              ))}
            </select>
          </div>

          {/* Employee */}
          <div>
            <label className="modal-form-label">Select Employee *</label>
            <select value={form.employeeId} onChange={e => setForm(p => ({ ...p, employeeId: e.target.value }))} className="modal-input text-sm py-2">
              <option value="">Choose employee...</option>
              {(employees || []).map(e => (
                <option key={e._id} value={e._id}>{e.name} — {e.designation || e.role}</option>
              ))}
            </select>
            {selectedEmployee && (
              <p className="mt-1 text-xs font-medium text-indigo-500">{selectedEmployee.department || selectedEmployee.designation || ''}</p>
            )}
          </div>

          {/* Assigned Date */}
          <div>
            <label className="modal-form-label">Assigned Date</label>
            <input type="date" value={form.assignedDate}
              onChange={e => setForm(p => ({ ...p, assignedDate: e.target.value }))}
              className="modal-input text-sm py-2" style={{ color: 'var(--text-1)' }} />
          </div>

          {/* Due Date */}
          <div>
            <label className="modal-form-label">Due Date</label>
            <input type="date" value={form.dueDate}
              onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))}
              className="modal-input text-sm py-2" style={{ color: 'var(--text-1)' }} />
            {form.dueDate && (
              <p className="mt-1 text-xs font-medium text-orange-500">Due {fmtDate(form.dueDate)}</p>
            )}
          </div>

          {/* Note */}
          <div>
            <label className="modal-form-label">Note for Employee (optional)</label>
            {!showNote ? (
              <button type="button" onClick={() => setShowNote(true)}
                className="modal-input w-full text-left flex items-center gap-2 text-sm py-2"
                style={{ color: 'var(--text-3)' }}>
                <Plus className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                <span>Add a note...</span>
              </button>
            ) : (
              <div className="relative">
                <textarea value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
                  className="modal-input text-sm resize-none w-full pr-7" rows={2}
                  placeholder="Any message for the employee..." autoFocus />
                <button type="button" onClick={() => { setShowNote(false); setForm(p => ({ ...p, note: '' })); }}
                  className="absolute top-2 right-2 text-red-400 hover:text-red-600 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Work Plan */}
        <div className="mt-3">
          {!showWorkPlan ? (
            <button type="button" onClick={() => setShowWorkPlan(true)}
              className="flex items-center gap-1.5 text-xs text-indigo-500 hover:text-indigo-700 font-medium transition-colors">
              <Plus className="w-3.5 h-3.5" /> Add Day-wise Work Plans
            </button>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>Day-wise Work Plans</span>
                <button type="button" onClick={() => { setShowWorkPlan(false); setDayWisePlans([{ dateFrom: '', dateTo: '', taskDescription: '' }]); }}
                  className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 transition-colors">
                  <X className="w-3 h-3" /> Remove All
                </button>
              </div>
              
              <div className="space-y-3">
                {dayWisePlans.map((plan, i) => (
                  <div key={i} className="crm-card p-4 bg-gradient-to-br from-slate-50 to-gray-50">
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-1">
                        {i + 1}
                      </span>
                      <div className="flex-1 space-y-3">
                        {/* Date Range */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="modal-form-label">From Date *</label>
                            <input type="date" value={plan.dateFrom}
                              onChange={e => updateDayWisePlan(i, 'dateFrom', e.target.value)}
                              className="modal-input text-sm py-2" />
                          </div>
                          <div>
                            <label className="modal-form-label">To Date</label>
                            <input type="date" value={plan.dateTo}
                              min={plan.dateFrom || undefined}
                              onChange={e => updateDayWisePlan(i, 'dateTo', e.target.value)}
                              className="modal-input text-sm py-2" />
                          </div>
                        </div>
                        
                        {/* Task Description */}
                        <div>
                          <label className="modal-form-label">Task Description *</label>
                          <textarea value={plan.taskDescription}
                            onChange={e => updateDayWisePlan(i, 'taskDescription', e.target.value)}
                            className="modal-input text-sm resize-none" rows={2}
                            placeholder="Describe the task for this period..." />
                        </div>
                        
                        <div className="text-xs px-3 py-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-700">
                          <strong>Note:</strong> Developer will fill status and remarks for this plan in the Tasks page
                        </div>
                      </div>
                      
                      {dayWisePlans.length > 1 && (
                        <button type="button" onClick={() => removeDayWisePlan(i)}
                          className="p-1.5 text-red-400 hover:text-red-600 transition-colors flex-shrink-0">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                
                {/* Add Plan Button at Bottom */}
                <button type="button" onClick={addDayWisePlan}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-indigo-300 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-400 transition-colors">
                  <Plus className="w-4 h-4" />
                  <span className="text-sm font-semibold">Add Another Plan</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Credentials */}
        <div className="mt-3">
          {!showCredentials ? (
            <button type="button" onClick={() => setShowCredentials(true)}
              className="flex items-center gap-1.5 text-xs text-emerald-500 hover:text-emerald-700 font-medium transition-colors">
              <Plus className="w-3.5 h-3.5" /> Add Multiple Credentials
            </button>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>Project Credentials</span>
                <button type="button" onClick={() => { setShowCredentials(false); setCredentials([{ title: '', link: '', userId: '', password: '' }]); }}
                  className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 transition-colors">
                  <X className="w-3 h-3" /> Remove All
                </button>
              </div>
              
              <div className="space-y-3">
                {credentials.map((cred, i) => (
                  <div key={i} className="crm-card p-4 bg-gradient-to-br from-emerald-50 to-teal-50">
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-1">
                        {i + 1}
                      </span>
                      <div className="flex-1 space-y-3">
                        {/* Title */}
                        <div>
                          <label className="modal-form-label">Title *</label>
                          <input type="text" value={cred.title}
                            onChange={e => updateCredential(i, 'title', e.target.value)}
                            className="modal-input text-sm py-2"
                            placeholder="e.g., Hosting Panel, Database, API Key..." />
                        </div>
                        
                        {/* Link */}
                        <div>
                          <label className="modal-form-label">Link / URL</label>
                          <input type="text" value={cred.link}
                            onChange={e => updateCredential(i, 'link', e.target.value)}
                            className="modal-input text-sm py-2"
                            placeholder="https://..." />
                        </div>
                        
                        {/* User ID and Password */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="modal-form-label">User ID / Username</label>
                            <input type="text" value={cred.userId}
                              onChange={e => updateCredential(i, 'userId', e.target.value)}
                              className="modal-input text-sm py-2"
                              placeholder="Username or email..." />
                          </div>
                          <div>
                            <label className="modal-form-label">Password</label>
                            <input type="text" value={cred.password}
                              onChange={e => updateCredential(i, 'password', e.target.value)}
                              className="modal-input text-sm py-2"
                              placeholder="Password..." />
                          </div>
                        </div>
                        
                        <div className="text-xs px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-700">
                          <strong>Note:</strong> These credentials will be visible to assigned employees
                        </div>
                      </div>
                      
                      {credentials.length > 1 && (
                        <button type="button" onClick={() => removeCredential(i)}
                          className="p-1.5 text-red-400 hover:text-red-600 transition-colors flex-shrink-0">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                
                {/* Add Credential Button at Bottom */}
                <button type="button" onClick={addCredential}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-emerald-300 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-400 transition-colors">
                  <Plus className="w-4 h-4" />
                  <span className="text-sm font-semibold">Add Another Credential</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Payment banner */}
        {form.projectId && !invoicesLoading && (
          <div className={`mt-4 flex items-start gap-3 p-4 rounded-xl border text-sm ${paymentReceived ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
            {paymentReceived
              ? <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              : <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />}
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
          <button onClick={handleAssign}
            disabled={assignMut.isPending || invoicesLoading || (invoiceCheckDone && !paymentReceived)}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            <Plus className="w-4 h-4" />
            {assignMut.isPending ? 'Assigning...' : invoicesLoading ? 'Checking payment...' : 'Assign Employee'}
          </button>
        </div>
      </div>

      {/* ── Active Assignments ── */}
      <div className="crm-card overflow-hidden">
        <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-1)' }}>
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-1)' }}>Active Assignments</h2>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600">
            {assignments?.length || 0} total
          </span>
        </div>

        {assignments?.length ? (() => {
          const byEmployee = {};
          (assignments || []).forEach(a => {
            const eid = a.employee?._id || 'unknown';
            if (!byEmployee[eid]) byEmployee[eid] = { employee: a.employee, items: [] };
            byEmployee[eid].items.push(a);
          });

          return (
            <div className="divide-y" style={{ borderColor: 'var(--border-1)' }}>
              {Object.values(byEmployee).map(({ employee: emp, items }) => {
                const total     = items.length;
                const completed = items.filter(a => a.workPlan?.status === 'completed').length;
                const inProg    = items.filter(a => a.workPlan?.status === 'in_progress').length;
                const pending   = items.filter(a => !a.workPlan || a.workPlan?.status === 'pending').length;
                const pct       = total > 0 ? Math.round((completed / total) * 100) : 0;

                return (
                  <div key={emp?._id || 'unknown'}>
                    {/* Employee header */}
                    <div className="px-6 py-4 flex items-center gap-4" style={{ background: 'var(--bg-surface2)' }}>
                      <Avatar name={emp?.name || ''} size="md" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>{emp?.name}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {emp?.designation && <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-medium">{emp.designation}</span>}
                          {emp?.department && <span className="text-xs" style={{ color: 'var(--text-3)' }}>{emp.department}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {[
                          { val: total,     label: 'Total',   cls: 'text-indigo-600', bg: 'bg-indigo-50' },
                          { val: completed, label: 'Done',    cls: 'text-green-600',  bg: 'bg-green-50'  },
                          { val: inProg,    label: 'Active',  cls: 'text-blue-600',   bg: 'bg-blue-50'   },
                          { val: pending,   label: 'Pending', cls: 'text-slate-500',  bg: 'bg-slate-50'  },
                        ].map(s => (
                          <div key={s.label} className={`flex items-center gap-1 px-2.5 py-1 rounded-lg ${s.bg}`}>
                            <span className={`text-xs font-bold ${s.cls}`}>{s.val}</span>
                            <span className="text-xs text-slate-400">{s.label}</span>
                          </div>
                        ))}
                        <div className="hidden md:flex items-center gap-1.5 ml-1">
                          <div className="w-16 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                            <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs font-bold text-green-600">{pct}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Assignment rows */}
                    {items.map((a, idx) => {
                      const wp = a.workPlan;
                      const wsCls = {
                        completed:   'bg-green-100 text-green-700',
                        in_progress: 'bg-blue-100 text-blue-700',
                        on_hold:     'bg-yellow-100 text-yellow-700',
                        cancelled:   'bg-red-100 text-red-700',
                        pending:     'bg-slate-100 text-slate-500',
                      };
                      const start     = a.assignedDate ? new Date(a.assignedDate) : null;
                      const end       = a.project?.endDate ? new Date(a.project.endDate) : null;
                      const totalDays = start && end ? Math.round((end - start) / 86400000) : null;
                      const daysLeft  = end ? Math.round((end - new Date()) / 86400000) : null;
                      const overdue   = daysLeft !== null && daysLeft < 0;

                      return (
                        <div key={a._id} className="border-t" style={{ borderColor: 'var(--border-1)' }}>
                          {/* Summary row */}
                          <div className="px-6 py-3 flex items-center gap-3">
                            <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
                              {idx + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{a.project?.name}</p>
                                <StatusBadge status={a.project?.status || 'planning'} />
                                {wp?.status && (
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${wsCls[wp.status] || wsCls.pending}`}>
                                    {wp.status.replace('_', ' ')}
                                  </span>
                                )}
                                {daysLeft !== null && (
                                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${overdue ? 'bg-red-100 text-red-600' : daysLeft <= 7 ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                                    {overdue ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
                                {[
                                  a.project?.client?.name,
                                  start ? `Assigned ${fmtDate(start)}` : null,
                                  end ? `Due ${fmtDate(end)}` : null,
                                  a.assignedBy?.name ? `By ${a.assignedBy.name}` : null,
                                ].filter(Boolean).join(' · ')}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button onClick={() => navigate(`/projects/${a.project?._id}`)}
                                className="p-1.5 rounded-lg text-indigo-500 hover:bg-indigo-50 transition-colors">
                                <ExternalLink className="w-4 h-4" />
                              </button>
                              <button onClick={() => setRemoveId(a._id)}
                                className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Detail panel */}
                          {(a.note || wp || (a.project?.credentials && a.project.credentials.length > 0)) && (
                            <div className="px-6 pb-4" style={{ paddingLeft: '3.5rem' }}>
                              <div className="rounded-xl border overflow-hidden text-xs" style={{ borderColor: 'var(--border-1)' }}>
                                {/* Row 1 */}
                                <div className="grid divide-x" style={{ borderColor: 'var(--border-1)', gridTemplateColumns: 'repeat(4, 1fr)' }}>
                                  <div className="px-3 py-2.5">
                                    <p className="uppercase tracking-wider font-semibold mb-1" style={{ color: 'var(--text-3)', fontSize: '9px' }}>Assigned</p>
                                    <p className="font-semibold" style={{ color: 'var(--text-1)' }}>{fmtDate(start)}</p>
                                  </div>
                                  <div className="px-3 py-2.5">
                                    <p className="uppercase tracking-wider font-semibold mb-1" style={{ color: 'var(--text-3)', fontSize: '9px' }}>Deadline</p>
                                    <p className="font-semibold" style={{ color: end ? 'var(--text-1)' : 'var(--text-3)' }}>{fmtDate(end)}</p>
                                    {totalDays !== null && <p className="mt-0.5 text-slate-400">{totalDays}d total</p>}
                                  </div>
                                  <div className="px-3 py-2.5">
                                    <p className="uppercase tracking-wider font-semibold mb-1" style={{ color: 'var(--text-3)', fontSize: '9px' }}>Day-wise Plans</p>
                                    <p className="font-semibold" style={{ color: 'var(--text-1)' }}>
                                      {wp?.dayWisePlans?.length || 0} plan{wp?.dayWisePlans?.length !== 1 ? 's' : ''}
                                    </p>
                                  </div>
                                  <div className="px-3 py-2.5">
                                    <p className="uppercase tracking-wider font-semibold mb-1" style={{ color: 'var(--text-3)', fontSize: '9px' }}>Credentials</p>
                                    <p className="font-semibold" style={{ color: 'var(--text-1)' }}>
                                      {a.project?.credentials?.length || 0} item{a.project?.credentials?.length !== 1 ? 's' : ''}
                                    </p>
                                  </div>
                                </div>

                                {/* Day-wise Plans */}
                                {wp?.dayWisePlans && wp.dayWisePlans.length > 0 && (
                                  <div className="border-t" style={{ borderColor: 'var(--border-1)' }}>
                                    <div className="px-3 py-1.5 border-b" style={{ borderColor: 'var(--border-1)', background: 'var(--bg-surface2)' }}>
                                      <p className="uppercase tracking-wider font-semibold" style={{ color: 'var(--text-3)', fontSize: '9px' }}>Day-wise Work Plans</p>
                                    </div>
                                    <div className="divide-y" style={{ borderColor: 'var(--border-1)' }}>
                                      {wp.dayWisePlans.map((plan, pi) => (
                                        <div key={plan._id || pi} className="px-3 py-2">
                                          <div className="flex items-start gap-2 mb-1">
                                            <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
                                              {pi + 1}
                                            </span>
                                            <div className="flex-1">
                                              <div className="flex items-center gap-2 mb-1">
                                                <span className="font-semibold text-indigo-600">
                                                  {fmtDate(plan.dateFrom)} {plan.dateTo && plan.dateTo !== plan.dateFrom ? `→ ${fmtDate(plan.dateTo)}` : ''}
                                                </span>
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${
                                                  plan.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                  plan.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                                                  plan.status === 'on_hold' ? 'bg-yellow-100 text-yellow-700' :
                                                  plan.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'
                                                }`}>
                                                  {plan.status.replace('_', ' ')}
                                                </span>
                                              </div>
                                              <p style={{ color: 'var(--text-2)' }}>{plan.taskDescription}</p>
                                              {plan.developerRemark && (
                                                <p className="mt-1 text-blue-600 italic">Remark: {plan.developerRemark}</p>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Note */}
                                {a.note && (
                                  <div className="border-t px-3 py-2.5" style={{ borderColor: 'var(--border-1)', background: 'var(--bg-surface2)' }}>
                                    <p className="uppercase tracking-wider font-semibold mb-1" style={{ color: 'var(--text-3)', fontSize: '9px' }}>Note</p>
                                    <p style={{ color: 'var(--text-2)' }}>{a.note}</p>
                                  </div>
                                )}

                                {/* Project Credentials */}
                                {a.project?.credentials && a.project.credentials.length > 0 && (
                                  <div className="border-t" style={{ borderColor: 'var(--border-1)' }}>
                                    <div className="px-3 py-1.5 border-b" style={{ borderColor: 'var(--border-1)', background: 'var(--bg-surface2)' }}>
                                      <p className="uppercase tracking-wider font-semibold" style={{ color: 'var(--text-3)', fontSize: '9px' }}>Project Credentials ({a.project.credentials.length})</p>
                                    </div>
                                    <div className="divide-y" style={{ borderColor: 'var(--border-1)' }}>
                                      {a.project.credentials.map((cred, ci) => (
                                        <div key={cred._id || ci} className="px-3 py-2">
                                          <div className="flex items-start gap-2">
                                            <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
                                              {ci + 1}
                                            </span>
                                            <div className="flex-1 space-y-1">
                                              <p className="font-semibold text-emerald-700">{cred.title}</p>
                                              {cred.link && (
                                                <div className="flex items-start gap-1.5">
                                                  <span className="text-slate-500 flex-shrink-0">Link:</span>
                                                  <a href={cred.link} target="_blank" rel="noreferrer"
                                                    className="text-indigo-600 hover:text-indigo-800 hover:underline break-all">
                                                    {cred.link}
                                                  </a>
                                                </div>
                                              )}
                                              {cred.userId && (
                                                <div className="flex items-start gap-1.5">
                                                  <span className="text-slate-500 flex-shrink-0">User ID:</span>
                                                  <code className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-xs">{cred.userId}</code>
                                                </div>
                                              )}
                                              {cred.password && (
                                                <div className="flex items-start gap-1.5">
                                                  <span className="text-slate-500 flex-shrink-0">Password:</span>
                                                  <code className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-xs">{cred.password}</code>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          );
        })() : (
          <div className="px-6 py-12 text-center">
            <GitBranch className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-sm" style={{ color: 'var(--text-3)' }}>No active assignments yet.</p>
          </div>
        )}
      </div>

      <ConfirmDialog open={!!removeId} onClose={() => setRemoveId(null)} onConfirm={() => removeMut.mutate(removeId)}
        loading={removeMut.isPending} title="Remove Assignment?" message="The employee will be unassigned from this project." />
    </div>
  );
};

export default AssignProject;
