import { useQuery } from '@tanstack/react-query';
import { Users, FolderOpen, DollarSign, HeadphonesIcon, Activity, TrendingUp, Clock, Calendar, CheckSquare } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { employeeService } from '../services/employeeService';
import { clientService } from '../services/clientService';
import { projectService } from '../services/projectService';
import api from '../services/api';
import { useSelector } from 'react-redux';
import { useAuth } from '../contexts/AuthContext';

const Dashboard = () => {
  const theme = useSelector(s => s.ui.theme);
  const isDark = theme === 'dark';
  const { user } = useAuth();
  const isAdmin = user?.role === 'super_admin' || user?.role === 'admin';
  const isSales = user?.role === 'sales';

  const { data: empStats } = useQuery({ queryKey: ['employee-stats'], queryFn: () => employeeService.getStats().then(r => r.data?.data || {}), enabled: isAdmin });
  const { data: clients }  = useQuery({ queryKey: ['clients-count'],  queryFn: () => clientService.getAll({ limit: 1 }).then(r => r.data?.data?.pagination?.total || 0), enabled: isAdmin || isSales });
  const { data: projects } = useQuery({ queryKey: ['projects-list-dash'], queryFn: () => projectService.getAll({ limit: 100 }).then(r => r.data?.data?.projects || []) });
  const { data: activities } = useQuery({ queryKey: ['my-activities'], queryFn: () => api.get('/activities/my', { params: { limit: 6 } }).then(r => r.data?.data?.activities || []) });
  const { data: myLeaves } = useQuery({ queryKey: ['my-leaves-dash'], queryFn: () => api.get('/leaves', { params: { limit: 5 } }).then(r => r.data?.data?.leaves || []), enabled: !isAdmin });
  const { data: leaveBalance } = useQuery({ queryKey: ['leave-balance-dash'], queryFn: () => api.get('/leaves/balance').then(r => r.data?.data?.balance || {}), enabled: !isAdmin });

  const activeProjects    = (projects || []).filter(p => p.status === 'in_progress').length;
  const completedProjects = (projects || []).filter(p => p.status === 'completed').length;

  const adminStats = [
    { title: 'Total Clients',   value: clients || 0,               icon: Users,          gradient: 'linear-gradient(135deg,#2563eb,#3b82f6)', sub: 'registered clients' },
    { title: 'Active Projects', value: activeProjects,              icon: FolderOpen,     gradient: 'linear-gradient(135deg,#059669,#10b981)', sub: `${completedProjects} completed` },
    { title: 'Total Projects',  value: (projects||[]).length,       icon: TrendingUp,     gradient: 'linear-gradient(135deg,#f97316,#fb923c)', sub: 'all time' },
    { title: 'Team Members',    value: empStats?.totalEmployees||0, icon: Users,          gradient: 'linear-gradient(135deg,#7c3aed,#8b5cf6)', sub: `${empStats?.activeEmployees||0} active` },
    { title: 'Open Tickets',    value: '—',                         icon: HeadphonesIcon, gradient: 'linear-gradient(135deg,#dc2626,#ef4444)', sub: 'support tickets' },
    { title: 'Revenue',         value: '—',                         icon: DollarSign,     gradient: 'linear-gradient(135deg,#0284c7,#0ea5e9)', sub: 'this month' },
  ];

  const employeeStats = [
    { title: 'My Projects',  value: (projects||[]).length, icon: FolderOpen,   gradient: 'linear-gradient(135deg,#059669,#10b981)', sub: `${activeProjects} active` },
    { title: 'Casual Leave', value: leaveBalance?.cl ? `${leaveBalance.cl.total - leaveBalance.cl.used}/${leaveBalance.cl.total}` : '—', icon: Calendar,     gradient: 'linear-gradient(135deg,#2563eb,#3b82f6)', sub: 'remaining' },
    { title: 'Sick Leave',   value: leaveBalance?.sl ? `${leaveBalance.sl.total - leaveBalance.sl.used}/${leaveBalance.sl.total}` : '—', icon: Clock,        gradient: 'linear-gradient(135deg,#7c3aed,#8b5cf6)', sub: 'remaining' },
    { title: 'Earned Leave', value: leaveBalance?.el ? `${leaveBalance.el.total - leaveBalance.el.used}/${leaveBalance.el.total}` : '—', icon: CheckSquare,  gradient: 'linear-gradient(135deg,#f97316,#fb923c)', sub: 'remaining' },
  ];

  const stats = isAdmin ? adminStats : employeeStats;

  const chartData = ['Jan','Feb','Mar','Apr','May','Jun'].map((m, i) => ({
    month: m, projects: (i + 1) * 2, revenue: (i + 1) * 48000,
  }));

  const gridColor  = isDark ? '#252d3d' : '#f0f2f5';
  const tickColor  = isDark ? '#8892a4' : '#9ca3af';
  const tooltipBg  = isDark ? '#1c2333' : '#ffffff';
  const tooltipBdr = isDark ? '#252d3d' : '#e5e7eb';

  const TooltipBox = ({ active, payload, label, fmt }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: tooltipBg, border: `1px solid ${tooltipBdr}`, borderRadius: 10, padding: '8px 14px', fontSize: 12, color: 'var(--text-1)', boxShadow: 'var(--shadow-md)' }}>
        <p style={{ fontWeight: 700, marginBottom: 4, color: 'var(--text-2)' }}>{label}</p>
        {payload.map((p, i) => <p key={i} style={{ color: p.color || p.fill }}>{fmt ? fmt(p.value) : p.value}</p>)}
      </div>
    );
  };

  return (
    <div className="space-y-5">

      {/* Hero */}
      <div className="rounded-2xl p-6 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 45%, #f97316 100%)' }}>
        <div className="relative z-10 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">Welcome back, {user?.name?.split(' ')[0]} 👋</h1>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.75)' }}>
              {isAdmin ? "Here's what's happening with Parnets CRM today." : "Here's your overview for today."}
            </p>
          </div>
          <div className="text-sm px-4 py-2 rounded-xl font-medium"
            style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', color: 'rgba(255,255,255,0.9)' }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
          </div>
        </div>
        <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <div className="absolute right-16 -bottom-12 w-36 h-36 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="stats-card flex items-center gap-4">
              <div className="rounded-2xl p-3 flex-shrink-0" style={{ background: s.gradient }}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider truncate" style={{ color: 'var(--text-4)' }}>{s.title}</p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--text-1)' }}>{s.value}</p>
                <p className="text-xs truncate" style={{ color: 'var(--text-4)' }}>{s.sub}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts — admin only */}
      {isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="crm-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>Revenue Trend</h3>
              <span className="text-xs px-2 py-1 rounded-lg font-medium" style={{ background: 'var(--brand-light)', color: 'var(--brand)' }}>2026</span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#2563eb" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} />
                <Tooltip content={<TooltipBox fmt={v => `₹${Number(v).toLocaleString()}`} />} />
                <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2.5} fill="url(#revGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="crm-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>Projects Overview</h3>
              <span className="text-xs px-2 py-1 rounded-lg font-medium" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>Monthly</span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} />
                <Tooltip content={<TooltipBox />} />
                <Bar dataKey="projects" fill="#f97316" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Employee: recent leaves */}
      {!isAdmin && (
        <div className="crm-card p-5">
          <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-1)' }}>My Recent Leaves</h3>
          {(myLeaves || []).length > 0 ? (
            <div className="space-y-2">
              {myLeaves.map((l, i) => (
                <div key={l._id || i} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--bg-surface2)' }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>{l.leaveType}</p>
                    <p className="text-xs" style={{ color: 'var(--text-4)' }}>{l.fromDate} → {l.toDate} ({l.days} day{l.days > 1 ? 's' : ''})</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-lg font-medium ${l.status === 'approved' ? 'bg-green-100 text-green-700' : l.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {l.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-center py-6" style={{ color: 'var(--text-4)' }}>No leave applications yet</p>
          )}
        </div>
      )}

      {/* Recent Activity */}
      <div className="crm-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--brand-light)' }}>
            <Activity className="w-4 h-4" style={{ color: 'var(--brand)' }} />
          </div>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>Recent Activities</h3>
        </div>
        {(activities || []).length > 0 ? (
          <div className="space-y-2">
            {(activities || []).map((a, i) => (
              <div key={a._id || i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--bg-surface2)' }}>
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: 'var(--brand)' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-1)' }}>{a.action}</p>
                  <p className="text-xs" style={{ color: 'var(--text-4)' }}>by {a.user?.name || 'System'}</p>
                </div>
                <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-4)' }}>
                  {new Date(a.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10" style={{ color: 'var(--text-4)' }}>
            <Activity className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No recent activities</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
