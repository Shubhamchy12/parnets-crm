import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { authService } from '../../services/authService';
import toast from 'react-hot-toast';

const EyeIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);
const EyeOffIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
  </svg>
);
const Spinner = () => (
  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
  </svg>
);

const OTPToast = ({ otp, onClose }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(otp);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div style={{ animation: 'slideIn .35s cubic-bezier(.16,1,.3,1)' }}
      className="fixed top-5 right-5 z-50 w-72 rounded-2xl overflow-hidden shadow-2xl">
      <div className="absolute inset-0 rounded-2xl" style={{ background: 'linear-gradient(135deg,#0f172a,#1e293b)', border: '1px solid rgba(255,255,255,0.08)' }} />
      <div className="relative p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.2)' }}>
              <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
              </svg>
            </div>
            <div>
              <p className="text-white text-xs font-semibold">OTP Generated</p>
              <p className="text-slate-400 text-xs">Valid for 10 minutes</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors p-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div className="rounded-xl p-4 mb-3 flex items-center justify-between" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
          <span className="text-3xl font-bold tracking-[0.3em] text-white">{otp}</span>
          <button onClick={copy}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all"
            style={copied
              ? { background: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)' }
              : { background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)' }}>
            {copied
              ? <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>Copied</>
              : <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>Copy</>
            }
          </button>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="h-full rounded-full" style={{ width: '100%', background: 'linear-gradient(90deg,#6366f1,#8b5cf6)', animation: 'shrink 600s linear forwards' }}/>
          </div>
          <span className="text-slate-500 text-xs">10 min</span>
        </div>
      </div>
    </div>
  );
};

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '', otp: '' });
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [otpData, setOtpData] = useState(null);
  const { setUser } = useAuth();

  const handleChange = (e) => setFormData(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authService.login({ email: formData.email, password: formData.password });
      const { success, data, message } = res.data;
      if (success) { setStep(2); if (data?.otp) setOtpData({ otp: data.otp }); }
      else toast.error(message || 'Login failed');
    } catch (err) { toast.error(err.response?.data?.message || 'Login failed'); }
    finally { setLoading(false); }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authService.verifyOTP({ email: formData.email, otp: formData.otp });
      const { success, data, message } = res.data;
      if (success) {
        localStorage.setItem('authToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        setOtpData(null);
        setUser(data.user);
        toast.success('OTP verified successfully');
      } else toast.error(message || 'Invalid OTP');
    } catch (err) { toast.error(err.response?.data?.message || 'Verification failed'); }
    finally { setLoading(false); }
  };

  const handleResend = async () => {
    setLoading(true);
    try {
      const res = await authService.resendOTP({ email: formData.email });
      const { success, data } = res.data;
      if (success && data?.otp) { setOtpData({ otp: data.otp }); toast.success('New OTP generated'); }
    } catch { toast.error('Failed to resend'); }
    finally { setLoading(false); }
  };

  return (
    <>
      {otpData && <OTPToast otp={otpData.otp} onClose={() => setOtpData(null)} />}

      <div className="min-h-screen flex" style={{ background: '#f8fafc' }}>

        {/* ── LEFT PANEL ── */}
        <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden flex-col"
          style={{ background: 'linear-gradient(160deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)' }}>

          {/* Mesh grid */}
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: 'linear-gradient(rgba(99,102,241,0.15) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,0.15) 1px,transparent 1px)',
            backgroundSize: '60px 60px'
          }}/>

          {/* Glow blobs */}
          <div className="absolute rounded-full blur-3xl" style={{ width:500,height:500,top:-100,left:-100,background:'radial-gradient(circle,rgba(99,102,241,0.25),transparent 70%)' }}/>
          <div className="absolute rounded-full blur-3xl" style={{ width:400,height:400,bottom:-80,right:-80,background:'radial-gradient(circle,rgba(139,92,246,0.2),transparent 70%)' }}/>
          <div className="absolute rounded-full blur-2xl" style={{ width:250,height:250,top:'45%',left:'55%',background:'radial-gradient(circle,rgba(236,72,153,0.1),transparent 70%)' }}/>

          {/* Content */}
          <div className="relative z-10 flex flex-col h-full p-12">
            {/* Brand */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 bg-white p-1"
                style={{ border:'1px solid rgba(255,255,255,0.15)' }}>
                <img src="/logo.jpg" alt="Parnets" style={{ width:'100%', height:'100%', objectFit:'contain' }}/>
              </div>
              <span className="text-white font-bold text-lg tracking-wide">Parnets</span>
            </div>

            {/* Hero */}
            <div className="flex-1 flex flex-col justify-center max-w-sm">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-8 w-fit"
                style={{ background:'rgba(99,102,241,0.15)', border:'1px solid rgba(99,102,241,0.3)' }}>
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"/>
                <span className="text-indigo-300 text-xs font-medium">Enterprise CRM Platform</span>
              </div>

              <h1 className="text-5xl font-extrabold text-white leading-[1.1] mb-5">
                Run your<br/>
                <span style={{ background:'linear-gradient(135deg,#818cf8,#c084fc)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
                  business
                </span><br/>
                smarter.
              </h1>
              <p className="text-slate-400 text-base leading-relaxed mb-10">
                One platform for clients, projects, employees, invoices, and everything in between.
              </p>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                {[['500+','Businesses'],['99.9%','Uptime'],['24/7','Support']].map(([n,l]) => (
                  <div key={l} className="rounded-2xl p-4" style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)' }}>
                    <p className="text-2xl font-bold text-white">{n}</p>
                    <p className="text-slate-500 text-xs mt-0.5">{l}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Testimonial */}
            <div className="rounded-2xl p-5" style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-slate-300 text-sm leading-relaxed mb-3">
                "Parnets CRM transformed how we manage our clients and projects. Absolutely essential."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ background:'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>N</div>
                <div>
                  <p className="text-white text-xs font-semibold">Nabeen Tiwary</p>
                  <p className="text-slate-500 text-xs">Managing Director</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="w-full lg:w-[48%] flex items-center justify-center p-6 sm:p-10" style={{ background:'#f8fafc' }}>
          <div className="w-full max-w-[400px]">

            {/* Mobile brand */}
            <div className="flex lg:hidden items-center gap-2.5 mb-10">
              <div className="w-9 h-9 rounded-xl overflow-hidden bg-white p-1"
                style={{ border:'1px solid #e2e8f0', boxShadow:'0 2px 8px rgba(0,0,0,0.08)' }}>
                <img src="/logo.jpg" alt="Parnets" style={{ width:'100%', height:'100%', objectFit:'contain' }}/>
              </div>
              <span className="font-bold text-slate-800 text-lg">Parnets</span>
            </div>

            {step === 1 ? (
              <>
                {/* Logo — centered, always visible */}
                <div className="flex flex-col items-center mb-8">
                  <div className="mb-4 p-3 rounded-2xl bg-white shadow-lg"
                    style={{ boxShadow:'0 8px 30px rgba(99,102,241,0.15)', border:'1px solid #e2e8f0' }}>
                    <img src="/logo.jpg" alt="Parnets"
                      style={{ width:64, height:64, objectFit:'contain', display:'block' }}/>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">Sign in to Parnets</h2>
                  <p className="text-slate-500 text-sm mt-1">Enter your credentials to continue</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                    <input type="email" name="email" value={formData.email} onChange={handleChange}
                      placeholder="admin@crm.com" required
                      className="w-full px-4 py-3 rounded-xl text-slate-900 text-sm placeholder-slate-400 outline-none transition-all"
                      style={{ background:'white', border:'1.5px solid #e2e8f0', boxShadow:'0 1px 2px rgba(0,0,0,0.04)' }}
                      onFocus={e => e.target.style.border='1.5px solid #6366f1'}
                      onBlur={e => e.target.style.border='1.5px solid #e2e8f0'}/>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                    <div className="relative">
                      <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange}
                        placeholder="••••••••" required
                        className="w-full px-4 py-3 pr-11 rounded-xl text-slate-900 text-sm placeholder-slate-400 outline-none transition-all"
                        style={{ background:'white', border:'1.5px solid #e2e8f0', boxShadow:'0 1px 2px rgba(0,0,0,0.04)' }}
                        onFocus={e => e.target.style.border='1.5px solid #6366f1'}
                        onBlur={e => e.target.style.border='1.5px solid #e2e8f0'}/>
                      <button type="button" onClick={() => setShowPassword(p => !p)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                        {showPassword ? <EyeOffIcon/> : <EyeIcon/>}
                      </button>
                    </div>
                  </div>

                  <button type="submit" disabled={loading}
                    className="w-full py-3 rounded-xl text-white text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 mt-2"
                    style={{ background: loading ? '#818cf8' : 'linear-gradient(135deg,#6366f1,#4f46e5)', boxShadow:'0 4px 15px rgba(99,102,241,0.35)' }}>
                    {loading ? <><Spinner/>Sending OTP...</> : 'Continue →'}
                  </button>
                </form>

                {/* <div className="mt-6 rounded-xl p-4" style={{ background:'#f1f5f9', border:'1px solid #e2e8f0' }}>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Demo Access</p>
                  <div className="space-y-1">
                    <p className="text-xs text-slate-600 font-mono">admin@crm.com / admin123</p>
                    <p className="text-xs text-slate-400 font-mono">manager@crm.com / manager123</p>
                  </div>
                </div> */}
              </>
            ) : (
              <>
                <div className="flex flex-col items-center mb-8">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                    style={{ background:'linear-gradient(135deg,#ede9fe,#ddd6fe)', boxShadow:'0 10px 30px rgba(99,102,241,0.2)' }}>
                    <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">Check your OTP</h2>
                  <p className="text-slate-500 text-sm mt-1 text-center">
                    Code sent for <span className="font-semibold text-slate-700">{formData.email}</span>
                  </p>
                </div>

                <form onSubmit={handleVerify} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">6-digit OTP</label>
                    <input type="text" name="otp" value={formData.otp} onChange={handleChange}
                      placeholder="0  0  0  0  0  0" maxLength="6" required
                      className="w-full px-4 py-4 rounded-xl text-slate-900 text-center text-2xl font-bold tracking-[0.5em] placeholder-slate-300 outline-none transition-all"
                      style={{ background:'white', border:'1.5px solid #e2e8f0', boxShadow:'0 1px 2px rgba(0,0,0,0.04)', letterSpacing:'0.4em' }}
                      onFocus={e => e.target.style.border='1.5px solid #6366f1'}
                      onBlur={e => e.target.style.border='1.5px solid #e2e8f0'}/>
                  </div>

                  <button type="submit" disabled={loading}
                    className="w-full py-3 rounded-xl text-white text-sm font-semibold transition-all flex items-center justify-center gap-2"
                    style={{ background: loading ? '#818cf8' : 'linear-gradient(135deg,#6366f1,#4f46e5)', boxShadow:'0 4px 15px rgba(99,102,241,0.35)' }}>
                    {loading ? <><Spinner/>Verifying...</> : 'Verify & Sign In ✓'}
                  </button>

                  <div className="flex items-center justify-between pt-1">
                    <button type="button" onClick={() => { setStep(1); setOtpData(null); }}
                      className="text-sm text-slate-500 hover:text-slate-700 transition-colors flex items-center gap-1">
                      ← Back
                    </button>
                    <button type="button" onClick={handleResend} disabled={loading}
                      className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors disabled:opacity-50">
                      Resend OTP
                    </button>
                  </div>
                </form>

                {!otpData && (
                  <div className="mt-5 rounded-xl p-3.5 flex items-start gap-2.5" style={{ background:'#fffbeb', border:'1px solid #fde68a' }}>
                    <span className="text-base">💡</span>
                    <p className="text-xs text-amber-700">Your OTP appears as a notification in the top-right corner. Click Resend if it's gone.</p>
                  </div>
                )}
              </>
            )}

            <p className="text-center text-xs text-slate-400 mt-8">© 2026 Parnets. All rights reserved.</p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideIn { from{opacity:0;transform:translateX(110%)} to{opacity:1;transform:translateX(0)} }
        @keyframes shrink { from{width:100%} to{width:0%} }
      `}</style>
    </>
  );
};

export default Login;
