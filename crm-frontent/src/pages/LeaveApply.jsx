import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { differenceInBusinessDays, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import { leaveService } from '../services/leaveService';
import { employeeService } from '../services/employeeService';
import { useAuth } from '../contexts/AuthContext';
import PageHeader from '../components/common/PageHeader';
import FileUpload from '../components/common/FileUpload';
import { AlertTriangle, User } from 'lucide-react';

const schema = z.object({
  leaveType: z.string().min(1, 'Select leave type'),
  fromDate: z.string().min(1, 'From date required'),
  toDate: z.string().min(1, 'To date required'),
  reason: z.string().min(5, 'Reason required (min 5 chars)'),
});

const LeaveApply = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const isAdmin = ['admin', 'super_admin', 'manager'].includes(user?.role);

  const [workingDays, setWorkingDays] = useState(0);
  const [files, setFiles] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [empSearch, setEmpSearch] = useState('');

  const { register, handleSubmit, watch, formState: { errors } } = useForm({ resolver: zodResolver(schema) });
  const fromDate = watch('fromDate');
  const toDate = watch('toDate');
  const leaveType = watch('leaveType');

  // Fetch employees list for admin
  const { data: empData } = useQuery({
    queryKey: ['employees-list', empSearch],
    queryFn: () =>
      employeeService
        .getAll({ limit: 100, search: empSearch || undefined })
        .then(r => r.data?.data?.employees || r.data?.employees || []),
    enabled: isAdmin,
  });
  const employees = empData || [];

  const { data: balance } = useQuery({
    queryKey: ['leave-balance'],
    queryFn: () => leaveService.getBalance().then(r => r.data?.data?.balance || r.data?.balance || {}),
  });

  useEffect(() => {
    if (fromDate && toDate && fromDate <= toDate) {
      const days = differenceInBusinessDays(parseISO(toDate), parseISO(fromDate)) + 1;
      setWorkingDays(Math.max(0, days));
    } else setWorkingDays(0);
  }, [fromDate, toDate]);

  const getBalance = () => {
    if (!leaveType || !balance) return null;
    const key = leaveType === 'Casual Leave' ? 'cl' : leaveType === 'Sick Leave' ? 'sl' : 'el';
    const b = balance[key];
    return b ? b.total - b.used : null;
  };

  const remaining = getBalance();
  const overBalance = remaining !== null && workingDays > remaining;
  const needsMedical = leaveType === 'Sick Leave' && workingDays > 2;

  const selectedEmpObj = employees.find(e => e._id === selectedEmployee);

  const mut = useMutation({
    mutationFn: (data) => {
      const payload = {
        leaveType: data.leaveType,
        fromDate: data.fromDate,
        toDate: data.toDate,
        reason: data.reason,
        days: workingDays,
        ...(isAdmin && selectedEmployee ? { employeeId: selectedEmployee } : {}),
      };
      return leaveService.apply(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries(['my-leaves']);
      qc.invalidateQueries(['team-leaves']);
      toast.success('Leave applied successfully');
      navigate('/leaves');
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to apply'),
  });

  return (
    <div>
      <PageHeader
        title="Apply for Leave"
        breadcrumbs={[{ label: 'Leaves', href: '/leaves' }, { label: 'Apply' }]}
      />

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 max-w-2xl">
        <form onSubmit={handleSubmit(d => mut.mutate(d))} className="space-y-5">

          {/* Employee selector — admin only */}
          {isAdmin && (
            <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
              <label className="block text-sm font-semibold text-indigo-800 mb-2 flex items-center gap-1.5">
                <User className="w-4 h-4" /> Apply on behalf of employee
              </label>
              <input
                type="text"
                placeholder="Search employee by name..."
                value={empSearch}
                onChange={e => { setEmpSearch(e.target.value); setSelectedEmployee(''); }}
                className="modal-input mb-2"
              />
              {employees.length > 0 && (
                <select
                  value={selectedEmployee}
                  onChange={e => setSelectedEmployee(e.target.value)}
                  className="modal-input"
                >
                  <option value="">— Select employee (leave blank to apply for yourself) —</option>
                  {employees.map(emp => (
                    <option key={emp._id} value={emp._id}>
                      {emp.name} {emp.department ? `· ${emp.department}` : ''} {emp.designation ? `(${emp.designation})` : ''}
                    </option>
                  ))}
                </select>
              )}
              {selectedEmpObj && (
                <p className="mt-2 text-xs text-indigo-700 font-medium">
                  Applying leave for: <span className="font-bold">{selectedEmpObj.name}</span>
                  {selectedEmpObj.department && ` — ${selectedEmpObj.department}`}
                </p>
              )}
              {!selectedEmployee && (
                <p className="mt-1.5 text-xs text-indigo-500">No employee selected — leave will be applied for you.</p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Leave Type *</label>
            <select {...register('leaveType')} className="modal-input">
              <option value="">Select type</option>
              {['Casual Leave', 'Sick Leave', 'Earned Leave', 'Maternity Leave', 'Paternity Leave', 'Unpaid Leave'].map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            {errors.leaveType && <p className="text-red-500 text-xs mt-1">{errors.leaveType.message}</p>}
            {remaining !== null && (
              <p className="text-xs text-indigo-600 mt-1">{remaining} {leaveType} remaining</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">From Date *</label>
              <input
                {...register('fromDate')}
                type="date"
                className="modal-input"
                min={new Date().toISOString().split('T')[0]}
              />
              {errors.fromDate && <p className="text-red-500 text-xs mt-1">{errors.fromDate.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">To Date *</label>
              <input
                {...register('toDate')}
                type="date"
                className="modal-input"
                min={fromDate || new Date().toISOString().split('T')[0]}
              />
              {errors.toDate && <p className="text-red-500 text-xs mt-1">{errors.toDate.message}</p>}
            </div>
          </div>

          {workingDays > 0 && (
            <div className={`p-3 rounded-xl text-sm font-medium ${overBalance ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'}`}>
              {workingDays} working day{workingDays > 1 ? 's' : ''} selected
              {overBalance && <span className="ml-2 text-red-600">⚠ Exceeds balance</span>}
            </div>
          )}

          {overBalance && (
            <div className="flex items-start gap-2 p-3 bg-yellow-50 rounded-xl border border-yellow-200">
              <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-700">Requested days exceed remaining balance. This may be rejected.</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Reason *</label>
            <textarea
              {...register('reason')}
              rows={3}
              className="modal-input"
              placeholder="Describe the reason for leave..."
            />
            {errors.reason && <p className="text-red-500 text-xs mt-1">{errors.reason.message}</p>}
          </div>

          {needsMedical && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Medical Certificate (required for SL &gt; 2 days)
              </label>
              <FileUpload onFiles={setFiles} accept=".pdf,.jpg,.jpeg,.png" />
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={mut.isPending}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
            >
              {mut.isPending ? 'Submitting...' : 'Submit Application'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/leaves')}
              className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LeaveApply;
