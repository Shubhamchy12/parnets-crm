import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectService } from '../services/projectService';
import { assignmentService } from '../services/assignmentService';
import { progressService } from '../services/progressService';
import { employeeService } from '../services/employeeService';
import { useAuth } from '../contexts/AuthContext';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import Avatar from '../components/common/Avatar';
import ConfirmDialog from '../components/common/ConfirmDialog';
import Modal from '../components/common/Modal';
import toast from 'react-hot-toast';
import { ArrowLeft, Users, FileText, Calendar, X, Plus, Save, Upload, Download, Clock, AlertTriangle, CheckCircle2, MessageSquare, Printer, CalendarDays } from 'lucide-react';
import { RiDeleteBin6Line } from 'react-icons/ri';
import { format, differenceInDays } from 'date-fns';
import { formatINR } from '../utils/currency';

const Field = ({ label, value }) => {
  const display = value === null || value === undefined ? '—'
    : typeof value === 'object' ? Object.values(value).filter(v => v && typeof v === 'string').join(', ') || '—'
    : String(value) || '—';
  return (
    <div>
      <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-3)' }}>{label}</p>
      <p className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>{display}</p>
    </div>
  );
};

const statusIcon = (s) => {
  if (s === 'completed') return <CheckCircle2 className="w-4 h-4 text-green-500" />;
  if (s === 'blocked') return <AlertTriangle className="w-4 h-4 text-red-500" />;
  if (s === 'delayed') return <Clock className="w-4 h-4 text-amber-500" />;
  return <Clock className="w-4 h-4 text-blue-500" />;
};

const MEMBER_ROLES = ['developer', 'designer', 'tester', 'analyst', 'other'];

const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const isAdmin = ['admin', 'super_admin', 'manager', 'sub_admin'].includes(user?.role);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [assignModal, setAssignModal] = useState(false);
  const [scopeModal, setScopeModal] = useState(false);
  const [scopeText, setScopeText] = useState('');
  const [termsModal, setTermsModal] = useState(false);
  const [termsText, setTermsText] = useState('');
  const [agreementModal, setAgreementModal] = useState(false);
  const [agreementForm, setAgreementForm] = useState({ title: '', url: '' });
  const [milestoneModal, setMilestoneModal] = useState(false);
  const [msForm, setMsForm] = useState({ name: '', dueDate: '', description: '' });
  const [progressModal, setProgressModal] = useState(false);
  const [editProgressId, setEditProgressId] = useState(null);
  const [commentModal, setCommentModal] = useState(null); // progressEntry
  const [commentText, setCommentText] = useState('');
  const [isPrinting, setIsPrinting] = useState(false);
  const [progressForm, setProgressForm] = useState({
    workDone: '', hoursSpent: '', completionPercentage: '', blockers: '', statusUpdate: 'on_track',
  });
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [empSearch, setEmpSearch] = useState('');
  const [assignEmpId, setAssignEmpId] = useState('');
  const [assignNote, setAssignNote] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectService.getOne(id).then(r => r.data?.data?.project || r.data?.project),
  });

  const { data: empData } = useQuery({
    queryKey: ['employees-assign', empSearch],
    queryFn: () => employeeService.getAll({ limit: 100, search: empSearch || undefined }).then(r => r.data?.data?.employees || []),
    enabled: assignModal,
  });

  const { data: assignments, refetch: refetchAssignments } = useQuery({
    queryKey: ['assignments', id],
    queryFn: () => assignmentService.getByProject(id).then(r => r.data?.data?.assignments || []),
  });

  const { data: progressData, refetch: refetchProgress } = useQuery({
    queryKey: ['progress', id],
    queryFn: () => progressService.getAll({ projectId: id }).then(r => r.data?.data?.entries || []),
  });

  const { data: agreements, refetch: refetchAgreements } = useQuery({
    queryKey: ['agreements', id],
    queryFn: () => projectService.getAgreements(id).then(r => r.data?.data?.agreements || []),
  });

  const deleteMut = useMutation({
    mutationFn: () => projectService.remove(id),
    onSuccess: () => { qc.invalidateQueries(['projects']); toast.success('Project deleted'); navigate('/projects'); },
    onError: () => toast.error('Failed to delete'),
  });

  const teamMut = useMutation({
    mutationFn: (members) => projectService.bulkSetTeam(id, members),
    onSuccess: () => { refetch(); toast.success('Team updated'); setAssignModal(false); },
    onError: () => toast.error('Failed to update team'),
  });

  const scopeMut = useMutation({
    mutationFn: (scopeOfWork) => projectService.update(id, { scopeOfWork }),
    onSuccess: () => { refetch(); toast.success('Scope saved'); setScopeModal(false); },
    onError: () => toast.error('Failed to save'),
  });

  const termsMut = useMutation({
    mutationFn: (termsAndConditions) => projectService.update(id, { termsAndConditions }),
    onSuccess: () => { refetch(); toast.success('Terms & Conditions saved'); setTermsModal(false); },
    onError: () => toast.error('Failed to save'),
  });

  const agreementMut = useMutation({
    mutationFn: (d) => projectService.uploadAgreement(id, d),
    onSuccess: () => { refetchAgreements(); toast.success('Agreement uploaded'); setAgreementModal(false); setAgreementForm({ title: '', url: '' }); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const milestoneMut = useMutation({
    mutationFn: (d) => projectService.addMilestone(id, d),
    onSuccess: () => { refetch(); toast.success('Milestone added'); setMilestoneModal(false); setMsForm({ name: '', dueDate: '', description: '' }); },
    onError: () => toast.error('Failed'),
  });

  const msStatusMut = useMutation({
    mutationFn: ({ msId, status }) => projectService.updateMilestone(id, msId, { status }),
    onSuccess: () => { refetch(); toast.success('Milestone updated'); },
    onError: () => toast.error('Failed'),
  });

  const assignMut = useMutation({
    mutationFn: (d) => assignmentService.assign(d),
    onSuccess: () => { refetchAssignments(); refetch(); toast.success('Employee assigned'); setAssignEmpId(''); setAssignNote(''); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to assign'),
  });

  const removeAssignMut = useMutation({
    mutationFn: (aId) => assignmentService.remove(aId),
    onSuccess: () => { refetchAssignments(); toast.success('Assignment removed'); },
    onError: () => toast.error('Failed'),
  });

  const progressMut = useMutation({
    mutationFn: (d) => editProgressId ? progressService.update(editProgressId, d) : progressService.add({ ...d, projectId: id }),
    onSuccess: () => {
      refetchProgress();
      toast.success(editProgressId ? 'Progress updated' : 'Progress added');
      setProgressModal(false);
      setEditProgressId(null);
      setProgressForm({ workDone: '', hoursSpent: '', completionPercentage: '', blockers: '', statusUpdate: 'on_track' });
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const commentMut = useMutation({
    mutationFn: ({ entryId, comment }) => progressService.addComment(entryId, comment),
    onSuccess: () => { refetchProgress(); toast.success('Comment added'); setCommentModal(null); setCommentText(''); },
    onError: () => toast.error('Failed'),
  });

  const openAssignModal = () => {
    setSelectedMembers((data?.teamMembers || []).map(m => ({ user: m.user?._id || m.user, name: m.user?.name || '', role: m.role || 'developer' })));
    setEmpSearch('');
    setAssignModal(true);
  };

  const toggleMember = (emp) => {
    setSelectedMembers(prev => {
      const exists = prev.find(m => m.user === emp._id);
      if (exists) return prev.filter(m => m.user !== emp._id);
      return [...prev, { user: emp._id, name: emp.name, role: 'developer' }];
    });
  };

  const openEditProgress = (entry) => {
    setEditProgressId(entry._id);
    setProgressForm({
      workDone: entry.workDone, hoursSpent: entry.hoursSpent,
      completionPercentage: entry.completionPercentage, blockers: entry.blockers || '',
      statusUpdate: entry.statusUpdate,
    });
    setProgressModal(true);
  };

  const today = new Date().toISOString().split('T')[0];
  const todayEntry = progressData?.find(e => e.date === today && (e.employee?._id === user?._id || e.employee === user?._id));

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 100);
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>;
  if (!data) return <div className="p-8 text-center text-slate-500">Project not found.</div>;

  const progress = data.progress ?? 0;
  const budget = typeof data.budget === 'object' ? data.budget?.estimated : data.budget;
  const daysLeft = data.endDate ? differenceInDays(new Date(data.endDate), new Date()) : null;
  const employees = empData || [];

  return (
    <>
      {/* Print Styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #printable-area, #printable-area * { visibility: visible; }
          #printable-area { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
          .crm-card { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>
      
      <div>
      <PageHeader
        title={data.name}
        breadcrumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'Projects', href: '/projects' }, { label: data.name }]}
        actions={
          <div className="flex items-center gap-2 flex-wrap no-print">
            <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors">
              <Printer className="w-4 h-4" /> Print
            </button>
            <button onClick={() => navigate('/projects')} className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl transition-colors modal-btn-secondary">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            {!isAdmin && (
              <button onClick={() => { setEditProgressId(null); setProgressForm({ workDone: '', hoursSpent: '', completionPercentage: '', blockers: '', statusUpdate: 'on_track' }); setProgressModal(true); }}
                className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl bg-green-600 text-white hover:bg-green-700 transition-colors">
                <Plus className="w-4 h-4" /> Add Today's Progress
              </button>
            )}
            {isAdmin && (
              <>
                <button onClick={() => setAgreementModal(true)} className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors">
                  <Upload className="w-4 h-4" /> Agreement
                </button>
                <button onClick={openAssignModal} className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors">
                  <Users className="w-4 h-4" /> Assign Team
                </button>
                <button onClick={() => { setScopeText(data.scopeOfWork || ''); setScopeModal(true); }} className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors">
                  <FileText className="w-4 h-4" /> Scope
                </button>
                <button onClick={() => { setTermsText(data.termsAndConditions || ''); setTermsModal(true); }} className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors">
                  <FileText className="w-4 h-4" /> Terms
                </button>
                <button onClick={() => setDeleteOpen(true)} className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors">
                  <RiDeleteBin6Line size={15} /> Delete
                </button>
              </>
            )}
          </div>
        }
      />

      {/* Printable Area */}
      <div id="printable-area">
        {/* Print Header - Only visible when printing */}
        {isPrinting && (
          <div className="mb-8 pb-6 border-b-2 border-gray-300">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Project Report</h1>
                <p className="text-lg text-gray-600 mb-4">{data.name}</p>
                <div className="text-sm text-gray-500">
                  Generated on: {format(new Date(), 'dd MMM yyyy, hh:mm a')}
                </div>
              </div>
              <div className="text-right">
                {/* Logo */}
                <div className="mb-3">
                  <img 
                    src="/logo.jpg" 
                    alt="ParNets Logo" 
                    className="h-16 ml-auto"
                  />
                </div>
                {/* Company Details */}
                <div className="text-sm text-gray-600">
                  <div className="font-bold text-lg text-gray-900 mb-2">ParNets Software India Pvt Ltd</div>
                  <div className="leading-relaxed">
                    <div>So104/1/50, Singapura Main Rd,</div>
                    <div>Singapura Village, Varadharaja Nagar,</div>
                    <div>Vidyaranyapura, Bengaluru,</div>
                    <div>Karnataka 560097</div>
                    <div className="mt-2 font-medium">Contact: 095909 26068</div>
                    <div className="text-indigo-600">hello@parnetsgroup.com</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: main info + progress */}
        <div className="lg:col-span-2 space-y-5">
          {/* Project Details */}
          <div className="crm-card p-6 space-y-5">
            <div className="flex items-start justify-between">
              <h2 className="text-base font-semibold" style={{ color: 'var(--text-1)' }}>Project Details</h2>
              {daysLeft !== null && (
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${daysLeft < 0 ? 'bg-red-100 text-red-700' : daysLeft <= 7 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                  {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : daysLeft === 0 ? 'Due today' : `${daysLeft}d left`}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-5">
              <Field label="Project Name" value={data.name} />
              <div>
                <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-3)' }}>Client</p>
                <button onClick={() => data.client?._id && navigate(`/clients/${data.client._id}`)}
                  className="text-sm font-medium text-indigo-600 hover:underline">
                  {data.client?.name || '—'}
                </button>
              </div>
              <Field label="Project Manager" value={data.projectManager?.name} />
              <Field label="Budget" value={budget ? formatINR(budget) : null} />
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--text-3)' }}>Start Date</p>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>{data.startDate ? format(new Date(data.startDate), 'dd MMM yyyy') : '—'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-red-400 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--text-3)' }}>Deadline</p>
                  <p className="text-sm font-semibold text-red-600">{data.endDate ? format(new Date(data.endDate), 'dd MMM yyyy') : '—'}</p>
                </div>
              </div>
              <div><p className="text-xs font-medium mb-1" style={{ color: 'var(--text-3)' }}>Status</p><StatusBadge status={data.status || 'planning'} /></div>
              <div><p className="text-xs font-medium mb-1" style={{ color: 'var(--text-3)' }}>Priority</p><StatusBadge status={data.priority || 'medium'} /></div>
              {data.technology?.length > 0 && (
                <div className="col-span-2">
                  <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-3)' }}>Technology Stack</p>
                  <div className="flex flex-wrap gap-1.5">
                    {data.technology.map((t, i) => <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">{t}</span>)}
                  </div>
                </div>
              )}
            </div>
            {data.description && <div><p className="text-xs font-medium mb-1" style={{ color: 'var(--text-3)' }}>Description</p><p className="text-sm" style={{ color: 'var(--text-2)' }}>{data.description}</p></div>}
            <div>
              <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-3)' }}><span>Overall Progress</span><span>{progress}%</span></div>
              <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-surface2)' }}>
                <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>

          {/* Agreements */}
          {(isAdmin || agreements?.length > 0) && (
            <div className="crm-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold" style={{ color: 'var(--text-1)' }}>Agreements ({agreements?.length || 0})</h2>
                {isAdmin && (
                  <button onClick={() => setAgreementModal(true)} className="flex items-center gap-1 text-xs px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors">
                    <Upload className="w-3 h-3" /> Upload
                  </button>
                )}
              </div>
              {agreements?.length ? (
                <div className="space-y-2">
                  {agreements.map((a, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--bg-surface2)' }}>
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>{a.title}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
                          v{a.version} · {a.uploadedBy?.name || 'Admin'} · {a.uploadedAt ? format(new Date(a.uploadedAt), 'dd MMM yyyy') : ''}
                        </p>
                      </div>
                      <a href={a.url} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors">
                        <Download className="w-3 h-3" /> View
                      </a>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm" style={{ color: 'var(--text-3)' }}>No agreements uploaded yet.</p>}
            </div>
          )}

          {/* Assigned Employees */}
          <div className="crm-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold" style={{ color: 'var(--text-1)' }}>Assigned Employees ({assignments?.length || 0})</h2>
              {isAdmin && (
                <button onClick={() => setAssignModal(true)} className="flex items-center gap-1 text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                  <Plus className="w-3 h-3" /> Assign
                </button>
              )}
            </div>
            {isAdmin && (
              <div className="flex gap-3 mb-4">
                <select value={assignEmpId} onChange={e => setAssignEmpId(e.target.value)} className="modal-input flex-1">
                  <option value="">Select employee to assign...</option>
                  {(empData || []).map(e => <option key={e._id} value={e._id}>{e.name} — {e.designation || e.role}</option>)}
                </select>
                <button onClick={() => assignEmpId && assignMut.mutate({ projectId: id, employeeId: assignEmpId, note: assignNote })}
                  disabled={!assignEmpId || assignMut.isPending}
                  className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                  {assignMut.isPending ? '...' : 'Assign'}
                </button>
              </div>
            )}
            {assignments?.length ? (
              <div className="space-y-2">
                {assignments.map((a) => (
                  <div key={a._id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--bg-surface2)' }}>
                    <div className="flex items-center gap-3">
                      <Avatar name={a.employee?.name || ''} size="sm" />
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>{a.employee?.name}</p>
                        <p className="text-xs" style={{ color: 'var(--text-3)' }}>{a.employee?.department} · Assigned {a.assignedDate ? format(new Date(a.assignedDate), 'dd MMM') : ''}</p>
                      </div>
                    </div>
                    {isAdmin && (
                      <button onClick={() => removeAssignMut.mutate(a._id)} className="text-red-400 hover:text-red-600 transition-colors p-1">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : <p className="text-sm" style={{ color: 'var(--text-3)' }}>No employees assigned yet.</p>}
          </div>

          {/* Day-wise Work Plans */}
          <div className="crm-card p-6">
            <h2 className="text-base font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-1)' }}>
              <CalendarDays className="w-5 h-5 text-indigo-500" /> Day-wise Work Plans
            </h2>
            {assignments?.length > 0 ? (
              <div className="space-y-6">
                {assignments.map((assignment) => {
                  const dayWisePlans = assignment.workPlan?.dayWisePlans || [];
                  if (dayWisePlans.length === 0) return null;
                  
                  return (
                    <div key={assignment._id} className="border-l-4 border-indigo-300 pl-4">
                      <div className="flex items-center gap-3 mb-3">
                        <Avatar name={assignment.employee?.name || ''} size="sm" />
                        <div>
                          <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{assignment.employee?.name}</p>
                          <p className="text-xs" style={{ color: 'var(--text-3)' }}>{assignment.employee?.department}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        {dayWisePlans.map((plan, idx) => (
                          <div key={plan._id} className="p-4 rounded-lg border" style={{ background: 'var(--bg-surface2)', borderColor: 'var(--border)' }}>
                            <div className="flex items-start gap-3">
                              <span className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 text-sm font-bold flex items-center justify-center flex-shrink-0">
                                {idx + 1}
                              </span>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                  <span className="text-xs font-semibold px-2.5 py-1 rounded bg-indigo-50 text-indigo-700">
                                    {format(new Date(plan.dateFrom), 'dd MMM yyyy')} 
                                    {plan.dateTo && plan.dateTo !== plan.dateFrom ? ` → ${format(new Date(plan.dateTo), 'dd MMM yyyy')}` : ''}
                                  </span>
                                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold capitalize ${
                                    plan.status === 'completed' ? 'bg-green-100 text-green-700' :
                                    plan.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                                    plan.status === 'on_hold' ? 'bg-yellow-100 text-yellow-700' :
                                    plan.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'
                                  }`}>
                                    {plan.status.replace('_', ' ')}
                                  </span>
                                  {plan.updatedAt && (
                                    <span className="text-xs" style={{ color: 'var(--text-3)' }}>
                                      Updated {format(new Date(plan.updatedAt), 'dd MMM yyyy')}
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-1)' }}>{plan.taskDescription}</p>
                                {plan.developerRemark && (
                                  <div className="px-3 py-2 rounded-lg bg-blue-50 border border-blue-200">
                                    <p className="text-xs font-semibold text-blue-600 mb-0.5">Developer Remark:</p>
                                    <p className="text-sm text-blue-900">{plan.developerRemark}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm" style={{ color: 'var(--text-3)' }}>No day-wise plans assigned yet.</p>
            )}
          </div>

          {/* Scope of Work - Print Section */}
          {data.scopeOfWork && (
            <div className="crm-card p-6">
              <h2 className="text-base font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-1)' }}>
                <FileText className="w-4 h-4 text-amber-500" /> Scope of Work
              </h2>
              <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-2)' }}>{data.scopeOfWork}</p>
            </div>
          )}

          {/* Terms & Conditions - Print Section */}
          {data.termsAndConditions && (
            <div className="crm-card p-6">
              <h2 className="text-base font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-1)' }}>
                <FileText className="w-4 h-4 text-blue-500" /> Terms & Conditions
              </h2>
              <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-2)' }}>{data.termsAndConditions}</p>
            </div>
          )}

          {/* Daily Progress Timeline */}
          <div className="crm-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold" style={{ color: 'var(--text-1)' }}>Progress Timeline ({progressData?.length || 0} entries)</h2>
              {!isAdmin && (
                <button
                  onClick={() => {
                    if (todayEntry) { openEditProgress(todayEntry); }
                    else { setEditProgressId(null); setProgressForm({ workDone: '', hoursSpent: '', completionPercentage: '', blockers: '', statusUpdate: 'on_track' }); setProgressModal(true); }
                  }}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                  <Plus className="w-3 h-3" /> {todayEntry ? "Edit Today's" : "Add Today's Progress"}
                </button>
              )}
            </div>
            {progressData?.length ? (
              <div className="space-y-4">
                {progressData.map((entry) => (
                  <div key={entry._id} className="p-4 rounded-xl border" style={{ background: 'var(--bg-surface2)', borderColor: 'var(--border)' }}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={entry.employee?.name || ''} size="sm" />
                        <div>
                          <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{entry.employee?.name}</p>
                          <p className="text-xs" style={{ color: 'var(--text-3)' }}>{entry.date} · {entry.hoursSpent}h spent</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {statusIcon(entry.statusUpdate)}
                        <StatusBadge status={entry.statusUpdate} />
                        {!isAdmin && entry.date === today && entry.employee?._id === user?._id && (
                          <button onClick={() => openEditProgress(entry)} className="text-xs text-indigo-600 hover:underline">Edit</button>
                        )}
                        {isAdmin && (
                          <button onClick={() => { setCommentModal(entry); setCommentText(entry.adminComment || ''); }}
                            className="p-1 text-slate-400 hover:text-indigo-600 transition-colors">
                            <MessageSquare className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-sm mb-2" style={{ color: 'var(--text-1)' }}>{entry.workDone}</p>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-surface)' }}>
                        <div className="h-full rounded-full bg-indigo-500" style={{ width: `${entry.completionPercentage}%` }} />
                      </div>
                      <span className="text-xs font-medium" style={{ color: 'var(--text-3)' }}>{entry.completionPercentage}%</span>
                    </div>
                    {entry.blockers && (
                      <p className="text-xs p-2 rounded-lg bg-red-50 text-red-700 mt-2">
                        <AlertTriangle className="w-3 h-3 inline mr-1" />Blocker: {entry.blockers}
                      </p>
                    )}
                    {entry.adminComment && (
                      <div className="mt-2 p-2 rounded-lg bg-indigo-50 text-xs text-indigo-800">
                        <MessageSquare className="w-3 h-3 inline mr-1" />
                        <strong>{entry.adminCommentBy?.name || 'Admin'}:</strong> {entry.adminComment}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm" style={{ color: 'var(--text-3)' }}>No progress entries yet.</p>
            )}
          </div>
        </div>

        {/* Right sidebar: milestones + scope + terms */}
        <div className="space-y-5">
          {data.scopeOfWork && (
            <div className="crm-card p-6">
              <h2 className="text-base font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-1)' }}>
                <FileText className="w-4 h-4 text-amber-500" /> Scope of Work
              </h2>
              <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-2)' }}>{data.scopeOfWork}</p>
            </div>
          )}

          {data.termsAndConditions && (
            <div className="crm-card p-6">
              <h2 className="text-base font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-1)' }}>
                <FileText className="w-4 h-4 text-blue-500" /> Terms & Conditions
              </h2>
              <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-2)' }}>{data.termsAndConditions}</p>
            </div>
          )}

          <div className="crm-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold" style={{ color: 'var(--text-1)' }}>Milestones</h2>
              {isAdmin && (
                <button onClick={() => setMilestoneModal(true)} className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                  <Plus className="w-3 h-3" /> Add
                </button>
              )}
            </div>
            {data.milestones?.length ? (
              <ul className="space-y-3">
                {data.milestones.map((m) => (
                  <li key={m._id} className="p-3 rounded-xl" style={{ background: 'var(--bg-surface2)' }}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>{m.name}</p>
                      <StatusBadge status={m.status || 'pending'} />
                    </div>
                    {m.dueDate && <p className="text-xs" style={{ color: 'var(--text-3)' }}>Due: {format(new Date(m.dueDate), 'dd MMM yyyy')}</p>}
                    {isAdmin && m.status !== 'completed' && (
                      <button onClick={() => msStatusMut.mutate({ msId: m._id, status: 'completed' })}
                        className="mt-2 text-xs text-green-600 hover:underline">Mark complete</button>
                    )}
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm" style={{ color: 'var(--text-3)' }}>No milestones yet.</p>}
          </div>
        </div>
      </div>

      {/* Assign Team Modal */}
      <Modal open={assignModal} onClose={() => setAssignModal(false)} title="Manage Team Members" size="lg">
        <div className="space-y-4">
          <input type="text" placeholder="Search employees..." value={empSearch} onChange={e => setEmpSearch(e.target.value)} className="modal-input" />
          <div className="max-h-56 overflow-y-auto space-y-1 border border-slate-100 rounded-xl p-2">
            {employees.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No employees found</p>}
            {employees.map(emp => {
              const selected = selectedMembers.find(m => m.user === emp._id);
              return (
                <div key={emp._id} onClick={() => toggleMember(emp)}
                  className="flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors"
                  style={{ background: selected ? 'rgba(99,102,241,0.08)' : 'transparent' }}>
                  <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border-2 transition-colors ${selected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                    {selected && <span className="text-white text-[10px] font-bold">✓</span>}
                  </div>
                  <Avatar name={emp.name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-1)' }}>{emp.name}</p>
                    <p className="text-xs truncate" style={{ color: 'var(--text-3)' }}>{emp.department} · {emp.designation || emp.role}</p>
                  </div>
                </div>
              );
            })}
          </div>
          {selectedMembers.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-2">Selected ({selectedMembers.length}) — set roles:</p>
              <div className="space-y-2">
                {selectedMembers.map(m => (
                  <div key={m.user} className="flex items-center gap-3 p-2.5 bg-indigo-50 rounded-xl">
                    <Avatar name={m.name} size="sm" />
                    <span className="text-sm font-medium flex-1" style={{ color: 'var(--text-1)' }}>{m.name}</span>
                    <select value={m.role} onChange={e => setSelectedMembers(p => p.map(x => x.user === m.user ? { ...x, role: e.target.value } : x))}
                      className="text-xs px-2 py-1 border border-slate-200 rounded-lg focus:outline-none" onClick={e => e.stopPropagation()}>
                      {MEMBER_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <button onClick={() => setSelectedMembers(p => p.filter(x => x.user !== m.user))} className="text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button onClick={() => teamMut.mutate(selectedMembers.map(m => ({ user: m.user, role: m.role })))} disabled={teamMut.isPending}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50">
              <Save className="w-4 h-4" />{teamMut.isPending ? 'Saving...' : `Save Team (${selectedMembers.length})`}
            </button>
            <button onClick={() => setAssignModal(false)} className="px-5 py-2.5 modal-btn-secondary text-sm rounded-xl">Cancel</button>
          </div>
        </div>
      </Modal>

      {/* Scope Modal */}
      <Modal open={scopeModal} onClose={() => setScopeModal(false)} title="Scope of Work" size="md">
        <div className="space-y-4">
          <textarea value={scopeText} onChange={e => setScopeText(e.target.value)} rows={8} className="modal-input"
            placeholder="Describe the project scope, deliverables, requirements..." style={{ resize: 'vertical' }} />
          <div className="flex gap-3">
            <button onClick={() => scopeMut.mutate(scopeText)} disabled={scopeMut.isPending}
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50">
              {scopeMut.isPending ? 'Saving...' : 'Save Scope'}
            </button>
            <button onClick={() => setScopeModal(false)} className="px-5 py-2.5 modal-btn-secondary text-sm rounded-xl">Cancel</button>
          </div>
        </div>
      </Modal>

      {/* Terms & Conditions Modal */}
      <Modal open={termsModal} onClose={() => setTermsModal(false)} title="Terms & Conditions" size="lg">
        <div className="space-y-4">
          <textarea value={termsText} onChange={e => setTermsText(e.target.value)} rows={12} className="modal-input"
            placeholder="Enter terms and conditions for this project..." style={{ resize: 'vertical' }} />
          <div className="flex gap-3">
            <button onClick={() => termsMut.mutate(termsText)} disabled={termsMut.isPending}
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50">
              {termsMut.isPending ? 'Saving...' : 'Save Terms & Conditions'}
            </button>
            <button onClick={() => setTermsModal(false)} className="px-5 py-2.5 modal-btn-secondary text-sm rounded-xl">Cancel</button>
          </div>
        </div>
      </Modal>

      {/* Agreement Upload Modal */}
      <Modal open={agreementModal} onClose={() => setAgreementModal(false)} title="Upload Agreement" size="sm">
        <div className="space-y-4">
          <div>
            <label className="modal-form-label">Agreement Title *</label>
            <input value={agreementForm.title} onChange={e => setAgreementForm(p => ({ ...p, title: e.target.value }))} className="modal-input" placeholder="e.g. Service Agreement v1" />
          </div>
          <div>
            <label className="modal-form-label">Document URL *</label>
            <input value={agreementForm.url} onChange={e => setAgreementForm(p => ({ ...p, url: e.target.value }))} className="modal-input" placeholder="https://..." />
            <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>Paste the S3/Drive URL of the uploaded document</p>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => { if (!agreementForm.title || !agreementForm.url) return toast.error('Fill all fields'); agreementMut.mutate(agreementForm); }}
              disabled={agreementMut.isPending} className="modal-btn-primary disabled:opacity-50">
              {agreementMut.isPending ? 'Uploading...' : 'Upload'}
            </button>
            <button onClick={() => setAgreementModal(false)} className="modal-btn-secondary">Cancel</button>
          </div>
        </div>
      </Modal>

      {/* Add Milestone Modal */}
      <Modal open={milestoneModal} onClose={() => setMilestoneModal(false)} title="Add Milestone" size="sm">
        <div className="space-y-4">
          <div>
            <label className="modal-form-label">Milestone Title *</label>
            <input value={msForm.name} onChange={e => setMsForm(p => ({ ...p, name: e.target.value }))} className="modal-input" />
          </div>
          <div>
            <label className="modal-form-label">Due Date</label>
            <input type="date" value={msForm.dueDate} onChange={e => setMsForm(p => ({ ...p, dueDate: e.target.value }))} className="modal-input" />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => { if (!msForm.name) return toast.error('Title required'); milestoneMut.mutate(msForm); }}
              disabled={milestoneMut.isPending} className="modal-btn-primary disabled:opacity-50">
              {milestoneMut.isPending ? 'Adding...' : 'Add Milestone'}
            </button>
            <button onClick={() => setMilestoneModal(false)} className="modal-btn-secondary">Cancel</button>
          </div>
        </div>
      </Modal>

      {/* Progress Modal */}
      <Modal open={progressModal} onClose={() => setProgressModal(false)} title={editProgressId ? "Edit Progress" : "Add Today's Progress"} size="md">
        <div className="space-y-4">
          <div>
            <label className="modal-form-label">Work Done Today *</label>
            <textarea value={progressForm.workDone} onChange={e => setProgressForm(p => ({ ...p, workDone: e.target.value }))}
              rows={4} className="modal-input" placeholder="Describe what you completed today..." style={{ resize: 'none' }} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="modal-form-label">Hours Spent *</label>
              <input type="number" min="0" max="24" step="0.5" value={progressForm.hoursSpent}
                onChange={e => setProgressForm(p => ({ ...p, hoursSpent: e.target.value }))} className="modal-input" />
            </div>
            <div>
              <label className="modal-form-label">Completion % *</label>
              <input type="number" min="0" max="100" value={progressForm.completionPercentage}
                onChange={e => setProgressForm(p => ({ ...p, completionPercentage: e.target.value }))} className="modal-input" />
            </div>
          </div>
          <div>
            <label className="modal-form-label">Status Update</label>
            <select value={progressForm.statusUpdate} onChange={e => setProgressForm(p => ({ ...p, statusUpdate: e.target.value }))} className="modal-input">
              <option value="on_track">On Track</option>
              <option value="delayed">Delayed</option>
              <option value="blocked">Blocked</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div>
            <label className="modal-form-label">Blockers / Issues (optional)</label>
            <textarea value={progressForm.blockers} onChange={e => setProgressForm(p => ({ ...p, blockers: e.target.value }))}
              rows={2} className="modal-input" placeholder="Any blockers or issues..." style={{ resize: 'none' }} />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => {
                if (!progressForm.workDone || !progressForm.hoursSpent || progressForm.completionPercentage === '')
                  return toast.error('Fill all required fields');
                progressMut.mutate({ ...progressForm, hoursSpent: Number(progressForm.hoursSpent), completionPercentage: Number(progressForm.completionPercentage) });
              }}
              disabled={progressMut.isPending} className="modal-btn-primary disabled:opacity-50">
              {progressMut.isPending ? 'Saving...' : 'Save Progress'}
            </button>
            <button onClick={() => setProgressModal(false)} className="modal-btn-secondary">Cancel</button>
          </div>
        </div>
      </Modal>

      {/* Admin Comment Modal */}
      <Modal open={!!commentModal} onClose={() => setCommentModal(null)} title="Add Comment" size="sm">
        <div className="space-y-4">
          <p className="text-sm" style={{ color: 'var(--text-2)' }}>
            Commenting on <strong>{commentModal?.employee?.name}</strong>'s update from {commentModal?.date}
          </p>
          <textarea value={commentText} onChange={e => setCommentText(e.target.value)} rows={4} className="modal-input"
            placeholder="Your feedback or comment..." style={{ resize: 'none' }} />
          <div className="flex gap-3">
            <button onClick={() => commentMut.mutate({ entryId: commentModal._id, comment: commentText })}
              disabled={commentMut.isPending || !commentText.trim()} className="modal-btn-primary disabled:opacity-50">
              {commentMut.isPending ? 'Saving...' : 'Add Comment'}
            </button>
            <button onClick={() => setCommentModal(null)} className="modal-btn-secondary">Cancel</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={deleteOpen} onClose={() => setDeleteOpen(false)} onConfirm={() => deleteMut.mutate()} loading={deleteMut.isPending} title="Delete this project?" message="This action cannot be undone." />
      </div> {/* End printable-area */}
    </div> {/* End main container */}
    </>
  );
};

export default ProjectDetail;
