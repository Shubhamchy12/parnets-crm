import { useState, useRef, useEffect } from 'react';
import { Bell, LogOut, Search, Sun, Moon } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { toggleTheme } from '../../store/slices/uiSlice';
import { useAuth } from '../../contexts/AuthContext';
import NotificationPanel from '../common/NotificationPanel';
import Avatar from '../common/Avatar';

const Header = () => {
  const { user, logout } = useAuth();
  const dispatch = useDispatch();
  const { unreadCount } = useSelector(s => s.notifications);
  const theme = useSelector(s => s.ui.theme);
  const isDark = theme === 'dark';
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef();

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header
      className="flex-shrink-0 flex items-center justify-between px-5"
      style={{
        height: '60px',
        background: 'var(--header-bg)',
        borderBottom: '1px solid var(--header-border)',
        transition: 'background 0.2s, border-color 0.2s',
      }}
    >
      {/* ── Left: Search ── */}
      <div className="flex items-center gap-3 flex-1 max-w-sm">
        <div
          className="flex items-center gap-2 flex-1 rounded-xl px-3"
          style={{
            height: '38px',
            background: 'var(--input-bg)',
            border: '1.5px solid var(--input-border)',
            transition: 'border-color 0.15s, box-shadow 0.15s',
          }}
          onFocusCapture={e => {
            e.currentTarget.style.borderColor = 'var(--border-focus)';
            e.currentTarget.style.boxShadow = '0 0 0 3px var(--brand-light)';
          }}
          onBlurCapture={e => {
            e.currentTarget.style.borderColor = 'var(--input-border)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <Search className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-4)' }} />
          <input
            type="text"
            placeholder="Search anything..."
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: 'var(--text-1)', caretColor: 'var(--brand)' }}
          />
        </div>
      </div>

      {/* ── Right: actions ── */}
      <div className="flex items-center gap-1.5">

        {/* Theme toggle */}
        <button
          onClick={() => dispatch(toggleTheme())}
          className="relative flex items-center rounded-xl overflow-hidden transition-all duration-300"
          style={{
            width: 76,
            height: 36,
            background: isDark
              ? 'linear-gradient(135deg, #1c2333, #0e1117)'
              : 'linear-gradient(135deg, #eff6ff, #fff7ed)',
            border: '1.5px solid var(--border)',
            padding: 3,
          }}
          title={isDark ? 'Switch to Light' : 'Switch to Dark'}
        >
          {/* sliding pill */}
          <span
            className="absolute rounded-lg flex items-center justify-center transition-all duration-300"
            style={{
              width: 28, height: 28,
              background: isDark
                ? 'linear-gradient(135deg, #1d4ed8, #2563eb)'
                : 'linear-gradient(135deg, #f97316, #fb923c)',
              left: isDark ? 42 : 3,
              boxShadow: isDark
                ? '0 2px 8px rgba(37,99,235,0.5)'
                : '0 2px 8px rgba(249,115,22,0.5)',
            }}
          >
            {isDark
              ? <Moon className="w-3.5 h-3.5 text-white" />
              : <Sun className="w-3.5 h-3.5 text-white" />
            }
          </span>
          {/* label */}
          <span
            className="text-[10px] font-bold absolute"
            style={{
              left: isDark ? 8 : undefined,
              right: isDark ? undefined : 7,
              color: isDark ? '#60a5fa' : '#f97316',
              letterSpacing: '0.03em',
            }}
          >
            {isDark ? 'DARK' : 'LIGHT'}
          </span>
        </button>

        {/* Divider */}
        <div className="w-px h-6 mx-1" style={{ background: 'var(--border)' }} />

        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setNotifOpen(o => !o)}
            className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
            style={{ color: 'var(--text-3)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-surface2)'; e.currentTarget.style.color = 'var(--text-1)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-3)'; }}
          >
            <Bell className="w-[18px] h-[18px]" />
            {unreadCount > 0 && (
              <span
                className="absolute top-1 right-1 w-4 h-4 text-white text-[9px] font-bold rounded-full flex items-center justify-center"
                style={{ background: 'var(--accent)', fontSize: '9px' }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          <NotificationPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
        </div>

        {/* Divider */}
        <div className="w-px h-6 mx-1" style={{ background: 'var(--border)' }} />

        {/* User */}
        <div className="flex items-center gap-2.5 pl-1">
          <Avatar name={user?.name || ''} size="sm" />
          <div className="hidden sm:block leading-tight">
            <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{user?.name}</p>
            <p
              className="text-[10px] font-semibold capitalize"
              style={{ background: 'linear-gradient(90deg,var(--brand),var(--accent))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
            >
              {user?.role?.replace(/_/g, ' ')}
            </p>
          </div>
          <button
            onClick={logout}
            title="Logout"
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors ml-1"
            style={{ color: 'var(--text-4)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(220,38,38,0.08)'; e.currentTarget.style.color = 'var(--danger)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-4)'; }}
          >
            <LogOut className="w-[17px] h-[17px]" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
