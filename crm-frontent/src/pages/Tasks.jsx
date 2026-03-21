import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { taskService } from '../services/taskService';
import PageHeader from '../components/common/PageHeader';
import KanbanBoard from '../components/common/KanbanBoard';
import DataTable from '../components/common/DataTable';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import Avatar from '../components/common/Avatar';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Plus, LayoutGrid, List, ClipboardList } from 'lucide-react';
import { format } from 'date-fns';

const STATUSES = [
  { id: 'todo', title: 'To Do', color: 'bg-slate-400' },
  { id: 'in_progress', title: 'In Progress', color: 'bg-blue-400' },
  { id: 'review', title: 'Review', color: 'bg-yellow-400' },
  { id: 'done', title: 'Done', color: 'bg-green-500' },
];

const schema = z.object({
  title: z.string().min(2, 'Title required'),
  description: z.string().optional(),
  priority: z.string().default('medium'),
  dueDate: z.string().optional(),
  project: z.string().optional(),
});

const Tasks = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [view, setView] = useState('board');
  const [modal, setModal] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm({ resolver: zodResolver(schema) });

  const { data, isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => taskService.getAll().then(r => r.data?.data?.tasks || []),
  });

  const createMut = useMutation({
    mutationFn: (d) => taskService.create(d),
    onSuccess: () => { qc.invalidateQueries(['tasks']); toast.success('Task created'); setModal(false); reset(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, status }) => taskService.update(id, { status }),
    onSuccess: () => qc.invalidateQueries(['tasks']),
  });

  const tasks = data || [];
  const kanbanCols = STATUSES.map(s => ({ ...s, items: tasks.filter(t => (t.status || 'todo') === s.id) }));

  const priorityColor = { high: 'text-red-600', medium: 'text-yellow-600', low: 'text-green-600' };

  const columns = [
    { key: 'title', label: 'Task', render: (v, row) => (
      <div>
        <p className="font-medium text-sm" style={{ color:"var(--text-1)" }}>{v}</p>
        {row.project?.name && <p className="text-xs" style={{ color: "var(--text-muted)" }}>{row.project.name}</p>}
      </div>
    )},
    { key: 'priority', label: 'Priority', render: v => <span className={`text-xs font-semibold capitalize ${priorityColor[v] || ''}`}>{v}</span> },
    { key: 'dueDate', label: 'Due', render: v => v ? format(new Date(v), 'dd MMM') : '—' },
    { key: 'assignee', label: 'Assignee', render: (v, row) => row.assignee ? <Avatar name={row.assignee.name || ''} size="sm" /> : '—' },
    { key: 'status', label: 'Status', render: v => <StatusBadge status={v || 'todo'} /> },
  ];

  return (
    <div>
      <PageHeader title="Tasks"
        breadcrumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'Tasks' }]}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex rounded-xl overflow-hidden" style={{ border: '1.5px solid var(--border)' }}>
              {[{ v: 'board', Icon: LayoutGrid }, { v: 'list', Icon: List }].map(({ v, Icon }) => (
                <button key={v} onClick={() => setView(v)}
                  className="px-3 py-2 transition-colors"
                  style={{
                    background: view === v ? 'var(--brand)' : 'transparent',
                    color: view === v ? '#fff' : 'var(--text-3)',
                  }}>
                  <Icon className="w-4 h-4" />
                </button>
              ))}
            </div>
            <button onClick={() => setModal(true)} className="modal-btn-primary flex items-center gap-2 px-4 py-2">
              <Plus className="w-4 h-4" /> New Task
            </button>
          </div>
        }
      />

      {view === 'board' ? (
        <KanbanBoard columns={kanbanCols}
          onDragEnd={({ active, over }) => {
            if (!over) return;
            const col = kanbanCols.find(c => c.items.some(i => (i._id || i.id) === over.id));
            if (col) updateMut.mutate({ id: active.id, status: col.id });
          }}
          renderCard={(item) => (
            <div
              onClick={() => navigate(`/tasks/${item._id}`)}
              className="rounded-xl p-3 cursor-pointer transition-all"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-xs)',
              }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-xs)'; e.currentTarget.style.transform = 'none'; }}
            >
              <p className="text-sm font-semibold mb-2" style={{ color: 'var(--text-1)' }}>{item.title}</p>
              <div className="flex items-center justify-between">
                <span
                  className="text-xs font-semibold capitalize px-2 py-0.5 rounded-full"
                  style={{
                    background: item.priority === 'high' ? 'rgba(239,68,68,0.1)' : item.priority === 'medium' ? 'rgba(245,158,11,0.1)' : 'rgba(34,197,94,0.1)',
                    color: item.priority === 'high' ? 'var(--danger)' : item.priority === 'medium' ? 'var(--warning)' : 'var(--success)',
                  }}
                >
                  {item.priority || 'medium'}
                </span>
                {item.dueDate && (
                  <span className="text-xs" style={{ color: 'var(--text-4)' }}>{format(new Date(item.dueDate), 'dd MMM')}</span>
                )}
              </div>
            </div>
          )}
        />
      ) : (
        <div className="crm-card p-5">
          <DataTable columns={columns} data={tasks} loading={isLoading} onRowClick={row => navigate(`/tasks/${row._id}`)} />
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="New Task" subtitle="Add a task to your board" icon={ClipboardList} size="md">
        <form onSubmit={handleSubmit(d => createMut.mutate(d))} className="space-y-4">
          <div>
            <label className="modal-form-label">Title *</label>
            <input {...register('title')} className={`modal-input ${errors.title ? 'modal-input-error' : ''}`} placeholder="What needs to be done?" />
            {errors.title && <p className="modal-error-text">{errors.title.message}</p>}
          </div>
          <div>
            <label className="modal-form-label">Description</label>
            <textarea {...register('description')} rows={3} className="modal-input" style={{ resize: 'none' }} placeholder="Optional details..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="modal-form-label">Priority</label>
              <select {...register('priority')} className="modal-input">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className="modal-form-label">Due Date</label>
              <input {...register('dueDate')} type="date" className="modal-input" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={createMut.isPending} className="modal-btn-primary">
              {createMut.isPending ? 'Creating...' : 'Create Task'}
            </button>
            <button type="button" onClick={() => setModal(false)} className="modal-btn-secondary">Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Tasks;
