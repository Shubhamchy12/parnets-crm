import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import { attendanceService } from '../services/attendanceService';
import { employeeService } from '../services/employeeService';
import PageHeader from '../components/common/PageHeader';
import Avatar from '../components/common/Avatar';
import { format } from 'date-fns';
import {
  Clock, CheckCircle, XCircle, Search, Download,
  LogIn, LogOut, MapPin, ShieldCheck, Eye, X,
} from 'lucide-react';

// Pill badge
const Badge = ({ children, color = 'slate' }) => {
  const map = {
    green:  'bg-green-100 text-green-700',
    red:    'bg-red-100 text-red-600',
    indigo: 'bg-indigo-100 text-indigo-700',
    amber:  'bg-amber-100 text-amber-700',
    slate:  'bg-slate-100 text-slate-600',
  };
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${map[color]}`}>
      {children}
    </span>
  );
};

// Swipe timeline used inside popover
const SwipeTimeline = ({ entries }) => {
  if (!entries?.length) return <p className="text-xs text-slate-400 py-2 pl-1">No swipe entries recorded.</p>;
  return (
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
  );
};

// Popover detail panel
const DetailPopover = ({ record, onClose }) => {
  const ref = useRef(null);
  const emp     = record.employee || {};
  const entries = record.entries  || [];
  const hours   = record.totalHours ? parseFloat(record.totalHours).toFixed(2) : null;
  const firstIn = entries.find(e => e.type === 'in');
  const lastOut = [...entries].reverse().find(e => e.type === 'out');

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
      <div ref={ref} className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <Avatar name={emp.name || ''} size="sm" />
            <div>
              <p className="text-sm font-semibold text-slate-800">{emp.name || '—'}</p>
              <p className="text-xs text-slate-400">{emp.department || ''}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Summary row */}
        <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
          <div className="px-4 py-3 text-center">
            <p className="text-xs text-slate-400 mb-0.5">First In</p>
            <p className="text-sm font-semibold text-green-700 tabular-nums">
              {firstIn ? format(new Date(firstIn.time), 'hh:mm a') : '—'}
            </p>
          </div>
          <div className="px-4 py-3 text-center">
            <p className="text-xs text-slate-400 mb-0.5">Last Out</p>
            <p className="text-sm font-semibold text-red-600 tabular-nums">
              {lastOut ? format(new Date(lastOut.time), 'hh:mm a') : '—'}
            </p>
          </div>
          <div className="px-4 py-3 text-center">
            <p className="text-xs text-slate-400 mb-0.5">Hours</p>
            <p className="text-sm font-semibold text-indigo-700">{hours ? `${hours}h` : '—'}</p>
          </div>
        </div>

        {/* Status */}
        <div className="px-5 py-2.5 border-b border-slate-100 flex items-center gap-2">
          <span className="text-xs text-slate-400">Status:</span>
          <Badge color={
            record.status === 'present' ? 'green' :
            record.status === 'late'    ? 'amber' :
            record.status === 'absent'  ? 'red'   : 'slate'
          }>
            {record.status ? record.status.charAt(0).toUpperCase() + record.status.slice(1) : 'Absent'}
          </Badge>
        </div>

        {/* Timeline */}
        <div className="px-6 py-5 max-h-64 overflow-y-auto">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Swipe History</p>
          <SwipeTimeline entries={entries} />
        </div>
      </div>
    </div>
  );
};

// One employee row
const EmployeeRow = ({ record }) => {
  const [showPopover, setShowPopover] = useState(false);
  const emp     = record.employee || {};
  const entries = record.entries  || [];
  const inCount  = entries.filter(e => e.type === 'in').length;
  const outCount = entries.filter(e => e.type === 'out').length;
  const firstIn  = entries.find(e => e.type === 'in');
  const lastOut  = [...entries].reverse().find(e => e.type === 'out');
  const hours    = record.totalHours ? parseFloat(record.totalHours).toFixed(2) : null;

  return (
    <>
      <tr className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
        {/* Employee */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-2.5">
            <Avatar name={emp.name || ''} size="sm" />
            <div>
              <p className="text-sm font-medium text-slate-800">{emp.name || '—'}</p>
              <p className="text-xs text-slate-400">{emp.department || ''}</p>
            </div>
          </div>
        </td>

        {/* First In */}
        <td className="px-4 py-3">
          {firstIn
            ? <span className="text-green-700 font-semibold text-sm tabular-nums">{format(new Date(firstIn.time), 'hh:mm a')}</span>
            : <span className="text-slate-300 text-sm">—</span>}
        </td>

        {/* Last Out */}
        <td className="px-4 py-3">
          {lastOut
            ? <span className="text-red-600 font-semibold text-sm tabular-nums">{format(new Date(lastOut.time), 'hh:mm a')}</span>
            : <span className="text-slate-300 text-sm">—</span>}
        </td>

        {/* Swipe count */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            {inCount > 0  && <Badge color="green"><LogIn  className="w-2.5 h-2.5" /> {inCount}×</Badge>}
            {outCount > 0 && <Badge color="red"><LogOut className="w-2.5 h-2.5" /> {outCount}×</Badge>}
            {entries.length === 0 && <span className="text-slate-300 text-xs">—</span>}
          </div>
        </td>

        {/* Hours */}
        <td className="px-4 py-3">
          {hours
            ? <span className="text-indigo-700 font-semibold text-sm">{hours}h</span>
            : <span className="text-slate-300 text-sm">—</span>}
        </td>

        {/* Status */}
        <td className="px-4 py-3">
          <Badge color={
            record.status === 'present' ? 'green' :
            record.status === 'late'    ? 'amber' :
            record.status === 'absent'  ? 'red'   : 'slate'
          }>
            {record.status ? record.status.charAt(0).toUpperCase() + record.status.slice(1) : 'Absent'}
          </Badge>
        </td>

        {/* View button */}
        <td className="px-4 py-3 text-right">
          {entries.length > 0 && (
            <button
              onClick={() => setShowPopover(true)}
              title="View swipe details"
              className="p-1.5 rounded-lg text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
            >
              <Eye className="w-4 h-4" />
            </button>
          )}
        </td>
      </tr>

      {showPopover && (
        <DetailPopover record={record} onClose={() => setShowPopover(false)} />
      )}
    </>
  );
};

const AttendanceAdmin = () => {
  const [date,        setDate]        = useState(format(new Date(), 'yyyy-MM-dd'));
  const [empSearch,   setEmpSearch]   = useState('');
  const [selectedEmp, setSelectedEmp] = useState('');
  const [statusFilter,setStatusFilter]= useState('');
  const [exportMonth, setExportMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [exporting,   setExporting]   = useState(false);

  const { data: empData } = useQuery({
    queryKey: ['employees-list-att'],
    queryFn: () => employeeService.getAll({ limit: 200 })
      .then(r => r.data?.data?.employees || []),
  });
  const employees = empData || [];

  const { data, isLoading } = useQuery({
    queryKey: ['attendance-admin', date],
    queryFn: () => attendanceService.getAdminView({ date, limit: 200 })
      .then(r => r.data?.data?.attendance || r.data?.data || []),
  });

  const records = Array.isArray(data) ? data : [];

  const filtered = records.filter(r => {
    const name = (r.employee?.name || '').toLowerCase();
    const dept = (r.employee?.department || '').toLowerCase();
    const search = empSearch.toLowerCase().trim();
    const matchSearch = !search || name.includes(search) || dept.includes(search);
    const matchEmp = !selectedEmp || String(r.employee?._id) === selectedEmp;
    const matchStatus = !statusFilter || (r.status || 'absent') === statusFilter;
    return matchSearch && matchEmp && matchStatus;
  });

  const present    = records.filter(r => (r.entries?.length || r.checkIn?.time)).length;
  const checkedOut = records.filter(r => r.entries?.some(e => e.type === 'out') || r.checkOut?.time).length;
  const totalSwipes = records.reduce((s, r) => s + (r.entries?.length || 0), 0);

  const exportToExcel = async () => {
    setExporting(true);
    try {
      const [yearStr, monthStr] = exportMonth.split('-');
      const year  = parseInt(yearStr,  10);
      const month = parseInt(monthStr, 10);

      // Fetch all records for the selected month (high limit to get all)
      const res = await attendanceService.getAdminView({ month, year, limit: 5000 });
      const monthRecords = Array.isArray(res.data?.data?.attendance)
        ? res.data.data.attendance
        : Array.isArray(res.data?.data) ? res.data.data : [];

      // Calculate total days in the month
      const daysInMonth = new Date(year, month, 0).getDate();

      // Group records by employee
      const empMap = {};
      monthRecords.forEach(r => {
        const empId   = r.employee?._id || r.employee || 'unknown';
        const empName = r.employee?.name || '—';
        const empDept = r.employee?.department || '—';
        if (!empMap[empId]) {
          empMap[empId] = { name: empName, department: empDept, records: [] };
        }
        empMap[empId].records.push(r);
      });

      // Build summary rows — one row per employee
      const summaryRows = Object.values(empMap).map(emp => {
        const presentDays = emp.records.filter(r =>
          r.status === 'present' || r.status === 'late' || r.status === 'half_day'
        ).length;
        const absentDays  = daysInMonth - presentDays;
        const lateDays    = emp.records.filter(r => r.status === 'late').length;
        const halfDays    = emp.records.filter(r => r.status === 'half_day').length;
        const leaveDays   = emp.records.filter(r => r.status === 'leave').length;
        const totalHrs    = emp.records.reduce((sum, r) => sum + (parseFloat(r.totalHours) || 0), 0);

        return {
          'Employee':       emp.name,
          'Department':     emp.department,
          'Month':          `${monthStr}/${yearStr}`,
          'Total Days':     daysInMonth,
          'Present Days':   presentDays,
          'Absent Days':    absentDays,
          'Late Days':      lateDays,
          'Half Days':      halfDays,
          'Leave Days':     leaveDays,
          'Total Hours':    totalHrs.toFixed(2),
        };
      });

      // Build daily detail rows — one row per attendance record
      const detailRows = [];
      monthRecords.forEach(r => {
        const entries  = r.entries || [];
        const firstIn  = entries.find(e => e.type === 'in');
        const lastOut  = [...entries].reverse().find(e => e.type === 'out');
        detailRows.push({
          'Employee':    r.employee?.name || '—',
          'Department':  r.employee?.department || '—',
          'Date':        r.date ? format(new Date(r.date), 'dd/MM/yyyy') : '—',
          'Check In':    firstIn  ? format(new Date(firstIn.time),  'hh:mm a') : '—',
          'Check Out':   lastOut  ? format(new Date(lastOut.time),  'hh:mm a') : '—',
          'Total Hours': r.totalHours ? parseFloat(r.totalHours).toFixed(2) : '—',
          'Status':      r.status ? r.status.charAt(0).toUpperCase() + r.status.slice(1) : 'Absent',
          'Swipes':      entries.length,
        });
      });

      const wb = XLSX.utils.book_new();

      // Sheet 1: Monthly Summary
      const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
      wsSummary['!cols'] = [22, 16, 10, 10, 12, 12, 10, 10, 10, 12].map(w => ({ wch: w }));
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Monthly Summary');

      // Sheet 2: Daily Detail
      const wsDetail = XLSX.utils.json_to_sheet(detailRows);
      wsDetail['!cols'] = [22, 16, 12, 10, 10, 12, 10, 8].map(w => ({ wch: w }));
      XLSX.utils.book_append_sheet(wb, wsDetail, 'Daily Detail');

      XLSX.writeFile(wb, `attendance_${exportMonth}.xlsx`);
    } catch (err) {
      console.error('Export failed', err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Attendance Overview"
        breadcrumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'Attendance' }]}
        actions={
          <div className="flex items-center gap-2">
            <input
              type="month"
              value={exportMonth}
              onChange={e => setExportMonth(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
            <button onClick={exportToExcel} disabled={exporting}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-40">
              <Download className="w-4 h-4" /> {exporting ? 'Exporting…' : 'Export Excel'}
            </button>
          </div>
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
        {[
          { icon: <CheckCircle className="w-5 h-5 text-green-600" />, bg: 'bg-green-100', value: present,     label: 'Present' },
          { icon: <LogOut      className="w-5 h-5 text-red-500"   />, bg: 'bg-red-100',   value: checkedOut,  label: 'Checked Out' },
          { icon: <XCircle     className="w-5 h-5 text-slate-400" />, bg: 'bg-slate-100', value: records.length - present, label: 'Absent' },
          { icon: <Clock       className="w-5 h-5 text-indigo-600"/>, bg: 'bg-indigo-100',value: totalSwipes, label: 'Total Swipes' },
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
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-500">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <label className="text-xs font-medium text-slate-500 whitespace-nowrap">Employee</label>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search..."
                value={empSearch}
                onChange={e => { setEmpSearch(e.target.value); setSelectedEmp(''); }}
                className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            <select
              value={selectedEmp}
              onChange={e => { setSelectedEmp(e.target.value); setEmpSearch(''); }}
              className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              <option value="">All Employees</option>
              {employees.map(emp => (
                <option key={emp._id} value={emp._id}>{emp.name}{emp.department ? ` · ${emp.department}` : ''}</option>
              ))}
            </select>
          </div>
          {(selectedEmp || empSearch) && (
            <button onClick={() => { setSelectedEmp(''); setEmpSearch(''); }}
              className="text-xs text-indigo-600 hover:underline">Clear filter</button>
          )}
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300">
            <option value="">All Status</option>
            <option value="present">Present</option>
            <option value="late">Late</option>
            <option value="absent">Absent</option>
            <option value="half_day">Half Day</option>
            <option value="leave">On Leave</option>
          </select>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="text-center py-10 text-slate-400 text-sm">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-sm">No attendance records for this date</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100">
                  {['Employee','First In','Last Out','Swipes','Hours','Status',''].map(h => (
                    <th key={h} className="px-4 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => <EmployeeRow key={r._id} record={r} />)}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceAdmin;
