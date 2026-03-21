import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { authService } from '../services/authService';
import { ArrowLeft } from 'lucide-react';

const schema = z.object({
  email: z.string().email(),
  otp: z.string().length(6, 'OTP must be 6 digits'),
  newPassword: z.string().min(8, 'Min 8 characters'),
  confirmPassword: z.string(),
}).refine(d => d.newPassword === d.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] });

const ResetPassword = () => {
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (data) => {
    try {
      await authService.resetPassword(data);
      toast.success('Password reset successfully');
      navigate('/login');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Reset failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <Link to="/forgot-password" className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <h2 className="text-2xl font-bold text-slate-900 mb-1">Reset password</h2>
        <p className="text-slate-500 text-sm mb-6">Enter the OTP sent to your email and your new password.</p>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {[
            { name: 'email', label: 'Email', type: 'email', placeholder: 'you@company.com' },
            { name: 'otp', label: 'OTP', type: 'text', placeholder: '6-digit code', maxLength: 6 },
            { name: 'newPassword', label: 'New Password', type: 'password', placeholder: '••••••••' },
            { name: 'confirmPassword', label: 'Confirm Password', type: 'password', placeholder: '••••••••' },
          ].map(f => (
            <div key={f.name}>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">{f.label}</label>
              <input {...register(f.name)} type={f.type} placeholder={f.placeholder} maxLength={f.maxLength}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              {errors[f.name] && <p className="text-red-500 text-xs mt-1">{errors[f.name].message}</p>}
            </div>
          ))}
          <button type="submit" disabled={isSubmitting}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50">
            {isSubmitting ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
