import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationService } from '../../services/notificationService';
import { Bell, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const NotificationPanel = ({ open, onClose }) => {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationService.getAll().then(r => r.data?.data || { notifications: [], unreadCount: 0 }),
    enabled: open,
    refetchInterval: open ? 30000 : false,
  });

  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;

  const markAllMut = useMutation({
    mutationFn: () => notificationService.markAllRead(),
    onSuccess: () => qc.invalidateQueries(['notifications']),
  });

  const markReadMut = useMutation({
    mutationFn: (id) => notificationService.markRead(id),
    onSuccess: () => qc.invalidateQueries(['notifications']),
  });

  const handleClick = (n) => {
    if (!n.read) markReadMut.mutate(n._id);
    if (n.link) { navigate(n.link); onClose?.(); }
  };

  if (!open) return null;

  return (
    <div
      className="absolute right-0 top-full mt-2 w-80 rounded-2xl z-50 overflow-hidden"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}
    >
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4" style={{ color: 'var(--brand)' }} />
          <span className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>Notifications</span>
          {unreadCount > 0 && (
            <span className="text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: 'var(--accent)' }}>
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button onClick={() => markAllMut.mutate()} className="text-xs flex items-center gap-1 transition-colors" style={{ color: 'var(--brand)' }}>
            <Check className="w-3 h-3" /> Mark all read
          </button>
        )}
      </div>

      <div className="max-h-80 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="py-8 text-center text-sm" style={{ color: 'var(--text-4)' }}>No notifications</div>
        ) : notifications.map((n) => (
          <div key={n._id}
            onClick={() => handleClick(n)}
            className="px-4 py-3 transition-colors cursor-pointer"
            style={{ borderBottom: '1px solid var(--border)', background: !n.read ? 'var(--brand-light)' : 'transparent' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-surface2)'}
            onMouseLeave={e => e.currentTarget.style.background = !n.read ? 'var(--brand-light)' : 'transparent'}
          >
            <p className="text-sm" style={{ color: 'var(--text-1)' }}>{n.message}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-4)' }}>
              {n.createdAt ? formatDistanceToNow(new Date(n.createdAt), { addSuffix: true }) : 'just now'}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotificationPanel;
