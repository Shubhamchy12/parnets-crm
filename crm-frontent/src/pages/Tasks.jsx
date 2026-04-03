import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { assignmentService } from '../services/assignmentService';
import { useAuth } from '../contexts/AuthContext';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import toast from 'react-hot-toast';
import {
  FolderOpen, Clock, Building2, CalendarDays, Calendar, Plus, X, Trash2,
} from 'lucide-react';
import { format } from 'date-fns';

const WP_STATUS = [
  { val: 'pending',     label: 'Pending',     active: 'bg-slate-600 text-white border-slate-600', idle: 'bg-slate-50 text-slate-500 border-slate-200' },
  { val: 'in_progress', label: 'In Progress', active: 'bg-blue-600 text-white border-blue-600',   idle: 'bg-blue-50 text-blue-600 border-blue-200' },
  { val: 'on_hold',     label: 'On Hold',     active: 'bg-yellow-600 text-white border-yellow-600', idle: 'bg-yellow-50 text-yellow-600 border-yellow-200' },
  { val: 'completed',   label: 'Completed',   active: 'bg-green-600 text-white border-green-600', idle: 'bg-green-50 text-green-600 border-green-200' },
  { val: 'cancelled',   label: 'Cancelled',   active: 'bg-red-600 text-white border-red-600',     idle: 'bg-red-50 text-red-500 border-red-200' },
];

const fmtDate = (val) => {
  if (!val) return '—';
  try { return format(new Date(val), 'dd MMM yyyy'); } catch { return val; }
};

// ── Employee Project Card ──────────────────────────────────────────────────
const ProjectCard = ({ entry, onSelect }) => {
  const proj = entry.project || {};
  const wp = entry.workPlan;
  const dayWisePlans = wp?.dayWisePlans || [];
  const daysLeft = proj.endDate ? Math.round((new Date(proj.endDate) - new Date()) / 86400000) : null;
  const overdue = daysLeft !== null && daysLeft < 0;
  const borderColors = {
    in_progress: '#3b82f6', planning: '#94a3b8', testing: '#eab308',
    completed: '#22c55e', on_hold: '#f97316', cancelled: '#ef4444',
  };
  
  // Calculate overall progress
  const completedPlans = dayWisePlans.filter(p => p.status === 'completed').length;
  const totalPlans = dayWisePlans.length;
  const progressPct = totalPlans > 0 ? Math.round((completedPlans / totalPlans) * 100) : 0;
  
  return (
    <button onClick={() => onSelect(entry)} className="w-full text-left crm-card p-5 hover:shadow-md transition-all group"
      style={{ borderLeft: `4px solid ${borderColors[proj.status] || '#94a3b8'}` }}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold truncate group-hover:text-indigo-600 transition-colors" style={{ color: 'var(--text-1)' }}>
            {proj.name || 'Unnamed Project'}
          </p>
          {proj.client?.name && (
            <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: 'var(--text-3)' }}>
              <Building2 className="w-3 h-3" /> {proj.client.name}
            </p>
          )}
        </div>
        <StatusBadge status={proj.status || 'planning'} />
      </div>
      <div className="space-y-2 text-xs">
        {/* Day-wise Plans Progress */}
        {totalPlans > 0 && (
          <div className="p-2 rounded-lg bg-gradient-to-r from-indigo-50 to-blue-50">
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold" style={{ color: 'var(--text-2)' }}>
                {totalPlans} Day-wise Plan{totalPlans !== 1 ? 's' : ''}
              </span>
              <span className="font-bold text-indigo-600">{progressPct}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs">
              <span className="text-green-600 font-semibold">{completedPlans} done</span>
              <span className="text-slate-400">•</span>
              <span className="text-blue-600 font-semibold">{totalPlans - completedPlans} pending</span>
            </div>
          </div>
        )}
        
        {/* Days Left */}
        {daysLeft !== null && (
          <div className={`flex items-center gap-1.5 font-semibold ${overdue ? 'text-red-500' : daysLeft <= 7 ? 'text-orange-500' : 'text-green-600'}`}>
            <Clock className="w-3.5 h-3.5 flex-shrink-0" />
            {overdue ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`}
          </div>
        )}
      </div>
    </button>
  );
};

// ── Main Tasks Component ──────────────────────────────────────────────────
const Tasks = () => {
  const { user } = useAuth();
  const isDeveloper = user?.role === 'developer';
  
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [editingPlanId, setEditingPlanId] = useState(null);
  const [planUpdates, setPlanUpdates] = useState({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingPlanId, setDeletingPlanId] = useState(null);
  const [newTask, setNewTask] = useState({
    taskDescription: '',
    dateFrom: '',
    dateTo: '',
    status: 'pending',
    developerRemark: ''
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['my-assignments'],
    queryFn: async () => {
      const res = await assignmentService.getAll({ status: 'active' });
      return res.data.data;
    },
  });

  const assignments = data?.assignments || [];

  const handleSelectProject = (assignment) => {
    console.log('Selected assignment:', assignment);
    setSelectedAssignment(assignment);
    setEditingPlanId(null);
    setPlanUpdates({});
  };

  const handleBackToList = () => {
    setSelectedAssignment(null);
    setEditingPlanId(null);
    setPlanUpdates({});
  };

  const handleUpdatePlan = async (planId) => {
    const updates = planUpdates[planId];
    if (!updates || (!updates.status && !updates.developerRemark)) {
      return toast.error('Please provide status or remark');
    }

    setIsUpdating(true);
    try {
      const response = await assignmentService.updateDayWisePlan(selectedAssignment._id, planId, updates);
      console.log('Update response:', response);
      
      toast.success('Plan updated successfully');
      setPlanUpdates(prev => ({ ...prev, [planId]: {} }));
      setEditingPlanId(null);
      
      // Update the selected assignment with the fresh data from server
      if (response.data?.data?.assignment) {
        setSelectedAssignment(response.data.data.assignment);
      } else {
        // Fallback: fetch the assignment again
        const freshData = await assignmentService.getById(selectedAssignment._id);
        if (freshData.data?.data?.assignment) {
          setSelectedAssignment(freshData.data.data.assignment);
        }
      }
      
      // Also refetch the list to update the cards
      refetch();
    } catch (err) {
      console.error('Update error:', err);
      toast.error(err.response?.data?.message || 'Failed to update');
    } finally {
      setIsUpdating(false);
    }
  };

  const updatePlanField = (planId, field, value) => {
    setPlanUpdates(prev => ({
      ...prev,
      [planId]: { ...(prev[planId] || {}), [field]: value }
    }));
  };

  const handleAddTask = async () => {
    if (!newTask.taskDescription.trim()) {
      return toast.error('Please enter task description');
    }
    if (!newTask.dateFrom) {
      return toast.error('Please select start date');
    }

    setIsUpdating(true);
    try {
      const response = await assignmentService.addDayWisePlan(selectedAssignment._id, {
        taskDescription: newTask.taskDescription,
        dateFrom: newTask.dateFrom,
        dateTo: newTask.dateTo || newTask.dateFrom,
        status: newTask.status,
        developerRemark: newTask.developerRemark
      });
      
      toast.success('Task added successfully');
      setShowAddTaskModal(false);
      setNewTask({
        taskDescription: '',
        dateFrom: '',
        dateTo: '',
        status: 'pending',
        developerRemark: ''
      });
      
      // Update the selected assignment with fresh data
      if (response.data?.data?.assignment) {
        setSelectedAssignment(response.data.data.assignment);
      } else {
        const freshData = await assignmentService.getById(selectedAssignment._id);
        if (freshData.data?.data?.assignment) {
          setSelectedAssignment(freshData.data.data.assignment);
        }
      }
      
      refetch();
    } catch (err) {
      console.error('Add task error:', err);
      toast.error(err.response?.data?.message || 'Failed to add task');
    } finally {
      setIsUpdating(false);
    }
  };

  // If a project is selected, show detail view
  if (selectedAssignment) {
    const proj = selectedAssignment.project;
    const wp = selectedAssignment.workPlan;
    const dayWisePlans = wp?.dayWisePlans || [];

    return (
      <div className="p-6 max-w-7xl mx-auto">
        {/* Back Button */}
        <button 
          onClick={handleBackToList}
          className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium mb-4 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Projects
        </button>

        {/* Project Header */}
        <div className="crm-card p-6 mb-6 bg-gradient-to-br from-indigo-50 to-blue-50">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-1)' }}>{proj?.name}</h1>
              {proj?.client?.name && (
                <p className="text-sm flex items-center gap-2 mb-3" style={{ color: 'var(--text-2)' }}>
                  <Building2 className="w-4 h-4" /> {proj.client.name}
                </p>
              )}
              <div className="flex flex-wrap gap-4 text-sm">
                {proj?.startDate && (
                  <span className="flex items-center gap-1.5" style={{ color: 'var(--text-3)' }}>
                    <Calendar className="w-4 h-4" /> Start: {fmtDate(proj.startDate)}
                  </span>
                )}
                {proj?.endDate && (
                  <span className="flex items-center gap-1.5" style={{ color: 'var(--text-3)' }}>
                    <Calendar className="w-4 h-4" /> End: {fmtDate(proj.endDate)}
                  </span>
                )}
              </div>
            </div>
            <StatusBadge status={proj?.status || 'planning'} />
          </div>
        </div>

        {/* Day-wise Plans */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--text-1)' }}>
              <CalendarDays className="w-5 h-5 text-indigo-500" /> 
              Day-wise Work Plans {dayWisePlans.length > 0 && `(${dayWisePlans.length})`}
            </h2>
            <button 
              onClick={() => setShowAddTaskModal(true)}
              className="crm-button-primary px-4 py-2 flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Task
            </button>
          </div>
          
          {dayWisePlans.length > 0 ? (
            <div className="space-y-4">
              {dayWisePlans.map((plan, idx) => {
                const isEditing = editingPlanId === plan._id;
                const currentUpdates = planUpdates[plan._id] || {};
                const currentStatus = currentUpdates.status || plan.status;
                const currentRemark = currentUpdates.developerRemark !== undefined ? currentUpdates.developerRemark : plan.developerRemark;
                
                return (
                  <div key={plan._id} className="crm-card overflow-hidden border-l-4" style={{ borderLeftColor: 
                    plan.status === 'completed' ? '#22c55e' :
                    plan.status === 'in_progress' ? '#3b82f6' :
                    plan.status === 'on_hold' ? '#eab308' :
                    plan.status === 'cancelled' ? '#ef4444' : '#94a3b8'
                  }}>
                    {/* Plan Header */}
                    <div className="p-5 bg-gradient-to-r from-slate-50 to-gray-50">
                      <div className="flex items-start gap-4">
                        <span className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 text-lg font-bold flex items-center justify-center flex-shrink-0">
                          {idx + 1}
                        </span>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <span className="text-sm font-bold px-3 py-1 rounded-lg bg-indigo-100 text-indigo-700">
                              {fmtDate(plan.dateFrom)} {plan.dateTo && plan.dateTo !== plan.dateFrom ? `→ ${fmtDate(plan.dateTo)}` : ''}
                            </span>
                            <span className={`text-sm px-3 py-1 rounded-full font-semibold capitalize ${
                              plan.status === 'completed' ? 'bg-green-100 text-green-700' :
                              plan.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                              plan.status === 'on_hold' ? 'bg-yellow-100 text-yellow-700' :
                              plan.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {plan.status.replace('_', ' ')}
                            </span>
                            {plan.updatedAt && (
                              <span className="text-xs" style={{ color: 'var(--text-3)' }}>
                                Updated {fmtDate(plan.updatedAt)}
                              </span>
                            )}
                          </div>
                          <p className="text-base font-medium mb-3" style={{ color: 'var(--text-1)' }}>{plan.taskDescription}</p>
                          {plan.developerRemark && !isEditing && (
                            <div className="px-4 py-3 rounded-lg bg-blue-50 border border-blue-200">
                              <p className="text-xs font-semibold text-blue-600 mb-1">Your Remark:</p>
                              <p className="text-sm" style={{ color: 'var(--text-2)' }}>{plan.developerRemark}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Update Form */}
                    {isEditing ? (
                      <div className="p-5 border-t" style={{ borderColor: 'var(--border)', background: 'var(--bg-1)' }}>
                        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-1)' }}>
                          <Clock className="w-4 h-4 text-indigo-500" /> Update Progress
                        </h3>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-2)' }}>Update Status</label>
                            <select 
                              value={currentStatus}
                              onChange={e => updatePlanField(plan._id, 'status', e.target.value)}
                              className="crm-input">
                              {WP_STATUS.map(s => <option key={s.val} value={s.val}>{s.label}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-2)' }}>Developer Remark</label>
                            <textarea 
                              value={currentRemark || ''}
                              onChange={e => updatePlanField(plan._id, 'developerRemark', e.target.value)}
                              rows={3} 
                              className="crm-input" 
                              placeholder="Add your progress notes, challenges, or updates..." />
                          </div>
                          <div className="flex items-center gap-3">
                            <button 
                              onClick={() => handleUpdatePlan(plan._id)}
                              disabled={isUpdating}
                              className="crm-button-primary px-6 py-2.5">
                              {isUpdating ? 'Saving...' : 'Save Update'}
                            </button>
                            <button 
                              onClick={() => {
                                setEditingPlanId(null);
                                setPlanUpdates(prev => ({ ...prev, [plan._id]: {} }));
                              }}
                              className="px-6 py-2.5 rounded-lg border transition-colors"
                              style={{ borderColor: 'var(--border)', color: 'var(--text-2)' }}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-5 border-t" style={{ borderColor: 'var(--border)' }}>
                        <button 
                          onClick={() => setEditingPlanId(plan._id)}
                          className="crm-button-primary px-5 py-2.5 flex items-center gap-2">
                          <Clock className="w-4 h-4" /> Update Progress
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="crm-card p-12 text-center">
              <CalendarDays className="w-16 h-16 mx-auto mb-3 text-gray-300" />
              <p className="text-base font-medium mb-1" style={{ color: 'var(--text-2)' }}>No day-wise plans assigned yet</p>
              <p className="text-sm" style={{ color: 'var(--text-3)' }}>Your manager will add work plans for this project</p>
            </div>
          )}
        </div>

        {/* Project Credentials */}
        {proj?.credentials && proj.credentials.length > 0 && (
          <div className="mt-6">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4" style={{ color: 'var(--text-1)' }}>
              <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              Project Credentials ({proj.credentials.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {proj.credentials.map((cred, i) => (
                <div key={cred._id || i} className="crm-card p-4 bg-gradient-to-br from-emerald-50 to-teal-50">
                  <div className="flex items-start gap-3">
                    <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 text-sm font-bold flex items-center justify-center flex-shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1 space-y-2">
                      <p className="text-sm font-bold text-emerald-700">{cred.title}</p>
                      {cred.link && (
                        <div className="flex items-start gap-2">
                          <span className="text-xs font-medium text-slate-500 flex-shrink-0">Link:</span>
                          <a href={cred.link} target="_blank" rel="noreferrer"
                            className="text-xs text-indigo-600 hover:text-indigo-800 hover:underline break-all">
                            {cred.link}
                          </a>
                        </div>
                      )}
                      {cred.userId && (
                        <div className="flex items-start gap-2">
                          <span className="text-xs font-medium text-slate-500 flex-shrink-0">User ID:</span>
                          <code className="text-xs px-2 py-1 rounded bg-white text-slate-700 font-mono border border-slate-200">{cred.userId}</code>
                        </div>
                      )}
                      {cred.password && (
                        <div className="flex items-start gap-2">
                          <span className="text-xs font-medium text-slate-500 flex-shrink-0">Password:</span>
                          <code className="text-xs px-2 py-1 rounded bg-white text-slate-700 font-mono border border-slate-200">{cred.password}</code>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add Task Modal */}
        {showAddTaskModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-blue-600 text-white p-6 rounded-t-xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <Plus className="w-6 h-6" /> Add New Task
                  </h3>
                  <button 
                    onClick={() => {
                      setShowAddTaskModal(false);
                      setNewTask({
                        taskDescription: '',
                        dateFrom: '',
                        dateTo: '',
                        status: 'pending',
                        developerRemark: ''
                      });
                    }}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-1)' }}>
                    Task Description <span className="text-red-500">*</span>
                  </label>
                  <textarea 
                    value={newTask.taskDescription}
                    onChange={e => setNewTask(prev => ({ ...prev, taskDescription: e.target.value }))}
                    rows={4} 
                    className="crm-input" 
                    placeholder="Describe the task in detail..." />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-1)' }}>
                      Start Date <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="date"
                      value={newTask.dateFrom}
                      onChange={e => setNewTask(prev => ({ ...prev, dateFrom: e.target.value }))}
                      className="crm-input" />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-1)' }}>
                      End Date (Optional)
                    </label>
                    <input 
                      type="date"
                      value={newTask.dateTo}
                      onChange={e => setNewTask(prev => ({ ...prev, dateTo: e.target.value }))}
                      min={newTask.dateFrom}
                      className="crm-input" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-1)' }}>
                    Initial Status
                  </label>
                  <select 
                    value={newTask.status}
                    onChange={e => setNewTask(prev => ({ ...prev, status: e.target.value }))}
                    className="crm-input">
                    {WP_STATUS.map(s => <option key={s.val} value={s.val}>{s.label}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-1)' }}>
                    Notes / Remarks (Optional)
                  </label>
                  <textarea 
                    value={newTask.developerRemark}
                    onChange={e => setNewTask(prev => ({ ...prev, developerRemark: e.target.value }))}
                    rows={3} 
                    className="crm-input" 
                    placeholder="Add any initial notes or remarks..." />
                </div>

                <div className="flex items-center gap-3 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                  <button 
                    onClick={handleAddTask}
                    disabled={isUpdating}
                    className="crm-button-primary px-6 py-3 flex items-center gap-2 flex-1">
                    <Plus className="w-4 h-4" />
                    {isUpdating ? 'Adding Task...' : 'Add Task'}
                  </button>
                  <button 
                    onClick={() => {
                      setShowAddTaskModal(false);
                      setNewTask({
                        taskDescription: '',
                        dateFrom: '',
                        dateTo: '',
                        status: 'pending',
                        developerRemark: ''
                      });
                    }}
                    className="px-6 py-3 rounded-lg border transition-colors"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-2)' }}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Project List View
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="My Tasks"
        subtitle="View your assigned projects and update progress"
      />

      <div className="mt-6">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="mt-2 text-sm" style={{ color: 'var(--text-3)' }}>Loading assignments...</p>
          </div>
        ) : assignments.length === 0 ? (
          <div className="text-center py-12 crm-card">
            <FolderOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-1" style={{ color: 'var(--text-2)' }}>No Projects Assigned</p>
            <p className="text-sm" style={{ color: 'var(--text-3)' }}>You don't have any active project assignments yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assignments.map(assignment => (
              <ProjectCard key={assignment._id} entry={assignment} onSelect={handleSelectProject} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Tasks;
