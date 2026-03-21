import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { authService } from '../services/authService';
import { useAuth } from '../contexts/AuthContext';
import { Lock } from 'lucide-react';

const schema = z.object({
  currentPassword: z.string().min(1, 'Required'),
  newPassword: z.string().min(8, 'Min 8 characters'),
  confirmPassword: z.string(),
}).refine(d => d.newPassword === d.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] });

const FirstLogin = () => {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (data) => {
    try {
      const res = await authService.changePassword(data);
      if (res.data?.user) setUser(res.data.user);
      toast.success('Password changed successfully');
      navigate('/dashboard');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to change password');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center mb-3">
            <Lock className="w-7 h-7 text-indigo-600" />
          </div>
          <h2 className="page-title">Set your password</h2>
          <p className="text-slate-500 text-sm mt-1 text-center">This is your first login. Please set a new password to continue.</p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {[
            { name: 'currentPassword', label: 'Temporary Password' },
            { name: 'newPassword', label: 'New Password' },
            { name: 'confirmPassword', label: 'Confirm New Password' },
          ].map(f => (
            <div key={f.name}>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">{f.label}</label>
              <input {...register(f.name)} type="password" placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              {errors[f.name] && <p className="text-red-500 text-xs mt-1">{errors[f.name].message}</p>}
            </div>
          ))}
          <button type="submit" disabled={isSubmitting}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50">
            {isSubmitting ? 'Saving...' : 'Set Password & Continue'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default FirstLogin;
