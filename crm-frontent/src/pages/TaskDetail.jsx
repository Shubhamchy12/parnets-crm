import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taskService } from '../services/taskService';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import Avatar from '../components/common/Avatar';
import toast from 'react-hot-toast';
import { ArrowLeft, Calendar, Flag, User, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react';

const STATUSES = [
  { val: 'todo',        label: 'To Do',       active: 'bg-slate-600 text-white border-slate-600',  idle: 'bg-slate-50 text-slate-500 border-slate-200' },
  { val: 'in_progress', label: 'In Progress', active: 'bg-blue-600 text-white border-blue-600',    idle: 'bg-blue-50 text-blue-600 border-blue-200' },
  { val: 'review',      label: 'Review',      active: 'bg-yellow-500 text-white border-yellow-500',idle: 'bg-yellow-50 text-yellow-600 border-yellow-200' },
  { val: 'done',        label: 'Done',        active: 'bg-green-600 text-white border-green-600',  idle: 'bg-green-50 text-green-600 border-green-200' },
];

const TaskDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const isDeveloper = user?.role === 'employee' || user?.role === 'sales';

  const { data: task, isLoading } = useQuery({
    queryKey: ['task', id],
    queryFn: () => taskService.getOne(id).then(r => r.data?.data?.task || r.data?.data),
    enabled: !!id,
  });

  const updateMut = useMutation({
    mutationFn: (status) => taskService.update(id, { status }),
    onSuccess: () => { qc.invalidateQueries(['task', id]); qc.invalidateQueries(['tasks']); toast.success('Status updated'); },
    onError: () => toast.error('Failed to update'),
  });

  const deleteMut = useMutation({
    mutationFn: () => taskService.remove(id),
    onSuccess: () => {
      toast.success('Task deleted successfully');
      navigate('/tasks');
    },
    onError: () => toast.error('Failed to delete task'),
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!task) return (
    <div className="crm-card p-10 text-center">
      <p style={{ color: 'var(--text-3)' }}>Task not found.</p>
      <button onClick={() => navigate('/tasks')} className="mt-4 modal-btn-secondary">Back to Tasks</button>
    </div>
  );

  const priorityColor = { high: 'text-red-600 bg-red-50', medium: 'text-yellow-600 bg-yellow-50', low: 'text-green-600 bg-green-50' };

  return (
    <div>
      <PageHeader
        title={task.title || 'Task Detail'}
        breadcrumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'Tasks', href: '/tasks' }, { label: task.title || 'Detail' }]}
        actions={
          <button onClick={() => navigate('/tasks')} className="flex items-center gap-2 modal-btn-secondary px-4 py-2">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Main */}
        <div className="md:col-span-2 space-y-5">
          <div className="crm-card p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-1">
                <h2 className="text-lg font-bold" style={{ color: 'var(--text-1)' }}>{task.title}</h2>
                {task.project?.name && (
                  <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>Project: {task.project.name}</p>
                )}
              </div>
              <StatusBadge status={task.status || 'todo'} />
            </div>
            {task.description && (
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>{task.description}</p>
            )}
          </div>

          {/* Status change */}
          <div className="crm-card p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>Update Progress</p>
              {isDeveloper && (
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {STATUSES.map(s => (
                <button key={s.val} type="button"
                  onClick={() => updateMut.mutate(s.val)}
                  disabled={updateMut.isPending}
                  className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-all disabled:opacity-60 ${(task.status || 'todo') === s.val ? s.active : s.idle}`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar info */}
        <div className="space-y-5">
          <div className="crm-card p-5 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>Details</p>

            <div className="flex items-center gap-3">
              <Flag className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <div>
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>Priority</p>
                <span className={`text-xs font-semibold capitalize px-2 py-0.5 rounded-full ${priorityColor[task.priority] || ''}`}>
                  {task.priority || 'medium'}
                </span>
              </div>
            </div>

            {task.dueDate && (
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <div>
                  <p className="text-xs" style={{ color: 'var(--text-3)' }}>Due Date</p>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{format(new Date(task.dueDate), 'dd MMM yyyy')}</p>
                </div>
              </div>
            )}

            {task.assignee && (
              <div className="flex items-center gap-3">
                <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <div className="flex items-center gap-2">
                  <Avatar name={task.assignee.name || ''} size="sm" />
                  <div>
                    <p className="text-xs" style={{ color: 'var(--text-3)' }}>Assignee</p>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{task.assignee.name}</p>
                  </div>
                </div>
              </div>
            )}

            {task.createdAt && (
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <div>
                  <p className="text-xs" style={{ color: 'var(--text-3)' }}>Created</p>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{format(new Date(task.createdAt), 'dd MMM yyyy')}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold" style={{ color: 'var(--text-1)' }}>Delete Task</h3>
                <p className="text-sm" style={{ color: 'var(--text-3)' }}>This action cannot be undone</p>
              </div>
            </div>
            <p className="text-sm mb-6" style={{ color: 'var(--text-2)' }}>
              Are you sure you want to delete this task? All associated data will be permanently removed.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleteMut.isPending}
                className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm border-2 border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-60"
                style={{ color: 'var(--text-2)' }}
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMut.mutate()}
                disabled={deleteMut.isPending}
                className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-60"
              >
                {deleteMut.isPending ? 'Deleting...' : 'Delete Task'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskDetail;
