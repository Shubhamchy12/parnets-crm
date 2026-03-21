import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { authService } from '../services/authService';
import PageHeader from '../components/common/PageHeader';
import Avatar from '../components/common/Avatar';
import { FileText, Lock } from 'lucide-react';

const schema = z.object({
  currentPassword: z.string().min(1, 'Required'),
  newPassword: z.string().min(8, 'Min 8 characters'),
  confirmPassword: z.string(),
}).refine(d => d.newPassword === d.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] });

const inputCls = "modal-input";

const Profile = () => {
  const { user } = useAuth();
  const { register, handleSubmit, reset, formState: { errors } } = useForm({ resolver: zodResolver(schema) });

  const mut = useMutation({
    mutationFn: (data) => authService.changePassword(data),
    onSuccess: () => { toast.success('Password changed'); reset(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  });

  return (
    <div>
      <PageHeader title="My Profile" breadcrumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'Profile' }]} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Profile card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 text-center">
          <Avatar name={user?.name || ''} size="xl" />
          <h2 className="text-lg font-bold text-slate-900 mt-3">{user?.name}</h2>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>{user?.email}</p>
          <p className="text-xs text-indigo-600 font-medium mt-1 capitalize">{user?.role?.replace(/_/g, ' ')}</p>
          <div className="mt-4 flex flex-col gap-2">
            <Link to="/profile/documents"
              className="flex items-center justify-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors">
              <FileText className="w-4 h-4" /> My Documents
            </Link>
          </div>
        </div>

        {/* Change password */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <Lock className="w-4 h-4" /> Change Password
          </h3>
          <form onSubmit={handleSubmit(d => mut.mutate(d))} className="space-y-4 max-w-md">
            {[
              { name: 'currentPassword', label: 'Current Password' },
              { name: 'newPassword', label: 'New Password' },
              { name: 'confirmPassword', label: 'Confirm New Password' },
            ].map(f => (
              <div key={f.name}>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">{f.label}</label>
                <input {...register(f.name)} type="password" className="modal-input" placeholder="••••••••" />
                {errors[f.name] && <p className="text-red-500 text-xs mt-1">{errors[f.name].message}</p>}
              </div>
            ))}
            <button type="submit" disabled={mut.isPending}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50">
              {mut.isPending ? 'Saving...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;
