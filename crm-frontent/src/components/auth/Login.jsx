import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Mail, Lock, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import Logo from '../common/Logo';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    otp: ''
  });
  const [step, setStep] = useState(1); // 1: email/password, 2: OTP
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleEmailPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    // Simulate OTP sending
    setTimeout(() => {
      setLoading(false);
      setStep(2);
      toast.success('OTP sent to your email');
    }, 1000);
  };

  const handleOTPSubmit = async (e) => {
    e.preventDefault();
    if (!formData.otp) {
      toast.error('Please enter OTP');
      return;
    }

    setLoading(true);
    const result = await login(formData.email, formData.password, formData.otp);
    setLoading(false);

    if (result.success) {
      toast.success('Login successful');
    } else {
      toast.error(result.error || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg border border-primary-100">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <Logo size="large" />
          </div>
          <p className="mt-2 text-gray-600">Secure Access Portal</p>
        </div>

        {step === 1 ? (
          <form onSubmit={handleEmailPasswordSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="input-field pl-10"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="input-field pl-10"
                  placeholder="Enter your password"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary"
            >
              {loading ? 'Sending OTP...' : 'Send OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleOTPSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter OTP
              </label>
              <div className="relative">
                <Shield className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  name="otp"
                  value={formData.otp}
                  onChange={handleInputChange}
                  className="input-field pl-10"
                  placeholder="Enter 6-digit OTP"
                  maxLength="6"
                  required
                />
              </div>
              <p className="text-sm text-gray-500 mt-2">
                OTP sent to {formData.email}
              </p>
            </div>

            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 btn-secondary"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 btn-primary"
              >
                {loading ? 'Verifying...' : 'Login'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;