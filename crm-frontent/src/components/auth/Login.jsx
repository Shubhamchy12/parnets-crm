import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import apiService from '../../services/api';
import { 
  HiMail, 
  HiLockClosed, 
  HiShieldCheck, 
  HiEye, 
  HiEyeOff,
  HiArrowLeft,
  HiSparkles,
  HiRefresh,
  HiUser,
  HiUserAdd
} from 'react-icons/hi';
import { 
  FaServer, 
  FaCode, 
  FaDatabase, 
  FaNetworkWired,
  FaRocket,
  FaMicrochip,
  FaCloud,
  FaCrown
} from 'react-icons/fa';
import { BiLoaderAlt } from 'react-icons/bi';
import toast from 'react-hot-toast';
import Logo from '../common/Logo';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    otp: '',
    // Admin registration fields
    name: '',
    confirmPassword: ''
  });
  const [step, setStep] = useState(1); // 1: email/password, 2: OTP, 3: admin registration, 4: admin OTP
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [animatedIcons, setAnimatedIcons] = useState([]);
  const [adminRegistrationAvailable, setAdminRegistrationAvailable] = useState(false);
  const [checkingAdminRegistration, setCheckingAdminRegistration] = useState(true);
  const [adminRegistrationData, setAdminRegistrationData] = useState(null);
  const { setUser } = useAuth();

  // Floating IT icons animation
  useEffect(() => {
    const icons = [FaServer, FaCode, FaDatabase, FaNetworkWired, FaMicrochip, FaCloud];
    const positions = [];
    
    for (let i = 0; i < 6; i++) {
      positions.push({
        id: i,
        Icon: icons[i],
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 2,
        duration: 3 + Math.random() * 2
      });
    }
    setAnimatedIcons(positions);
  }, []);

  // Check admin registration availability on component mount
  useEffect(() => {
    const checkAdminRegistration = async () => {
      try {
        setCheckingAdminRegistration(true);
        const response = await apiService.checkAdminRegistrationAvailable();
        if (response.success) {
          setAdminRegistrationAvailable(response.data.available);
        }
      } catch (error) {
        console.error('Error checking admin registration:', error);
        setAdminRegistrationAvailable(false);
      } finally {
        setCheckingAdminRegistration(false);
      }
    };

    checkAdminRegistration();
  }, []);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleAdminRegistration = async (e) => {
    e.preventDefault();
    const { name, email, password, confirmPassword } = formData;

    if (!name || !email || !password || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }

    // Validate password strength
    if (!/(?=.*[a-z])/.test(password)) {
      toast.error('Password must contain at least one lowercase letter');
      return;
    }
    
    if (!/(?=.*[A-Z])/.test(password)) {
      toast.error('Password must contain at least one uppercase letter');
      return;
    }
    
    if (!/(?=.*\d)/.test(password)) {
      toast.error('Password must contain at least one number');
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.registerAdmin(name, email, password, confirmPassword);
      if (response.success) {
        toast.success('Admin registered successfully! You can now login with your credentials.');
        setAdminRegistrationAvailable(false);
        setStep(1);
        // Clear registration form data but keep email for login
        setFormData({
          email: email,
          password: '',
          otp: '',
          name: '',
          confirmPassword: ''
        });
      } else {
        toast.error(response.message || 'Registration failed');
      }
    } catch (error) {
      toast.error(error.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.login(formData.email, formData.password);
      if (response.success) {
        setStep(2);
        toast.success('OTP sent to your email');
      } else {
        toast.error(response.message || 'Login failed');
      }
    } catch (error) {
      toast.error(error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleOTPSubmit = async (e) => {
    e.preventDefault();
    if (!formData.otp) {
      toast.error('Please enter OTP');
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.verifyOTP(formData.email, formData.otp);
      if (response.success) {
        setUser(response.data.user);
        toast.success('Login successful');
      } else {
        toast.error(response.message || 'Invalid OTP');
      }
    } catch (error) {
      toast.error(error.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setLoading(true);
    try {
      const response = await apiService.resendOTP(formData.email);
      if (response.success) {
        toast.success('New OTP sent to your email');
      } else {
        toast.error(response.message || 'Failed to resend OTP');
      }
    } catch (error) {
      toast.error(error.message || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      {/* Animated Background */}
      <div className="absolute inset-0">
        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: '60px 60px'
          }}></div>
        </div>
        
        {/* Floating IT Icons */}
        {animatedIcons.map(({ id, Icon, x, y, delay, duration }) => (
          <div
            key={id}
            className="absolute text-blue-400/20 animate-pulse"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              animationDelay: `${delay}s`,
              animationDuration: `${duration}s`
            }}
          >
            <Icon className="w-8 h-8 animate-bounce" />
          </div>
        ))}

        {/* Gradient Orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Login Card */}
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-8 transform transition-all duration-500 hover:scale-105">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="flex justify-center mb-6 relative">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full blur-lg opacity-50 animate-pulse"></div>
                  <div className="relative bg-white/20 backdrop-blur-sm rounded-full p-4 border border-white/30">
                    <Logo size="large" />
                  </div>
                </div>
              </div>
              
              <h1 className="text-3xl font-bold text-white mb-2 flex items-center justify-center gap-2">
                <HiSparkles className="text-blue-400 animate-spin" />
                IT CRM Portal
                <HiSparkles className="text-indigo-400 animate-spin" style={{ animationDirection: 'reverse' }} />
              </h1>
              <p className="text-blue-200/80 text-sm flex items-center justify-center gap-2">
                <FaRocket className="animate-bounce" />
                Secure Technology Management System
              </p>
            </div>

            {/* Step Indicator */}
            {step !== 3 && (
              <div className="flex justify-center mb-6">
                <div className="flex items-center space-x-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                    step >= 1 ? 'bg-blue-500 text-white' : 'bg-white/20 text-white/60'
                  }`}>
                    1
                  </div>
                  <div className={`w-12 h-0.5 transition-all duration-300 ${
                    step >= 2 ? 'bg-blue-500' : 'bg-white/20'
                  }`}></div>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                    step >= 2 ? 'bg-blue-500 text-white' : 'bg-white/20 text-white/60'
                  }`}>
                    2
                  </div>
                </div>
              </div>
            )}

            {/* Admin Registration Step Indicator */}
            {step === 3 && (
              <div className="flex justify-center mb-6">
                <div className="flex items-center space-x-2">
                  <FaCrown className="text-yellow-400 w-6 h-6" />
                  <span className="text-white font-medium">Admin Registration</span>
                </div>
              </div>
            )}

            {/* Forms */}
            {step === 1 ? (
              <form onSubmit={handleEmailPasswordSubmit} className="space-y-6">
                <div className="space-y-4">
                  {/* Email Field */}
                  <div className="group">
                    <label className="block text-sm font-medium text-white/90 mb-2 flex items-center gap-2">
                      <HiMail className="text-blue-400" />
                      Email Address
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 group-hover:bg-white/15"
                        placeholder="Enter your email address"
                        required
                      />
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/20 to-indigo-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                    </div>
                  </div>

                  {/* Password Field */}
                  <div className="group">
                    <label className="block text-sm font-medium text-white/90 mb-2 flex items-center gap-2">
                      <HiLockClosed className="text-blue-400" />
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 pr-12 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 group-hover:bg-white/15"
                        placeholder="Enter your password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white transition-colors duration-200"
                      >
                        {showPassword ? <HiEyeOff className="w-5 h-5" /> : <HiEye className="w-5 h-5" />}
                      </button>
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/20 to-indigo-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <BiLoaderAlt className="w-5 h-5 animate-spin" />
                      Sending OTP...
                    </>
                  ) : (
                    <>
                      <FaRocket className="w-4 h-4" />
                      Send OTP
                    </>
                  )}
                </button>

                {/* Admin Registration Button */}
                {!checkingAdminRegistration && adminRegistrationAvailable && (
                  <div className="text-center">
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-white/20"></div>
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-slate-900 text-white/60">or</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="mt-4 w-full bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-xl flex items-center justify-center gap-2"
                    >
                      <FaCrown className="w-4 h-4" />
                      Register as Admin
                    </button>
                    <p className="text-white/60 text-xs mt-2">
                      No admin account exists yet? Create the first administrator account
                    </p>
                  </div>
                )}
              </form>
            ) : step === 2 ? (
              <form onSubmit={handleOTPSubmit} className="space-y-6">
                <div className="group">
                  <label className="block text-sm font-medium text-white/90 mb-2 flex items-center gap-2">
                    <HiShieldCheck className="text-green-400" />
                    Enter OTP
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="otp"
                      value={formData.otp}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 group-hover:bg-white/15 text-center text-lg tracking-widest"
                      placeholder="Enter 6-digit OTP"
                      maxLength="6"
                      required
                    />
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-green-500/20 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                  </div>
                  <p className="text-blue-200/70 text-sm mt-2 text-center">
                    OTP sent to {formData.email}
                  </p>
                </div>

                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 bg-white/10 hover:bg-white/20 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 border border-white/20 flex items-center justify-center gap-2"
                  >
                    <HiArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <BiLoaderAlt className="w-5 h-5 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        <HiShieldCheck className="w-4 h-4" />
                        Login
                      </>
                    )}
                  </button>
                </div>

                {/* Resend OTP */}
                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleResendOTP}
                    disabled={loading}
                    className="text-blue-300 hover:text-blue-200 text-sm underline flex items-center justify-center gap-2 mx-auto transition-colors duration-200 disabled:opacity-50"
                  >
                    <HiRefresh className="w-4 h-4" />
                    Resend OTP
                  </button>
                </div>
              </form>
            ) : (
              /* Admin Registration Form */
              <form onSubmit={handleAdminRegistration} className="space-y-6">
                <div className="space-y-4">
                  {/* Name Field */}
                  <div className="group">
                    <label className="block text-sm font-medium text-white/90 mb-2 flex items-center gap-2">
                      <HiUser className="text-yellow-400" />
                      Full Name
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-300 group-hover:bg-white/15"
                        placeholder="Enter your full name"
                        required
                      />
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-yellow-500/20 to-orange-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                    </div>
                  </div>

                  {/* Email Field */}
                  <div className="group">
                    <label className="block text-sm font-medium text-white/90 mb-2 flex items-center gap-2">
                      <HiMail className="text-yellow-400" />
                      Email Address
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-300 group-hover:bg-white/15"
                        placeholder="Enter your email address"
                        required
                      />
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-yellow-500/20 to-orange-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                    </div>
                  </div>

                  {/* Password Field */}
                  <div className="group">
                    <label className="block text-sm font-medium text-white/90 mb-2 flex items-center gap-2">
                      <HiLockClosed className="text-yellow-400" />
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 pr-12 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-300 group-hover:bg-white/15"
                        placeholder="Create a strong password (8+ characters)"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white transition-colors duration-200"
                      >
                        {showPassword ? <HiEyeOff className="w-5 h-5" /> : <HiEye className="w-5 h-5" />}
                      </button>
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-yellow-500/20 to-orange-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                    </div>
                  </div>

                  {/* Confirm Password Field */}
                  <div className="group">
                    <label className="block text-sm font-medium text-white/90 mb-2 flex items-center gap-2">
                      <HiShieldCheck className="text-yellow-400" />
                      Confirm Password
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 pr-12 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-300 group-hover:bg-white/15"
                        placeholder="Confirm your password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white transition-colors duration-200"
                      >
                        {showConfirmPassword ? <HiEyeOff className="w-5 h-5" /> : <HiEye className="w-5 h-5" />}
                      </button>
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-yellow-500/20 to-orange-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 bg-white/10 hover:bg-white/20 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 border border-white/20 flex items-center justify-center gap-2"
                  >
                    <HiArrowLeft className="w-4 h-4" />
                    Back to Login
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <BiLoaderAlt className="w-5 h-5 animate-spin" />
                        Registering...
                      </>
                    ) : (
                      <>
                        <HiUserAdd className="w-4 h-4" />
                        Register Admin
                      </>
                    )}
                  </button>
                </div>

                {/* Registration Info */}
                <div className="text-center">
                  <p className="text-white/60 text-xs">
                    This will create the first administrator account for the system with full permissions
                  </p>
                  <div className="mt-2 text-white/50 text-xs">
                    <p>✓ Full access to all modules (Dashboard, Clients, Projects, etc.)</p>
                    <p>✓ Complete CRUD permissions (Create, Read, Update, Delete)</p>
                    <p>✓ User management and role assignment capabilities</p>
                  </div>
                </div>
              </form>
            )}

            {/* Footer */}
            <div className="mt-8 text-center">
              <p className="text-white/60 text-xs flex items-center justify-center gap-2">
                <FaNetworkWired className="animate-pulse" />
                Powered by Advanced IT Infrastructure
                <FaServer className="animate-pulse" />
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;