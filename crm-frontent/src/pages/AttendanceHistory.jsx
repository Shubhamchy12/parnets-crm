import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { attendanceService } from '../services/attendanceService';
import PageHeader from '../components/common/PageHeader';
import DataTable from '../components/common/DataTable';
import StatusBadge from '../components/common/StatusBadge';
import { format } from 'date-fns';

const AttendanceHistory = () => {
  const now = new Date();
  const [monthYear, setMonthYear] = useState(format(now, 'yyyy-MM'));

  const [year, month] = monthYear.split('-').map(Number);

  const { data, isLoading } = useQuery({
    queryKey: ['attendance-history', month, year],
    queryFn: () => attendanceService.getHistory({ month, year }).then(r => r.data?.data?.attendance || []),
  });

  const columns = [
    { key: 'date', label: 'Date', render: v => v ? format(new Date(v), 'dd MMM yyyy') : '—' },
    { key: 'checkIn', label: 'Check In', render: (v, row) => row.checkIn?.time ? format(new Date(row.checkIn.time), 'hh:mm a') : '—' },
    { key: 'checkOut', label: 'Check Out', render: (v, row) => row.checkOut?.time ? format(new Date(row.checkOut.time), 'hh:mm a') : '—' },
    { key: 'totalHours', label: 'Hours', render: v => v ? `${v}h` : '—' },
    { key: 'status', label: 'Status', render: v => <StatusBadge status={v || 'present'} /> },
  ];

  return (
    <div>
      <PageHeader title="Attendance History" breadcrumbs={[{ label: 'Attendance', href: '/attendance' }, { label: 'History' }]} />
      <div className="crm-card p-5">
        <div className="flex items-center gap-3 mb-5">
          <input type="month" value={monthYear} onChange={e => setMonthYear(e.target.value)}
            className="px-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300" />
        </div>
        <DataTable columns={columns} data={data || []} loading={isLoading} />
      </div>
    </div>
  );
};

export default AttendanceHistory;
