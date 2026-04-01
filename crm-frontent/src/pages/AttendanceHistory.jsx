import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { attendanceService } from '../services/attendanceService';
import PageHeader from '../components/common/PageHeader';
import { format } from 'date-fns';
import { LogIn, LogOut, ChevronDown, ChevronUp, MapPin, ShieldCheck, Clock } from 'lucide-react';

const statusColors = {
  present:  'bg-green-100 text-green-700',
  late:     'bg-amber-100 text-amber-700',
  absent:   'bg-red-100 text-red-600',
  half_day: 'bg-orange-100 text-orange-700',
  leave:    'bg-blue-100 text-blue-700',
};

const DayRow = ({ record }) => {
  const [open, setOpen] = useState(false);
  const entries  = record.entries || [];
  const inCount  = entries.filter(e => e.type === 'in').length;
  const outCount = entries.filter(e => e.type === 'out').length;
  const hasEntries = entries.length > 0;

  return (
    <>
      <tr
        className={`border-b border-slate-50 transition-colors ${hasEntries ? 'cursor-pointer hover:bg-slate-50/60' : ''}`}
        onClick={() => hasEntries && setOpen(o => !o)}
      >
        <td className="px-4 py-3 text-sm font-medium text-slate-700 whitespace-nowrap">
          {record.date ? format(new Date(record.date), 'EEE, dd MMM yyyy') : '—'}
        </td>
        <td className="px-4 py-3 text-sm text-green-700 font-semibold tabular-nums">
          {record.checkIn?.time ? format(new Date(record.checkIn.time), 'hh:mm a') : '—'}
        </td>
        <td className="px-4 py-3 text-sm text-red-600 font-semibold tabular-nums">
          {record.checkOut?.time ? format(new Date(record.checkOut.time), 'hh:mm a') : '—'}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1.5">
            {inCount > 0  && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                <LogIn className="w-2.5 h-2.5" /> {inCount}×
              </span>
            )}
            {outCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-600">
                <LogOut className="w-2.5 h-2.5" /> {outCount}×
              </span>
            )}
            {entries.length === 0 && <span className="text-slate-300 text-xs">—</span>}
          </div>
        </td>
        <td className="px-4 py-3 text-sm text-indigo-700 font-semibold tabular-nums">
          {record.totalHours ? `${record.totalHours}h` : '—'}
        </td>
        <td className="px-4 py-3">
          <span className={`inline-flex items-center text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${statusColors[record.status] || 'bg-slate-100 text-slate-500'}`}>
            {record.status ? record.status.charAt(0).toUpperCase() + record.status.slice(1).replace('_', ' ') : 'Present'}
          </span>
        </td>
        <td className="px-4 py-3 text-right">
          {hasEntries && (open
            ? <ChevronUp   className="w-4 h-4 text-slate-400 ml-auto" />
            : <ChevronDown className="w-4 h-4 text-slate-400 ml-auto" />)}
        </td>
      </tr>

      {open && (
        <tr className="bg-slate-50/80">
          <td colSpan={7} className="px-6 py-3">
            <div className="relative pl-2 space-y-0">
              <div className="absolute left-[18px] top-2 bottom-2 w-px bg-slate-100" />
              {entries.map((entry, i) => (
                <div key={entry._id || i} className="flex items-start gap-3 py-1.5 relative">
                  <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center z-10 ${
                    entry.type === 'in' ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    {entry.type === 'in'
                      ? <LogIn  className="w-3.5 h-3.5 text-green-600" />
                      : <LogOut className="w-3.5 h-3.5 text-red-500" />}
                  </div>
                  <div className="flex-1 min-w-0 pt-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-semibold ${entry.type === 'in' ? 'text-green-700' : 'text-red-600'}`}>
                        {entry.type === 'in' ? 'Check In' : 'Check Out'}
                      </span>
                      <span className="text-xs text-slate-500 tabular-nums">
                        {format(new Date(entry.time), 'hh:mm:ss a')}
                      </span>
                      {entry.faceVerified && (
                        <span className="flex items-center gap-0.5 text-[10px] font-semibold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full border border-green-200">
                          <ShieldCheck className="w-2.5 h-2.5" /> Verified
                        </span>
                      )}
                      {entry.location?.latitude && (
                        <span className="flex items-center gap-0.5 text-[10px] text-slate-400">
                          <MapPin className="w-2.5 h-2.5" />
                          {entry.location.latitude.toFixed(3)}, {entry.location.longitude.toFixed(3)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

const AttendanceHistory = () => {
  const now = new Date();
  const [monthYear, setMonthYear] = useState(format(now, 'yyyy-MM'));
  const [year, month] = monthYear.split('-').map(Number);

  const { data, isLoading } = useQuery({
    queryKey: ['attendance-history', month, year],
    queryFn: () => attendanceService.getHistory({ month, year }).then(r => r.data?.data?.attendance || []),
  });

  const records = data || [];
  const totalDays   = records.length;
  const totalHours  = records.reduce((s, r) => s + (r.totalHours || 0), 0).toFixed(1);
  const totalSwipes = records.reduce((s, r) => s + (r.entries?.length || 0), 0);

  return (
    <div>
      <PageHeader title="Attendance History" breadcrumbs={[{ label: 'Attendance', href: '/attendance' }, { label: 'History' }]} />

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {[
          { label: 'Days Present', value: totalDays,   icon: <ShieldCheck className="w-5 h-5 text-green-600" />, bg: 'bg-green-100' },
          { label: 'Total Hours',  value: `${totalHours}h`, icon: <Clock className="w-5 h-5 text-indigo-600" />, bg: 'bg-indigo-100' },
          { label: 'Total Swipes', value: totalSwipes, icon: <LogIn className="w-5 h-5 text-slate-600" />,  bg: 'bg-slate-100' },
        ].map(s => (
          <div key={s.label} className="crm-card p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${s.bg}`}>{s.icon}</div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="crm-card p-5">
        <div className="flex items-center gap-3 mb-5">
          <input type="month" value={monthYear} onChange={e => setMonthYear(e.target.value)}
            className="px-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          <span className="text-xs text-slate-400">Click a row to expand swipe details</span>
        </div>

        {isLoading ? (
          <div className="text-center py-10 text-slate-400 text-sm">Loading…</div>
        ) : records.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-sm">No records for this month</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100">
                  {['Date','First In','Last Out','Swipes','Hours','Status',''].map(h => (
                    <th key={h} className="px-4 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map(r => <DayRow key={r._id} record={r} />)}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceHistory;
