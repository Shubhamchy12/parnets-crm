import { useParams, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { attendanceService } from '../services/attendanceService';
import PageHeader from '../components/common/PageHeader';

const AttendanceOverride = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { register, handleSubmit } = useForm();

  const mut = useMutation({
    mutationFn: (data) => attendanceService.override(id, data),
    onSuccess: () => { toast.success('Attendance updated'); navigate('/attendance/admin'); },
    onError: (e) => toast.error(e.response?.data?.message || 'Update failed'),
  });

  const inputCls = "modal-input";

  return (
    <div>
      <PageHeader title="Manual Override" breadcrumbs={[{ label: 'Attendance Admin', href: '/attendance/admin' }, { label: 'Override' }]} />
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 max-w-md">
        <form onSubmit={handleSubmit(d => mut.mutate(d))} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Check In Time</label>
            <input {...register('checkIn')} type="time" className="modal-input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Check Out Time</label>
            <input {...register('checkOut')} type="time" className="modal-input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Status</label>
            <select {...register('status')} className="modal-input">
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="late">Late</option>
              <option value="half_day">Half Day</option>
              <option value="on_leave">On Leave</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Reason</label>
            <textarea {...register('reason')} rows={2} className="modal-input" placeholder="Reason for override..." />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={mut.isPending}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50">
              {mut.isPending ? 'Saving...' : 'Save Override'}
            </button>
            <button type="button" onClick={() => navigate('/attendance/admin')}
              className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AttendanceOverride;
