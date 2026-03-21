import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { attendanceService } from '../services/attendanceService';
import { employeeService } from '../services/employeeService';
import PageHeader from '../components/common/PageHeader';
import DataTable from '../components/common/DataTable';
import StatusBadge from '../components/common/StatusBadge';
import Avatar from '../components/common/Avatar';
import { format } from 'date-fns';
import { Users, Clock, CheckCircle, XCircle, Search } from 'lucide-react';

const AttendanceAdmin = () => {
  const navigate = useNavigate();
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [empSearch, setEmpSearch] = useState('');
  const [selectedEmp, setSelectedEmp] = useState('');

  // Fetch employees for filter dropdown
  const { data: empData } = useQuery({
    queryKey: ['employees-list-att', empSearch],
    queryFn: () =>
      employeeService
        .getAll({ limit: 100, search: empSearch || undefined })
        .then(r => r.data?.data?.employees || r.data?.employees || []),
  });
  const employees = empData || [];

  const { data, isLoading } = useQuery({
    queryKey: ['attendance-admin', date, selectedEmp],
    queryFn: () =>
      attendanceService
        .getAdminView({ date, ...(selectedEmp ? { employee: selectedEmp } : {}), limit: 100 })
        .then(r => r.data?.data?.attendance || r.data?.data || []),
  });

  const records = Array.isArray(data) ? data : [];

  // Summary counts
  const present = records.filter(r => r.checkIn?.time).length;
  const checkedOut = records.filter(r => r.checkOut?.time).length;
  const absent = records.filter(r => !r.checkIn?.time).length;

  const columns = [
    {
      key: 'employee',
      label: 'Employee',
      render: (v, row) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={row.employee?.name || row.employeeName || ''} size="sm" />
          <div>
            <p className="text-sm font-medium text-slate-800">{row.employee?.name || row.employeeName || '—'}</p>
            {row.employee?.department && (
              <p className="text-xs text-slate-400">{row.employee.department}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'checkIn',
      label: 'Check In',
      render: (v, row) =>
        row.checkIn?.time ? (
          <span className="text-green-700 font-medium text-sm">
            {format(new Date(row.checkIn.time), 'hh:mm a')}
          </span>
        ) : (
          <span className="text-slate-400 text-sm">—</span>
        ),
    },
    {
      key: 'checkOut',
      label: 'Check Out',
      render: (v, row) =>
        row.checkOut?.time ? (
          <span className="text-red-600 font-medium text-sm">
            {format(new Date(row.checkOut.time), 'hh:mm a')}
          </span>
        ) : (
          <span className="text-slate-400 text-sm">—</span>
        ),
    },
    {
      key: 'totalHours',
      label: 'Hours',
      render: v => v ? (
        <span className="text-indigo-700 font-semibold text-sm">{v}h</span>
      ) : '—',
    },
    {
      key: 'status',
      label: 'Status',
      render: v => <StatusBadge status={v || 'absent'} />,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Attendance Overview"
        breadcrumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'Attendance' }]}
      />

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="crm-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-800">{present}</p>
            <p className="text-xs text-slate-500">Present</p>
          </div>
        </div>
        <div className="crm-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <Clock className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-800">{checkedOut}</p>
            <p className="text-xs text-slate-500">Checked Out</p>
          </div>
        </div>
        <div className="crm-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
            <XCircle className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-800">{absent}</p>
            <p className="text-xs text-slate-500">Absent / No Record</p>
          </div>
        </div>
      </div>

      <div className="crm-card p-5">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-500">Date</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
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
            {employees.length > 0 && (
              <select
                value={selectedEmp}
                onChange={e => setSelectedEmp(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                <option value="">All Employees</option>
                {employees.map(emp => (
                  <option key={emp._id} value={emp._id}>
                    {emp.name}{emp.department ? ` · ${emp.department}` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {selectedEmp && (
            <button
              onClick={() => { setSelectedEmp(''); setEmpSearch(''); }}
              className="text-xs text-indigo-600 hover:underline"
            >
              Clear filter
            </button>
          )}
        </div>

        <DataTable
          columns={columns}
          data={records}
          loading={isLoading}
          emptyMessage="No attendance records for this date"
        />
      </div>
    </div>
  );
};

export default AttendanceAdmin;
