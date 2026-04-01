import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { clientService }     from '../services/clientService';
import { invoiceService }    from '../services/invoiceService';
import { attendanceService } from '../services/attendanceService';
import { leaveService }      from '../services/leaveService';
import { projectService }    from '../services/projectService';
import { ticketService }     from '../services/ticketService';
import PageHeader from '../components/common/PageHeader';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area, LineChart, Line, RadialBarChart, RadialBar,
} from 'recharts';
import { format, subMonths } from 'date-fns';

const TABS = ['Sales', 'Finance', 'Attendance', 'Leave', 'Projects', 'Support'];

const SB = {
  active:'bg-green-100 text-green-700',    inactive:'bg-slate-100 text-slate-600',
  prospect:'bg-blue-100 text-blue-700',    archived:'bg-red-100 text-red-600',
  paid:'bg-green-100 text-green-700',      sent:'bg-sky-100 text-sky-700',
  draft:'bg-slate-100 text-slate-600',     overdue:'bg-red-100 text-red-600',
  partial:'bg-yellow-100 text-yellow-700', present:'bg-green-100 text-green-700',
  absent:'bg-red-100 text-red-600',        late:'bg-yellow-100 text-yellow-700',
  half_day:'bg-orange-100 text-orange-700',approved:'bg-green-100 text-green-700',
  pending:'bg-yellow-100 text-yellow-700', rejected:'bg-red-100 text-red-600',
  in_progress:'bg-blue-100 text-blue-700', completed:'bg-green-100 text-green-700',
  on_hold:'bg-orange-100 text-orange-700', planning:'bg-purple-100 text-purple-700',
  cancelled:'bg-red-100 text-red-600',     open:'bg-sky-100 text-sky-700',
  resolved:'bg-green-100 text-green-700',  closed:'bg-slate-100 text-slate-600',
  low:'bg-slate-100 text-slate-500',       medium:'bg-blue-100 text-blue-600',
  high:'bg-orange-100 text-orange-600',    urgent:'bg-red-100 text-red-600',
};

const Badge = ({ val }) => (
  <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${SB[val] || 'bg-slate-100 text-slate-600'}`}>
    {val?.replace(/_/g, ' ')}
  </span>
);

const fmtDate  = (d) => { try { return d ? format(new Date(d), 'dd MMM yyyy') : '—'; } catch { return '—'; } };
const fmtMoney = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

const CARD_COLORS = [
  { bg: 'bg-indigo-50',  text: 'text-indigo-600',  border: 'border-indigo-100'  },
  { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100' },
  { bg: 'bg-violet-50',  text: 'text-violet-600',  border: 'border-violet-100'  },
  { bg: 'bg-amber-50',   text: 'text-amber-600',   border: 'border-amber-100'   },
  { bg: 'bg-rose-50',    text: 'text-rose-600',    border: 'border-rose-100'    },
  { bg: 'bg-cyan-50',    text: 'text-cyan-600',    border: 'border-cyan-100'    },
];

const PIE_COLORS = ['#6366f1','#22c55e','#f59e0b','#ef4444','#3b82f6','#8b5cf6'];

// ── Summary Cards ──────────────────────────────────────────────────────────────
const SummaryCards = ({ items }) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 mb-5">
    {items.map(({ label, value, idx }) => {
      const c = CARD_COLORS[idx % CARD_COLORS.length];
      return (
        <div key={label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <div className={`w-7 h-7 rounded-lg ${c.bg} ${c.text} flex items-center justify-center text-xs font-semibold mb-2`}>
            {label.charAt(0)}
          </div>
          <p className="text-xs text-slate-400 mb-1 leading-tight">{label}</p>
          <p className={`text-lg font-semibold ${c.text}`}>{value}</p>
        </div>
      );
    })}
  </div>
);

// ── Chart Cards ────────────────────────────────────────────────────────────────
const TT = { borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' };

// Purple gradient area chart — Sales
const SalesAreaCard = ({ title, subtitle, data }) => (
  <div className="rounded-2xl overflow-hidden shadow-sm" style={{ background: 'linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%)' }}>
    <div className="px-5 pt-5 pb-2">
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="text-xs text-indigo-200 mb-3">{subtitle}</p>
    </div>
    <ResponsiveContainer width="100%" height={160}>
      <AreaChart data={data} margin={{ top: 0, right: 12, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#fff" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#fff" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.15)" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.7)' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.7)' }} axisLine={false} tickLine={false} allowDecimals={false} width={22} />
        <Tooltip contentStyle={TT} formatter={(v) => [v, 'Clients']} />
        <Area type="monotone" dataKey="value" stroke="#fff" strokeWidth={2} fill="url(#salesGrad)" dot={{ fill: '#fff', r: 3 }} />
      </AreaChart>
    </ResponsiveContainer>
  </div>
);

// Green bar chart — Finance
const FinanceBarCard = ({ title, subtitle, data }) => (
  <div className="rounded-2xl overflow-hidden shadow-sm" style={{ background: 'linear-gradient(135deg,#059669 0%,#10b981 100%)' }}>
    <div className="px-5 pt-5 pb-2">
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="text-xs text-emerald-200 mb-3">{subtitle}</p>
    </div>
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} margin={{ top: 0, right: 12, left: -20, bottom: 0 }}
        barCategoryGap={data.length <= 3 ? '50%' : data.length <= 6 ? '35%' : '25%'}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.15)" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.7)' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.7)' }} axisLine={false} tickLine={false} allowDecimals={false} width={22} />
        <Tooltip contentStyle={TT} formatter={(v) => [`₹${Number(v).toLocaleString('en-IN')}`, 'Revenue']} />
        <Bar dataKey="value" fill="rgba(255,255,255,0.85)" radius={[4, 4, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ResponsiveContainer>
  </div>
);

// Blue line chart — Attendance
const AttendanceLineCard = ({ title, subtitle, data }) => (
  <div className="rounded-2xl overflow-hidden shadow-sm" style={{ background: 'linear-gradient(135deg,#2563eb 0%,#3b82f6 100%)' }}>
    <div className="px-5 pt-5 pb-2">
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="text-xs text-blue-200 mb-3">{subtitle}</p>
    </div>
    <ResponsiveContainer width="100%" height={160}>
      <LineChart data={data} margin={{ top: 4, right: 12, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.15)" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.7)' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.7)' }} axisLine={false} tickLine={false} allowDecimals={false} width={22} />
        <Tooltip contentStyle={TT} formatter={(v) => [v, 'Records']} />
        <Line type="monotone" dataKey="value" stroke="#fff" strokeWidth={2.5} dot={{ fill: '#fff', r: 4, strokeWidth: 0 }} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  </div>
);

// Violet bar chart — Leave
const LeaveBarCard = ({ title, subtitle, data }) => (
  <div className="rounded-2xl overflow-hidden shadow-sm" style={{ background: 'linear-gradient(135deg,#7c3aed 0%,#a78bfa 100%)' }}>
    <div className="px-5 pt-5 pb-2">
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="text-xs text-violet-200 mb-3">{subtitle}</p>
    </div>
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} margin={{ top: 0, right: 12, left: -20, bottom: 0 }}
        barCategoryGap={data.length <= 3 ? '50%' : '35%'}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.15)" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.7)' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.7)' }} axisLine={false} tickLine={false} allowDecimals={false} width={22} />
        <Tooltip contentStyle={TT} formatter={(v) => [v, 'Applications']} />
        <Bar dataKey="value" fill="rgba(255,255,255,0.85)" radius={[4, 4, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ResponsiveContainer>
  </div>
);

// Amber bar chart — Projects
const ProjectsBarCard = ({ title, subtitle, data }) => (
  <div className="rounded-2xl overflow-hidden shadow-sm" style={{ background: 'linear-gradient(135deg,#d97706 0%,#f59e0b 100%)' }}>
    <div className="px-5 pt-5 pb-2">
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="text-xs text-amber-200 mb-3">{subtitle}</p>
    </div>
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} margin={{ top: 0, right: 12, left: -20, bottom: 0 }}
        barCategoryGap={data.length <= 3 ? '50%' : '35%'}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.15)" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.7)' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.7)' }} axisLine={false} tickLine={false} allowDecimals={false} width={22} />
        <Tooltip contentStyle={TT} formatter={(v) => [v, 'Projects']} />
        <Bar dataKey="value" fill="rgba(255,255,255,0.85)" radius={[4, 4, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ResponsiveContainer>
  </div>
);

// Rose area chart — Support
const SupportAreaCard = ({ title, subtitle, data }) => (
  <div className="rounded-2xl overflow-hidden shadow-sm" style={{ background: 'linear-gradient(135deg,#e11d48 0%,#f43f5e 100%)' }}>
    <div className="px-5 pt-5 pb-2">
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="text-xs text-rose-200 mb-3">{subtitle}</p>
    </div>
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} margin={{ top: 0, right: 12, left: -20, bottom: 0 }}
        barCategoryGap={data.length <= 3 ? '50%' : '35%'}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.15)" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.7)' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.7)' }} axisLine={false} tickLine={false} allowDecimals={false} width={22} />
        <Tooltip contentStyle={TT} formatter={(v) => [v, 'Tickets']} />
        <Bar dataKey="value" fill="rgba(255,255,255,0.85)" radius={[4, 4, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ResponsiveContainer>
  </div>
);

// White pie card — right side for all sections
const PieCard = ({ title, subtitle, data }) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
    <p className="text-sm font-semibold text-slate-700">{title}</p>
    <p className="text-xs text-slate-400 mb-1">{subtitle}</p>
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie data={data} cx="50%" cy="44%" innerRadius={46} outerRadius={70}
          dataKey="value" nameKey="name" paddingAngle={3}>
          {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
        </Pie>
        <Tooltip contentStyle={TT} />
        <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: '11px', paddingTop: '2px' }} />
      </PieChart>
    </ResponsiveContainer>
  </div>
);

// ── Table helpers ──────────────────────────────────────────────────────────────
const TH = ({ cols }) => (
  <thead className="bg-slate-50 border-b border-slate-100">
    <tr>{cols.map(c => <th key={c} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{c}</th>)}</tr>
  </thead>
);

const NoData = ({ msg = 'No records found' }) => (
  <tr><td colSpan={10} className="px-4 py-12 text-center text-sm text-slate-400">{msg}</td></tr>
);

const TableWrap = ({ title, count, children }) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
    <div className="px-5 py-4 border-b border-slate-100">
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      <p className="text-xs text-slate-400 mt-0.5">{count} record{count !== 1 ? 's' : ''}</p>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full text-sm">{children}</table>
    </div>
  </div>
);

const Loader = () => (
  <div className="flex items-center justify-center gap-2 py-16 text-slate-400">
    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
    Loading...
  </div>
);

// ── SALES ──────────────────────────────────────────────────────────────────────
const SalesTab = ({ from, to }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['report-sales'],
    queryFn: () => clientService.getAll({ limit: 500 }).then(r => r.data?.data?.clients || []),
  });
  const list = data || [];

  const monthMap = {};
  list.forEach(c => {
    const key = format(new Date(c.createdAt), 'MMM yy');
    monthMap[key] = (monthMap[key] || 0) + 1;
  });
  const barData = Object.entries(monthMap).map(([label, value]) => ({ label, value }));

  const statusMap = {};
  list.forEach(c => { statusMap[c.status] = (statusMap[c.status] || 0) + 1; });
  const pieData = Object.entries(statusMap).map(([name, value]) => ({ name: name.replace(/_/g,' '), value }));

  const summary = [
    { label: 'Total Clients',   value: list.length,                                                                                         idx: 0 },
    { label: 'Active',          value: list.filter(c => c.status === 'active').length,                                                      idx: 1 },
    { label: 'Prospects',       value: list.filter(c => c.status === 'prospect').length,                                                    idx: 2 },
    { label: 'Inactive',        value: list.filter(c => c.status === 'inactive').length,                                                    idx: 3 },
    { label: 'Conversion Rate', value: list.length ? `${Math.round((list.filter(c=>c.status==='active').length/list.length)*100)}%` : '0%', idx: 4 },
  ];

  if (isLoading) return <Loader />;
  return (
    <>
      <SummaryCards items={summary} />
      {list.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
          <div className="lg:col-span-2">
            <SalesAreaCard title="Client Acquisition" subtitle="Monthly new clients trend" data={barData} />
          </div>
          <PieCard title="By Status" subtitle="Client distribution" data={pieData} />
        </div>
      )}
      <TableWrap title="Sales Records" count={list.length}>
        <TH cols={['Name','Company','Email','Phone','Status','Source','Added On']} />
        <tbody className="divide-y divide-slate-50">
          {!list.length ? <NoData msg="No clients found" /> : list.map((c, i) => (
            <tr key={c._id || i} className="hover:bg-slate-50/60 transition-colors">
              <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">{c.name}</td>
              <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{c.company}</td>
              <td className="px-4 py-3 text-slate-500">{c.email}</td>
              <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{c.phone}</td>
              <td className="px-4 py-3"><Badge val={c.status} /></td>
              <td className="px-4 py-3 text-slate-500 capitalize whitespace-nowrap">{c.source?.replace(/_/g,' ') || '—'}</td>
              <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{fmtDate(c.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
    </>
  );
};

// ── FINANCE ────────────────────────────────────────────────────────────────────
const FinanceTab = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['report-finance'],
    queryFn: () => invoiceService.getAll({ limit: 500 }).then(r => r.data?.data?.invoices || []),
  });
  const list = data || [];

  const monthMap = {};
  list.forEach(inv => {
    const key = format(new Date(inv.createdAt), 'MMM yy');
    monthMap[key] = (monthMap[key] || 0) + (inv.total || 0);
  });
  const barData = Object.entries(monthMap).map(([label, value]) => ({ label, value }));

  const statusMap = {};
  list.forEach(inv => { statusMap[inv.status] = (statusMap[inv.status] || 0) + 1; });
  const pieData = Object.entries(statusMap).map(([name, value]) => ({ name, value }));

  const totalRevenue   = list.filter(i => i.status === 'paid').reduce((s, i) => s + (i.total || 0), 0);
  const totalCollected = list.reduce((s, i) => s + (i.paidAmount || 0), 0);
  const totalPending   = list.reduce((s, i) => s + (i.remainingAmount || 0), 0);

  const summary = [
    { label: 'Total Revenue',  value: fmtMoney(totalRevenue),                                                          idx: 0 },
    { label: 'Collected',      value: fmtMoney(totalCollected),                                                        idx: 1 },
    { label: 'Pending',        value: fmtMoney(totalPending),                                                          idx: 2 },
    { label: 'Paid Invoices',  value: list.filter(i => i.status === 'paid').length,                                    idx: 3 },
    { label: 'Unpaid',         value: list.filter(i => ['sent','draft','partial'].includes(i.status)).length,          idx: 4 },
    { label: 'Overdue',        value: list.filter(i => i.status === 'overdue').length,                                 idx: 5 },
  ];

  if (isLoading) return <Loader />;
  return (
    <>
      <SummaryCards items={summary} />
      {list.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
          <div className="lg:col-span-2">
            <FinanceBarCard title="Monthly Revenue" subtitle="Invoice totals by month" data={barData} />
          </div>
          <PieCard title="By Status" subtitle="Invoice status breakdown" data={pieData} />
        </div>
      )}
      <TableWrap title="Finance Records" count={list.length}>
        <TH cols={['Invoice #','Client','Total','Collected','Remaining','Status','Due Date']} />
        <tbody className="divide-y divide-slate-50">
          {!list.length ? <NoData msg="No invoices found" /> : list.map((inv, i) => (
            <tr key={inv._id || i} className="hover:bg-slate-50/60 transition-colors">
              <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">{inv.invoiceNumber || '—'}</td>
              <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{inv.clientName || inv.client?.name || '—'}</td>
              <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">{fmtMoney(inv.total)}</td>
              <td className="px-4 py-3 text-emerald-600 font-medium whitespace-nowrap">{fmtMoney(inv.paidAmount)}</td>
              <td className="px-4 py-3 text-rose-500 whitespace-nowrap">{fmtMoney(inv.remainingAmount)}</td>
              <td className="px-4 py-3"><Badge val={inv.status} /></td>
              <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{fmtDate(inv.dueDate)}</td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
    </>
  );
};

// ── ATTENDANCE ─────────────────────────────────────────────────────────────────
const AttendanceTab = ({ from, to }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['report-attendance', from, to],
    queryFn: () => attendanceService.getHistory({ limit: 500 }).then(r => r.data?.data?.attendance || []),
  });
  const list = data || [];
  const inRange = list.filter(a => {
    const d = new Date(a.date || a.createdAt);
    return d >= new Date(from) && d <= new Date(to + 'T23:59:59');
  });

  const present = inRange.filter(a => a.status === 'present').length;
  const absent  = inRange.filter(a => a.status === 'absent').length;
  const late    = inRange.filter(a => a.status === 'late').length;
  const half    = inRange.filter(a => a.status === 'half_day').length;

  const barData = [
    { label: 'Present',  value: present },
    { label: 'Absent',   value: absent  },
    { label: 'Late',     value: late    },
    { label: 'Half Day', value: half    },
  ].filter(d => d.value > 0);

  const monthMap = {};
  inRange.forEach(a => {
    const key = format(new Date(a.date || a.createdAt), 'MMM yy');
    monthMap[key] = (monthMap[key] || 0) + 1;
  });
  const trendData = Object.entries(monthMap).map(([label, value]) => ({ label, value }));

  const summary = [
    { label: 'Total Records',   value: inRange.length,                                                                idx: 0 },
    { label: 'Present',         value: present,                                                                       idx: 1 },
    { label: 'Absent',          value: absent,                                                                        idx: 2 },
    { label: 'Late',            value: late,                                                                          idx: 3 },
    { label: 'Half Day',        value: half,                                                                          idx: 4 },
    { label: 'Attendance Rate', value: inRange.length ? `${Math.round((present / inRange.length) * 100)}%` : '0%',   idx: 5 },
  ];

  if (isLoading) return <Loader />;
  return (
    <>
      <SummaryCards items={summary} />
      {inRange.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
          <div className="lg:col-span-2">
            <AttendanceLineCard title="Monthly Attendance" subtitle="Records per month trend" data={trendData} />
          </div>
          <PieCard title="By Status" subtitle="Attendance breakdown" data={barData.map(d => ({ name: d.label, value: d.value }))} />
        </div>
      )}
      <TableWrap title="Attendance Records" count={inRange.length}>
        <TH cols={['Employee','Date','Check In','Check Out','Hours','Status']} />
        <tbody className="divide-y divide-slate-50">
          {!inRange.length ? <NoData msg="No attendance records in this period" /> : inRange.map((a, i) => (
            <tr key={a._id || i} className="hover:bg-slate-50/60 transition-colors">
              <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">{a.employee?.name || '—'}</td>
              <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{fmtDate(a.date)}</td>
              <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{a.checkIn?.time ? format(new Date(a.checkIn.time), 'hh:mm a') : '—'}</td>
              <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{a.checkOut?.time ? format(new Date(a.checkOut.time), 'hh:mm a') : '—'}</td>
              <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{a.totalHours ? `${Number(a.totalHours).toFixed(1)}h` : '—'}</td>
              <td className="px-4 py-3"><Badge val={a.status} /></td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
    </>
  );
};

// ── LEAVE ──────────────────────────────────────────────────────────────────────
const LeaveTab = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['report-leave'],
    queryFn: () => leaveService.getAllLeaves({ limit: 500 }).then(r => r.data?.data?.leaves || []),
  });
  const list = data || [];

  const statusMap = {};
  list.forEach(l => { statusMap[l.status] = (statusMap[l.status] || 0) + 1; });
  const pieData = Object.entries(statusMap).map(([name, value]) => ({ name, value }));

  const typeMap = {};
  list.forEach(l => { typeMap[l.leaveType] = (typeMap[l.leaveType] || 0) + 1; });
  const barData = Object.entries(typeMap).map(([label, value]) => ({ label, value }));

  const summary = [
    { label: 'Total',    value: list.length,                                        idx: 0 },
    { label: 'Approved', value: list.filter(l => l.status === 'approved').length,   idx: 1 },
    { label: 'Pending',  value: list.filter(l => l.status === 'pending').length,    idx: 2 },
    { label: 'Rejected', value: list.filter(l => l.status === 'rejected').length,   idx: 3 },
  ];

  if (isLoading) return <Loader />;
  return (
    <>
      <SummaryCards items={summary} />
      {list.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
          <div className="lg:col-span-2">
            <LeaveBarCard title="By Leave Type" subtitle="Applications per leave type" data={barData} />
          </div>
          <PieCard title="By Status" subtitle="Approval breakdown" data={pieData} />
        </div>
      )}
      <TableWrap title="Leave Records" count={list.length}>
        <TH cols={['Employee','Leave Type','From','To','Days','Reason','Status']} />
        <tbody className="divide-y divide-slate-50">
          {!list.length ? <NoData msg="No leave applications found" /> : list.map((l, i) => (
            <tr key={l._id || i} className="hover:bg-slate-50/60 transition-colors">
              <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">{l.employeeName || l.employee?.name || '—'}</td>
              <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{l.leaveType}</td>
              <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{fmtDate(l.fromDate)}</td>
              <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{fmtDate(l.toDate)}</td>
              <td className="px-4 py-3 text-slate-600">{l.days}</td>
              <td className="px-4 py-3 text-slate-500 max-w-[180px] truncate">{l.reason || '—'}</td>
              <td className="px-4 py-3"><Badge val={l.status} /></td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
    </>
  );
};

// ── PROJECTS ───────────────────────────────────────────────────────────────────
const ProjectsTab = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['report-projects'],
    queryFn: () => projectService.getAll({ limit: 500 }).then(r => r.data?.data?.projects || []),
  });
  const list = data || [];

  const statusMap = {};
  list.forEach(p => { statusMap[p.status] = (statusMap[p.status] || 0) + 1; });
  const barData = Object.entries(statusMap).map(([label, value]) => ({ label: label.replace(/_/g,' '), value }));

  const typeMap = {};
  list.forEach(p => { if (p.projectType) typeMap[p.projectType] = (typeMap[p.projectType] || 0) + 1; });
  const pieData = Object.entries(typeMap).map(([name, value]) => ({ name: name.replace(/_/g,' '), value }));

  const summary = [
    { label: 'Total',       value: list.length,                                              idx: 0 },
    { label: 'In Progress', value: list.filter(p => p.status === 'in_progress').length,      idx: 1 },
    { label: 'Completed',   value: list.filter(p => p.status === 'completed').length,        idx: 2 },
    { label: 'Planning',    value: list.filter(p => p.status === 'planning').length,         idx: 3 },
    { label: 'On Hold',     value: list.filter(p => p.status === 'on_hold').length,          idx: 4 },
    { label: 'Cancelled',   value: list.filter(p => p.status === 'cancelled').length,        idx: 5 },
  ];

  if (isLoading) return <Loader />;
  return (
    <>
      <SummaryCards items={summary} />
      {list.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
          <div className="lg:col-span-2">
            <ProjectsBarCard title="Projects by Status" subtitle="Count per status" data={barData} />
          </div>
          {pieData.length > 0
            ? <PieCard title="By Type" subtitle="Project type distribution" data={pieData} />
            : <PieCard title="By Priority" subtitle="Priority distribution"
                data={['low','medium','high','urgent'].map(p => ({ name: p, value: list.filter(x=>x.priority===p).length })).filter(d=>d.value>0)} />
          }
        </div>
      )}
      <TableWrap title="Project Records" count={list.length}>
        <TH cols={['Project','Client','Status','Priority','Progress','Start','End','Budget']} />
        <tbody className="divide-y divide-slate-50">
          {!list.length ? <NoData msg="No projects found" /> : list.map((p, i) => (
            <tr key={p._id || i} className="hover:bg-slate-50/60 transition-colors">
              <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">{p.name}</td>
              <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{p.client?.name || '—'}</td>
              <td className="px-4 py-3"><Badge val={p.status} /></td>
              <td className="px-4 py-3"><Badge val={p.priority} /></td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2 min-w-[90px]">
                  <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                    <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${p.progress || 0}%` }} />
                  </div>
                  <span className="text-xs text-slate-500 w-7 text-right">{p.progress || 0}%</span>
                </div>
              </td>
              <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{fmtDate(p.startDate)}</td>
              <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{fmtDate(p.endDate)}</td>
              <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{fmtMoney(p.budget?.estimated)}</td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
    </>
  );
};

// ── SUPPORT ────────────────────────────────────────────────────────────────────
const SupportTab = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['report-support'],
    queryFn: () => ticketService.getAll({ limit: 500, all: true }).then(r => r.data?.data?.tickets || []),
  });
  const list = data || [];

  const statusMap = {};
  list.forEach(t => { statusMap[t.status] = (statusMap[t.status] || 0) + 1; });
  const pieData = Object.entries(statusMap).map(([name, value]) => ({ name: name.replace(/_/g,' '), value }));

  const barData = ['low','medium','high','urgent'].map(p => ({
    label: p.charAt(0).toUpperCase() + p.slice(1),
    value: list.filter(t => t.priority === p).length,
  })).filter(d => d.value > 0);

  const summary = [
    { label: 'Total Tickets', value: list.length,                                          idx: 0 },
    { label: 'Open',          value: list.filter(t => t.status === 'open').length,         idx: 1 },
    { label: 'In Progress',   value: list.filter(t => t.status === 'in_progress').length,  idx: 2 },
    { label: 'Resolved',      value: list.filter(t => t.status === 'resolved').length,     idx: 3 },
    { label: 'Closed',        value: list.filter(t => t.status === 'closed').length,       idx: 4 },
  ];

  if (isLoading) return <Loader />;
  return (
    <>
      <SummaryCards items={summary} />
      {list.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
          <div className="lg:col-span-2">
            <SupportAreaCard title="Tickets by Priority" subtitle="Distribution across priority levels" data={barData} />
          </div>
          <PieCard title="By Status" subtitle="Ticket status breakdown" data={pieData} />
        </div>
      )}
      <TableWrap title="Support Tickets" count={list.length}>
        <TH cols={['Ticket #','Subject','Raised By','Priority','Status','Created']} />
        <tbody className="divide-y divide-slate-50">
          {!list.length ? <NoData msg="No support tickets found. Create tickets from the Support module." /> : list.map((t, i) => (
            <tr key={t._id || i} className="hover:bg-slate-50/60 transition-colors">
              <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">{t.ticketNumber || '—'}</td>
              <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate">{t.subject}</td>
              <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{t.raisedByName || '—'}</td>
              <td className="px-4 py-3"><Badge val={t.priority} /></td>
              <td className="px-4 py-3"><Badge val={t.status} /></td>
              <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{fmtDate(t.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
    </>
  );
};

// ── Main ───────────────────────────────────────────────────────────────────────
const Reports = () => {
  const [tab,  setTab]  = useState('Sales');
  const [from, setFrom] = useState(format(subMonths(new Date(), 3), 'yyyy-MM-dd'));
  const [to,   setTo]   = useState(format(new Date(), 'yyyy-MM-dd'));

  const renderTab = () => {
    if (tab === 'Sales')      return <SalesTab      from={from} to={to} />;
    if (tab === 'Finance')    return <FinanceTab />;
    if (tab === 'Attendance') return <AttendanceTab from={from} to={to} />;
    if (tab === 'Leave')      return <LeaveTab />;
    if (tab === 'Projects')   return <ProjectsTab />;
    if (tab === 'Support')    return <SupportTab />;
    return null;
  };

  return (
    <div>
      <PageHeader
        title="Reports"
        breadcrumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'Reports' }]}
      />

      <div className="flex gap-1 mb-5 bg-slate-100 p-1 rounded-xl w-fit flex-wrap">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              tab === t ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'
            }`}>
            {t}
          </button>
        ))}
      </div>

      {['Sales', 'Attendance'].includes(tab) && (
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <span className="text-xs font-medium text-slate-500">From</span>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          <span className="text-xs font-medium text-slate-500">To</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300" />
        </div>
      )}

      {renderTab()}
    </div>
  );
};

export default Reports;
