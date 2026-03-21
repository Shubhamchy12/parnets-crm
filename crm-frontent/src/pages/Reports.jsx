import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportService } from '../services/reportService';
import PageHeader from '../components/common/PageHeader';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format, subMonths } from 'date-fns';

const TABS = ['Sales', 'Finance', 'Attendance', 'Leave', 'Projects', 'Support'];
const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f97316', '#22c55e', '#14b8a6'];

const Reports = () => {
  const [tab, setTab] = useState('Sales');
  const [from, setFrom] = useState(format(subMonths(new Date(), 3), 'yyyy-MM-dd'));
  const [to, setTo] = useState(format(new Date(), 'yyyy-MM-dd'));

  const serviceMap = {
    Sales: reportService.getSales,
    Finance: reportService.getFinance,
    Attendance: reportService.getAttendance,
    Leave: reportService.getLeave,
    Projects: reportService.getProjects,
    Support: reportService.getSupport,
  };

  const { data, isLoading } = useQuery({
    queryKey: ['report', tab, from, to],
    queryFn: () => serviceMap[tab]({ from, to }).then(r => r.data || {}),
  });

  const chartData = data?.chartData || data?.data || [];
  const summary = data?.summary || {};

  return (
    <div>
      <PageHeader title="Reports" breadcrumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'Reports' }]} />

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-slate-100 p-1 rounded-xl w-fit">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${tab === t ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5">
        <input type="date" value={from} onChange={e => setFrom(e.target.value)}
          className="px-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300" />
        <span className="text-slate-400 text-sm">to</span>
        <input type="date" value={to} onChange={e => setTo(e.target.value)}
          className="px-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300" />
      </div>

      {isLoading ? (
        <div className="text-center py-10 text-slate-400">Loading report...</div>
      ) : (
        <div className="space-y-5">
          {/* Summary cards */}
          {Object.keys(summary).length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Object.entries(summary).map(([key, val]) => (
                <div key={key} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                  <p className="text-xs text-slate-500 capitalize mb-1">{key.replace(/_/g, ' ')}</p>
                  <p className="page-title">{typeof val === 'number' ? val.toLocaleString() : val}</p>
                </div>
              ))}
            </div>
          )}

          {/* Chart */}
          {chartData.length > 0 && (
            <div className="crm-card p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">{tab} Overview</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {chartData.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 text-center text-slate-400">
              No data available for the selected period.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Reports;
