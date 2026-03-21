import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ticketService } from '../services/ticketService';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import Avatar from '../components/common/Avatar';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import toast from 'react-hot-toast';
import { Send, Lock } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';

const TicketDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [reply, setReply] = useState('');
  const [internal, setInternal] = useState(false);

  const { data: ticket, isLoading } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => ticketService.getOne(id).then(r => r.data?.ticket || r.data),
  });

  const replyMut = useMutation({
    mutationFn: () => ticketService.addReply(id, { message: reply, isInternal: internal }),
    onSuccess: () => { qc.invalidateQueries(['ticket', id]); setReply(''); toast.success('Reply sent'); },
    onError: () => toast.error('Failed to send reply'),
  });

  const updateMut = useMutation({
    mutationFn: (status) => ticketService.update(id, { status }),
    onSuccess: () => { qc.invalidateQueries(['ticket', id]); toast.success('Status updated'); },
  });

  if (isLoading) return <div className="p-6"><LoadingSkeleton /></div>;
  if (!ticket) return <div className="p-6 text-slate-500">Ticket not found.</div>;

  const replies = ticket.replies || [];

  return (
    <div>
      <PageHeader title={`Ticket #${ticket.ticketNumber || id.slice(-6)}`}
        breadcrumbs={[{ label: 'Tickets', href: '/tickets' }, { label: ticket.subject }]}
        actions={
          <div className="flex items-center gap-2">
            {['open','in_progress','resolved','closed'].map(s => (
              <button key={s} onClick={() => updateMut.mutate(s)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors capitalize ${ticket.status === s ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                {s.replace('_', ' ')}
              </button>
            ))}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-4">
          {/* Original ticket */}
          <div className="crm-card p-5">
            <div className="flex items-start gap-3 mb-3">
              <Avatar name={ticket.createdBy?.name || ''} size="md" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-slate-800 text-sm">{ticket.createdBy?.name}</p>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>{ticket.createdAt ? format(new Date(ticket.createdAt), 'dd MMM yyyy, hh:mm a') : ''}</span>
                </div>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>{ticket.createdBy?.email}</p>
              </div>
            </div>
            <h3 className="font-semibold text-slate-900 mb-2">{ticket.subject}</h3>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{ticket.description}</p>
          </div>

          {/* Replies */}
          {replies.map((r, i) => (
            <div key={i} className={`rounded-2xl border p-5 ${r.isInternal ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-slate-100 shadow-sm'}`}>
              <div className="flex items-start gap-3">
                <Avatar name={r.author?.name || ''} size="sm" />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-800 text-sm">{r.author?.name}</p>
                      {r.isInternal && <span className="flex items-center gap-1 text-xs text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full"><Lock className="w-3 h-3" /> Internal</span>}
                    </div>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>{r.createdAt ? format(new Date(r.createdAt), 'dd MMM, hh:mm a') : ''}</span>
                  </div>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{r.message}</p>
                </div>
              </div>
            </div>
          ))}

          {/* Reply box */}
          <div className="crm-card p-5">
            <textarea value={reply} onChange={e => setReply(e.target.value)} rows={4}
              className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 mb-3"
              placeholder="Write your reply..." />
            <div className="flex items-center justify-between">
              {['admin','super_admin','support_executive'].includes(user?.role) && (
                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                  <input type="checkbox" checked={internal} onChange={e => setInternal(e.target.checked)} className="rounded" />
                  Internal note
                </label>
              )}
              <button onClick={() => replyMut.mutate()} disabled={!reply.trim() || replyMut.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 ml-auto">
                <Send className="w-4 h-4" /> {replyMut.isPending ? 'Sending...' : 'Send Reply'}
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 h-fit">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Ticket Info</h3>
          <div className="space-y-3 text-sm">
            {[
              { label: 'Status', value: <StatusBadge status={ticket.status || 'open'} /> },
              { label: 'Priority', value: <span className="capitalize font-medium">{ticket.priority}</span> },
              { label: 'Category', value: ticket.category || '—' },
              { label: 'Created', value: ticket.createdAt ? format(new Date(ticket.createdAt), 'dd MMM yyyy') : '—' },
              { label: 'Assigned To', value: ticket.assignedTo?.name || 'Unassigned' },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-slate-500">{label}</span>
                <span className="text-slate-800">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketDetail;
