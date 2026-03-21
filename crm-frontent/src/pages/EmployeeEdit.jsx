import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { employeeService } from '../services/employeeService';
import PageHeader from '../components/common/PageHeader';
import LoadingSkeleton from '../components/common/LoadingSkeleton';

const schema = z.object({
  name: z.string().min(2),
  phone: z.string().optional(),
  department: z.string().min(1),
  designation: z.string().min(1),
  salary: z.coerce.number().optional(),
  address: z.string().optional(),
  status: z.string().optional(),
});

const inputCls = "modal-input";

const EmployeeEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => employeeService.getOne(id).then(r => r.data?.employee || r.data),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm({ resolver: zodResolver(schema) });

  useEffect(() => { if (data) reset(data); }, [data, reset]);

  const mut = useMutation({
    mutationFn: (d) => employeeService.update(id, d),
    onSuccess: () => { qc.invalidateQueries(['employee', id]); toast.success('Updated'); navigate(`/employees/${id}`); },
    onError: (e) => toast.error(e.response?.data?.message || 'Update failed'),
  });

  if (isLoading) return <div className="p-6"><LoadingSkeleton /></div>;

  return (
    <div>
      <PageHeader title="Edit Employee"
        breadcrumbs={[{ label: 'Employees', href: '/employees' }, { label: data?.name || 'Edit' }]} />
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 max-w-3xl">
        <form onSubmit={handleSubmit(d => mut.mutate(d))} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[
              { name: 'name', label: 'Full Name' },
              { name: 'phone', label: 'Phone' },
              { name: 'designation', label: 'Designation' },
              { name: 'salary', label: 'Salary', type: 'number' },
            ].map(f => (
              <div key={f.name}>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">{f.label}</label>
                <input {...register(f.name)} type={f.type || 'text'} className="modal-input" />
                {errors[f.name] && <p className="text-red-500 text-xs mt-1">{errors[f.name].message}</p>}
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Department</label>
              <select {...register('department')} className="modal-input">
                {['Engineering','Sales','HR','Finance','Support','Operations','Marketing'].map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Status</label>
              <select {...register('status')} className="modal-input">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Address</label>
            <textarea {...register('address')} rows={2} className="modal-input" />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={mut.isPending}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50">
              {mut.isPending ? 'Saving...' : 'Save Changes'}
            </button>
            <button type="button" onClick={() => navigate(`/employees/${id}`)}
              className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmployeeEdit;
