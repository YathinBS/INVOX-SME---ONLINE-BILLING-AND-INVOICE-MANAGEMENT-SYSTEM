import React, { useState } from 'react';
import {
  Building2,
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  X,
  CheckCircle2,
  ShieldCheck
} from 'lucide-react';
import { api } from '../services/api.ts';
import { useToast } from '../components/Toast.tsx';
import { INDIAN_STATES } from '../types/index.ts';

interface AuthViewProps {
  onAuthSuccess: (data: { user: any; business: any; token: string }) => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onAuthSuccess }) => {
  const { success, error } = useToast();
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);

  // Password visibility toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regBusinessName, setRegBusinessName] = useState('');
  const [regPhone, setRegPhone] = useState('+91 ');
  const [regState, setRegState] = useState('Karnataka');
  const [regCity, setRegCity] = useState('Bengaluru');
  const [regGstin, setRegGstin] = useState('');

  // Forgot Password modal state
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [receivedOtp, setReceivedOtp] = useState<string | null>(null);
  const [forgotLoading, setForgotLoading] = useState(false);

  // Handle standard login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    const trimmedPass = password.trim();
    if (!trimmedEmail || !trimmedPass) {
      error('Please enter your email and password');
      return;
    }
    setLoading(true);
    try {
      const res = await api.auth.login({ email: trimmedEmail, password: trimmedPass });
      api.setToken(res.token);
      success(`Welcome back, ${res.user.name}!`);
      onAuthSuccess(res);
    } catch (err: any) {
      error(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  // Handle registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.auth.register({
        name: regName,
        email: regEmail,
        password: regPassword,
        businessName: regBusinessName,
        phone: regPhone,
        state: regState,
        city: regCity,
        gstin: regGstin
      });
      api.setToken(res.token);
      success('Business registration successful!');
      onAuthSuccess(res);
    } catch (err: any) {
      error(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  // Open Forgot Password modal
  const openForgotPassword = () => {
    setForgotEmail(email || 'demo@yathinenterprises.in');
    setForgotOtp('');
    setNewPassword('');
    setReceivedOtp(null);
    setForgotStep(1);
    setIsForgotModalOpen(true);
  };

  // Request OTP for password reset
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) {
      error('Please enter your email address');
      return;
    }
    setForgotLoading(true);
    try {
      const res = await api.auth.forgotPassword(forgotEmail);
      setReceivedOtp(res.otp || null);
      if (res.otp) {
        setForgotOtp(res.otp); // Pre-fill for seamless user testing experience
      }
      setForgotStep(2);
      success('Verification code generated successfully!');
    } catch (err: any) {
      error(err.message || 'Failed to send verification code');
    } finally {
      setForgotLoading(false);
    }
  };

  // Submit OTP and new password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotOtp || !newPassword) {
      error('Please provide the verification code and your new password');
      return;
    }
    if (newPassword.length < 6) {
      error('Password must be at least 6 characters');
      return;
    }
    setForgotLoading(true);
    try {
      const res = await api.auth.resetPassword({
        email: forgotEmail,
        otp: forgotOtp,
        newPassword
      });
      success(res.message || 'Password reset successful!');
      // Populate login form with new credentials
      setEmail(forgotEmail);
      setPassword(newPassword);
      setIsForgotModalOpen(false);
    } catch (err: any) {
      error(err.message || 'Failed to reset password');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-slate-950 overflow-hidden select-none">
      {/* Premium Architectural Ambient Background */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Subtle geometric grid */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: `linear-gradient(to right, #38bdf8 1px, transparent 1px), linear-gradient(to bottom, #38bdf8 1px, transparent 1px)`,
            backgroundSize: '48px 48px'
          }}
        />

        {/* Ambient radial glow gradients */}
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-gradient-to-b from-blue-600/20 via-indigo-600/10 to-transparent blur-[120px] rounded-full" />
        <div className="absolute -bottom-40 right-10 w-[600px] h-[500px] bg-gradient-to-t from-sky-600/15 via-blue-900/10 to-transparent blur-[140px] rounded-full" />
        <div className="absolute top-1/3 -left-32 w-96 h-96 bg-indigo-500/10 blur-[100px] rounded-full" />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        {/* Brand System Title Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-500 rounded-2xl text-white shadow-xl shadow-blue-500/20 border border-blue-400/30 mb-4 transition-transform hover:scale-105 duration-200">
            <Building2 className="w-7 h-7" />
          </div>

          {/* System Title in Outfit Font */}
          <h1 className="font-['Outfit'] text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            INVOX <span className="text-blue-500 font-bold">SME</span>
          </h1>
          <p className="mt-2 text-xs text-slate-400 tracking-wide font-normal">
            Online Billing &amp; Invoice Management System
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-white/95 backdrop-blur-md py-8 px-6 sm:px-10 shadow-2xl rounded-2xl border border-white/20">
          <div className="mb-6">
            <h2 className="font-['Outfit'] text-xl font-bold text-slate-900 tracking-tight">
              {isRegister ? 'Register Enterprise' : 'Sign In'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isRegister
                ? 'Create a new business profile to start billing'
                : 'Access your invoices, customers, and financial ledger'}
            </p>
          </div>

          {!isRegister ? (
            /* Login Form */
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 font-['Outfit']">
                  Business Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                    placeholder="demo@yathinenterprises.in or yathinyathi155@gmail.com"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700 font-['Outfit']">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={openForgotPassword}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors font-['Outfit']"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                    placeholder="e.g. Password@123"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-0.5 focus:outline-none"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg shadow-sm text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:opacity-50 font-['Outfit'] cursor-pointer"
              >
                <span>{loading ? 'Authenticating...' : 'Sign In to Portal'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          ) : (
            /* Register Form */
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 font-['Outfit']">
                  Enterprise / Business Name *
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={regBusinessName}
                    onChange={e => setRegBusinessName(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="e.g. Apex Industrial Solutions"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 font-['Outfit']">
                    State *
                  </label>
                  <select
                    value={regState}
                    onChange={e => setRegState(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    {INDIAN_STATES.map(s => (
                      <option key={s.name} value={s.name}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 font-['Outfit']">
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    value={regCity}
                    onChange={e => setRegCity(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="City"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 font-['Outfit']">
                  GSTIN (Optional)
                </label>
                <input
                  type="text"
                  value={regGstin}
                  onChange={e => setRegGstin(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                  placeholder="29AABCY1234F1Z5"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 font-['Outfit']">
                    Proprietor Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={e => setRegName(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="Full Name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 font-['Outfit']">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={regPhone}
                    onChange={e => setRegPhone(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="+91 9876543210"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 font-['Outfit']">
                  Login Email *
                </label>
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={e => setRegEmail(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="admin@business.com"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 font-['Outfit']">
                  Set Password *
                </label>
                <div className="relative">
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    required
                    value={regPassword}
                    onChange={e => setRegPassword(e.target.value)}
                    className="w-full pl-3 pr-10 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="At least 6 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-0.5 focus:outline-none"
                    title={showRegPassword ? 'Hide password' : 'Show password'}
                  >
                    {showRegPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-lg shadow-sm text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50 mt-2 font-['Outfit'] cursor-pointer"
              >
                {loading ? 'Creating Business Account...' : 'Complete Enterprise Registration'}
              </button>
            </form>
          )}

          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <button
              type="button"
              onClick={() => setIsRegister(!isRegister)}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium font-['Outfit'] cursor-pointer"
            >
              {isRegister
                ? 'Already have an account? Sign in here'
                : 'Need a new business profile? Register here'}
            </button>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-100 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-['Outfit'] font-bold text-sm text-slate-900">
                    Reset Account Password
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Step {forgotStep} of 2: {forgotStep === 1 ? 'Verify Email' : 'Set New Password'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsForgotModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200/50 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {forgotStep === 1 ? (
                <form onSubmit={handleRequestOtp} className="space-y-4">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Enter the email address registered with your business portal. We will issue a secure verification code to reset your password.
                  </p>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 font-['Outfit']">
                      Registered Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="email"
                        required
                        value={forgotEmail}
                        onChange={e => setForgotEmail(e.target.value)}
                        placeholder="demo@yathinenterprises.in"
                        className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsForgotModalOpen(false)}
                      className="flex-1 py-2 px-3 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors font-['Outfit'] cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors disabled:opacity-50 font-['Outfit'] cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <span>{forgotLoading ? 'Verifying...' : 'Generate Code'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  {/* OTP Notification Banner */}
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                    <div className="flex items-center gap-2 text-blue-800 text-xs font-semibold">
                      <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>Verification Code Generated</span>
                    </div>
                    <p className="text-[11px] text-blue-700 mt-1">
                      Target Email: <span className="font-mono font-semibold">{forgotEmail}</span>
                    </p>
                    {receivedOtp && (
                      <div className="mt-2 flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-blue-200">
                        <span className="text-[11px] text-slate-500 font-medium">Verification Code:</span>
                        <span className="font-mono text-xs font-bold text-blue-700 tracking-wider">
                          {receivedOtp}
                        </span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 font-['Outfit']">
                      6-Digit Verification Code *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={forgotOtp}
                      onChange={e => setForgotOtp(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="e.g. 123456"
                      className="w-full px-3 py-2 text-sm text-center font-mono tracking-widest bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 font-['Outfit']">
                      New Password *
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        className="w-full pl-9 pr-10 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        tabIndex={-1}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-0.5 focus:outline-none"
                        title={showNewPassword ? 'Hide password' : 'Show password'}
                      >
                        {showNewPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setForgotStep(1)}
                      className="py-2 px-3 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors font-['Outfit'] cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors disabled:opacity-50 font-['Outfit'] cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{forgotLoading ? 'Updating Password...' : 'Save New Password'}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
