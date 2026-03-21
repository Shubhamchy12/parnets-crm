import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { assignmentService } from '../services/assignmentService';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import { FolderOpen, Calendar, AlertTriangle } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

const MyProjects = () => {
  const navigate = useNavigate();

  const { data: assignments, isLoading } = useQuery({
    queryKey: ['my-assignments'],
    queryFn: () => assignmentService.getAll({ status: 'active' }).then(r => r.data?.data?.assignments || []),
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
    </div>
  );

  return (
    <div>
      <PageHeader
        title="My Projects"
        breadcrumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'My Projects' }]}
      />

      {assignments?.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {assignments.map((a) => {
            const p = a.project;
            if (!p) return null;
            const daysLeft = p.endDate ? differenceInDays(new Date(p.endDate), new Date()) : null;
            const isOverdue = daysLeft !== null && daysLeft < 0;
            const isUrgent = daysLeft !== null && daysLeft >= 0 && daysLeft <= 3;

            return (
              <div key={a._id}
                onClick={() => navigate(`/projects/${p._id}`)}
                className="crm-card p-5 cursor-pointer hover:shadow-md transition-shadow"
                style={{ borderLeft: isOverdue ? '3px solid #ef4444' : isUrgent ? '3px solid #f59e0b' : '3px solid #6366f1' }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{p.name}</p>
                  </div>
                  <StatusBadge status={p.status || 'planning'} />
                </div>

                {p.client?.name && (
                  <p className="text-xs mb-2" style={{ color: 'var(--text-3)' }}>Client: {p.client.name}</p>
                )}

                {p.endDate && (
                  <div className="flex items-center gap-1.5 mb-3">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span className={`text-xs font-medium ${isOverdue ? 'text-red-600' : isUrgent ? 'text-amber-600' : ''}`}
                      style={!isOverdue && !isUrgent ? { color: 'var(--text-3)' } : {}}>
                      {isOverdue ? `${Math.abs(daysLeft)}d overdue` : daysLeft === 0 ? 'Due today' : `${daysLeft}d left`}
                      {' · '}{format(new Date(p.endDate), 'dd MMM yyyy')}
                    </span>
                  </div>
                )}

                {(isOverdue || isUrgent) && (
                  <div className={`flex items-center gap-1 text-xs p-2 rounded-lg ${isOverdue ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
                    <AlertTriangle className="w-3 h-3" />
                    {isOverdue ? 'This project is overdue' : 'Deadline approaching soon'}
                  </div>
                )}

                {a.note && (
                  <p className="text-xs mt-2 p-2 rounded-lg" style={{ background: 'var(--bg-surface2)', color: 'var(--text-3)' }}>
                    Note: {a.note}
                  </p>
                )}

                <p className="text-xs mt-3" style={{ color: 'var(--text-4)' }}>
                  Assigned {a.assignedDate ? format(new Date(a.assignedDate), 'dd MMM yyyy') : ''}
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="crm-card p-12 text-center">
          <FolderOpen className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>No projects assigned to you yet.</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>Your manager will assign projects to you.</p>
        </div>
      )}
    </div>
  );
};

export default MyProjects;
