import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  LayoutDashboard, Users, FolderOpen,
  Settings, UserCheck, Activity, Calendar,
  Target, ClipboardList, FileSignature, BarChart2,
  UserCog, Building2, PanelLeftClose, PanelLeftOpen,
  ChevronDown, Briefcase, GitBranch, AlarmClock, UserSquare2,
  Receipt, ShoppingCart, CreditCard, Layers, Puzzle, ClipboardCheck
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { toggleSidebar } from '../../store/slices/uiSlice';

const ADMIN = ['admin', 'super_admin'];
const SALES = ['admin', 'super_admin', 'sales'];
const ALL_STAFF = ['admin', 'super_admin', 'sales', 'employee'];

const menuGroups = [
  {
    group: null,
    items: [
      { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', roles: ADMIN },
    ],
  },

  // ── Employee ──────────────────────────────────────────────
  {
    group: 'Employee',
    items: [
      { name: 'Departments',     icon: Layers,        path: '/departments',    roles: ADMIN },
      { name: 'Employee Data',   icon: UserCheck,     path: '/employees',      roles: ADMIN },
   
      { name: 'Attendance',      icon: Calendar,      path: '/attendance',     roles: ALL_STAFF },
      { name: 'Leaves',          icon: AlarmClock,    path: '/leaves',         roles: ALL_STAFF },
      { name: 'Leave Approvals', icon: UserSquare2,   path: '/leaves/team',    roles: ADMIN },
      { name: 'My Projects',     icon: Briefcase,     path: '/my-projects',    roles: ['employee'] },
      { name: 'Tasks',           icon: ClipboardList, path: '/tasks',          roles: ['employee'] },
      { name: 'Time Log',        icon: AlarmClock,    path: '/timelog',        roles: ['employee'] },
    ],
  },

  // ── Sales ─────────────────────────────────────────────────
  {
    group: 'Sales',
    items: [
      { name: 'Leads',       icon: Target,        path: '/leads',       roles: SALES },
       { name: 'Clients',     icon: Users,         path: '/clients',     roles: SALES },
      { name: 'Projects',    icon: FolderOpen,    path: '/projects',    roles: SALES },
       { name: 'Quotations',  icon: ClipboardCheck,path: '/quotations',  roles: SALES },
      { name: 'Invoices',    icon: CreditCard,    path: '/invoices',    roles: SALES },
      { name: 'Services',    icon: Puzzle,        path: '/services',    roles: ADMIN },
      { name: 'Contracts',   icon: FileSignature, path: '/contracts',   roles: SALES },
    ],
  },

  // ── Workflow ──────────────────────────────────────────────
  {
    group: 'Workflow',
    items: [
      { name: 'Assign Project', icon: GitBranch,     path: '/assign-project', roles: ADMIN },
      { name: 'Tasks',          icon: ClipboardList, path: '/tasks',          roles: ['admin', 'super_admin', 'sales'] },
      { name: 'Time Log',       icon: Briefcase,     path: '/timelog',        roles: ['admin', 'super_admin', 'sales'] },
    ],
  },

  // ── Admin ─────────────────────────────────────────────────
  {
    group: 'Admin',
    items: [
      { name: 'Accounting',    icon: Receipt,    path: '/accounting',      roles: ADMIN },
      { name: 'Procurement',   icon: ShoppingCart, path: '/procurement',   roles: ADMIN },
      { name: 'Reports',       icon: BarChart2,  path: '/reports',         roles: ADMIN },
      { name: 'AMC',           icon: Building2,  path: '/amc',             roles: ADMIN },
      { name: 'User Mgmt',     icon: UserCog,    path: '/user-management', roles: ADMIN },
      { name: 'Activity Logs', icon: Activity,   path: '/activity-logs',   roles: ['super_admin'] },
      { name: 'Settings',      icon: Settings,   path: '/settings',        roles: ADMIN },
    ],
  },
];

const Sidebar = () => {
  const { user } = useAuth();
  const dispatch = useDispatch();
  const sidebarOpen = useSelector(s => s.ui.sidebarOpen);
  const [collapsed, setCollapsed] = useState({});

  const toggle = (g) => setCollapsed(p => ({ ...p, [g]: !p[g] }));

  return (
    <aside
      className="h-screen flex flex-col flex-shrink-0 relative"
      style={{
        width: sidebarOpen ? '228px' : '62px',
        background: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--sidebar-border)',
        transition: 'width 0.25s cubic-bezier(.4,0,.2,1)',
      }}
    >
      {/* ── Logo row ── */}
      <div
        className="flex items-center flex-shrink-0 px-3"
        style={{
          height: '60px',
          borderBottom: '1px solid var(--sidebar-border)',
          justifyContent: sidebarOpen ? 'space-between' : 'center',
        }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Logo mark — orange+blue gradient ring */}
          <div
            className="flex-shrink-0 rounded-xl overflow-hidden flex items-center justify-center"
            style={{
              width: 36, height: 36,
              background: 'linear-gradient(135deg, #2563eb 0%, #f97316 100%)',
              padding: 2,
            }}
          >
            <div className="w-full h-full rounded-lg overflow-hidden bg-white">
              <img src="/logo.jpg" alt="Parnets" className="w-full h-full object-contain" />
            </div>
          </div>

          {sidebarOpen && (
            <div className="min-w-0">
              <p className="text-sm font-bold leading-tight truncate" style={{ color: 'var(--text-1)' }}>Parnets</p>
              <p
                className="text-[10px] font-semibold tracking-wide"
                style={{ background: 'linear-gradient(90deg,#2563eb,#f97316)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
              >
                CRM SUITE
              </p>
            </div>
          )}
        </div>

        {sidebarOpen && (
          <button
            onClick={() => dispatch(toggleSidebar())}
            className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: 'var(--text-4)', background: 'var(--bg-surface2)' }}
            title="Collapse sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Expand button when collapsed */}
      {!sidebarOpen && (
        <button
          onClick={() => dispatch(toggleSidebar())}
          className="absolute -right-3 top-[22px] w-6 h-6 rounded-full flex items-center justify-center z-20 shadow-md"
          style={{ background: 'var(--brand)', color: '#fff', border: '2px solid var(--sidebar-bg)' }}
          title="Expand sidebar"
        >
          <PanelLeftOpen className="w-3 h-3" />
        </button>
      )}

      {/* ── Nav ── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 space-y-0.5">
        {menuGroups.map(({ group, items }) => {
          const visible = items.filter(i => i.roles.includes(user?.role));
          if (!visible.length) return null;
          const isCollapsed = collapsed[group];

          return (
            <div key={group || '__main'}>
              {/* Group header */}
              {group && sidebarOpen && (
                <button
                  onClick={() => toggle(group)}
                  className="w-full flex items-center justify-between px-2 py-1 mt-3 mb-0.5 rounded-md transition-colors"
                  style={{ color: 'var(--text-4)' }}
                >
                  <span style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    {group}
                  </span>
                  <ChevronDown
                    className="w-3 h-3 transition-transform"
                    style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
                  />
                </button>
              )}

              {/* Thin divider in collapsed mode */}
              {group && !sidebarOpen && (
                <div className="my-2 mx-2" style={{ height: 1, background: 'var(--sidebar-border)' }} />
              )}

              {/* Nav items */}
              {!isCollapsed && visible.map(item => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.name}
                    to={item.path}
                    title={!sidebarOpen ? item.name : undefined}
                    className="relative group flex items-center rounded-lg text-sm transition-all duration-150"
                    style={({ isActive }) => ({
                      gap: sidebarOpen ? '10px' : 0,
                      padding: sidebarOpen ? '8px 10px' : '9px 0',
                      justifyContent: sidebarOpen ? 'flex-start' : 'center',
                      background: isActive ? 'var(--sidebar-active-bg)' : 'transparent',
                      color: isActive ? 'var(--sidebar-text-active)' : 'var(--sidebar-text)',
                      fontWeight: isActive ? 600 : 500,
                      borderLeft: isActive && sidebarOpen ? '3px solid var(--sidebar-accent-bar)' : '3px solid transparent',
                      marginLeft: sidebarOpen ? 0 : 0,
                    })}
                    onMouseEnter={e => {
                      if (!e.currentTarget.getAttribute('aria-current')) {
                        e.currentTarget.style.background = 'var(--sidebar-hover-bg)';
                        e.currentTarget.style.color = 'var(--text-1)';
                      }
                    }}
                    onMouseLeave={e => {
                      if (!e.currentTarget.getAttribute('aria-current')) {
                        e.currentTarget.style.background = '';
                        e.currentTarget.style.color = '';
                      }
                    }}
                  >
                    <Icon className="w-[17px] h-[17px] flex-shrink-0" />
                    {sidebarOpen && <span className="truncate">{item.name}</span>}

                    {/* Tooltip when collapsed */}
                    {!sidebarOpen && (
                      <span
                        className="pointer-events-none absolute left-[52px] px-2.5 py-1.5 text-xs font-medium rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50"
                        style={{
                          background: 'var(--text-1)',
                          color: 'var(--bg-surface)',
                          border: '1px solid var(--border)',
                        }}
                      >
                        {item.name}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* ── Footer ── */}
      {sidebarOpen && (
        <div
          className="flex-shrink-0 px-4 py-3 text-center"
          style={{ borderTop: '1px solid var(--sidebar-border)', fontSize: '0.65rem', color: 'var(--text-4)' }}
        >
          © 2026 Parnets Networks Pvt. Ltd.
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
