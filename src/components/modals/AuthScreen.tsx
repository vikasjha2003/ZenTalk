import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { MessageCircle, Eye, EyeOff, Lock, MailCheck, RotateCcw } from 'lucide-react';

export default function AuthScreen() {
  const { login, signup, verifySignupOtp } = useApp();
  const [tab, setTab] = useState<'login' | 'signup' | 'forgot'>('login');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signupStep, setSignupStep] = useState<'form' | 'otp'>('form');
  const [otpCode, setOtpCode] = useState('');
  const [signupRequestId, setSignupRequestId] = useState('');

  const [loginForm, setLoginForm] = useState({ emailOrUsername: '', password: '' });
  const [signupForm, setSignupForm] = useState({
    name: '', username: '', email: '', mobile: '', password: '', avatar: '🧑',
  });

  const [forgotStep, setForgotStep] = useState<'email' | 'otp'>('email');
  const [forgotOtp, setForgotOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const avatarOptions = ['🧑', '👩', '👨', '🧔', '👩‍💼', '👨‍💼', '🧑‍💻', '👩‍🎨', '🦸', '🧙', '🧝', '🧛'];
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const getMobileDigits = (value: string) => value.replace(/\D/g, '');

  const resetFeedback = () => {
    setError('');
    setInfo('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFeedback();
    setIsSubmitting(true);
    const result = await login(loginForm.emailOrUsername, loginForm.password);
    setIsSubmitting(false);
    if (!result.ok) setError(result.message || 'Invalid email/username or password.');
  };

  const requestOtp = async () => {
    resetFeedback();
    if (!signupForm.name || !signupForm.username || !signupForm.email || !signupForm.password) {
      setError('Please fill in all required fields');
      return;
    }
    if (!signupForm.mobile.trim()) {
      setError('Mobile number is required');
      return;
    }
    if (!emailPattern.test(signupForm.email.trim())) {
      setError('Enter a valid email address');
      return;
    }
    const mobileDigits = getMobileDigits(signupForm.mobile);
    if (mobileDigits.length < 10 || mobileDigits.length > 15) {
      setError('Enter a valid mobile number with 10 to 15 digits');
      return;
    }
    if (signupForm.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsSubmitting(true);
    const result = await signup({
      ...signupForm,
      email: signupForm.email.trim().toLowerCase(),
      mobile: mobileDigits,
    });
    setIsSubmitting(false);

    if (!result.ok || !result.requestId) {
      setError(result.message || 'Unable to send verification code.');
      return;
    }

    setSignupRequestId(result.requestId);
    setSignupStep('otp');
    setOtpCode('');
    setInfo(result.message || `A verification code was sent to ${signupForm.email}.`);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    await requestOtp();
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFeedback();
    if (!signupRequestId) {
      setError('Please request a verification code first.');
      return;
    }
    if (!/^\d{6}$/.test(otpCode.trim())) {
      setError('Enter the 6-digit code sent to your email.');
      return;
    }

    setIsSubmitting(true);
    const result = await verifySignupOtp(signupRequestId, otpCode.trim());
    setIsSubmitting(false);
    if (!result.ok) {
      setError(result.message || 'Unable to verify the code.');
      return;
    }

    setInfo(result.message || 'Your account is verified.');
  };

  const handleResendOtp = async () => {
    await requestOtp();
  };

  const inputCls = 'w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm';
  const inputSmCls = 'w-full px-3 py-2.5 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4 overflow-y-auto">
      <div className="w-full max-w-md py-6">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-3 shadow-lg shadow-primary/30">
            <MessageCircle className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">ZenTalk</h1>
          <p className="text-muted-foreground mt-1 text-sm">Connect. Collaborate. Communicate.</p>
        </div>

        <div className="bg-card rounded-2xl shadow-xl border border-border overflow-hidden">
          <div className="flex border-b border-border">
            {(['login', 'signup'] as const).map(t => (
              <button
                key={t}
                onClick={() => {
                  setTab(t);
                  resetFeedback();
                  if (t === 'signup') {
                    setSignupStep('form');
                    setOtpCode('');
                  }
                }}
                className={`flex-1 py-4 text-sm font-semibold transition-colors capitalize ${
                  tab === t ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <div className="max-h-[70vh] overflow-y-auto">
            <div className="p-6">
              {error && (
                <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}
              {info && (
                <div className="mb-4 rounded-lg border border-primary/20 bg-primary/10 p-3 text-sm text-primary">
                  {info}
                </div>
              )}

              {tab === 'login' ? (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Email or Username</label>
                    <input
                      type="text"
                      value={loginForm.emailOrUsername}
                      onChange={e => setLoginForm(p => ({ ...p, emailOrUsername: e.target.value }))}
                      placeholder="Your email or username"
                      className={inputCls}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Password</label>
                    <div className="relative">
                      <input
                        type={showPass ? 'text' : 'password'}
                        value={loginForm.password}
                        onChange={e => setLoginForm(p => ({ ...p, password: e.target.value }))}
                        placeholder="••••••••"
                        className={`${inputCls} pr-12`}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(p => !p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <div className="text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setTab('forgot');
                            setForgotStep('email');
                          }}
                          className="text-xs text-primary hover:underline"
                        >
                          Forgot Password?
                        </button>
                      </div>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 transition-all active:scale-[0.98] shadow-md shadow-primary/20 text-sm mt-2 disabled:opacity-60"
                  >
                    {isSubmitting ? 'Signing In...' : 'Sign In'}
                  </button>
                </form>
              ) : tab === 'forgot' ? (
                <div className="space-y-4">

                  {forgotStep === 'email' ? (
                    <>
                      <input
                        type="email"
                        placeholder="Enter your email"
                        value={loginForm.emailOrUsername}
                        onChange={e =>
                          setLoginForm(p => ({ ...p, emailOrUsername: e.target.value }))
                        }
                        className={inputCls}
                      />

                      <button
                        onClick={async () => {
                          const res = await fetch("http://localhost:3001/api/auth/forgot-password-otp", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ email: loginForm.emailOrUsername }),
                          });

                          const data = await res.json();
                          if (data.ok) {
                            setForgotStep('otp');
                            setInfo("OTP sent to your email");
                          } else {
                            setError(data.message);
                          }
                        }}
                        className="w-full py-3 bg-primary text-white rounded-xl"
                      >
                        Send OTP
                      </button>
                    </>
                  ) : (
                    <>
                      <input
                        type="text"
                        placeholder="Enter OTP"
                        value={forgotOtp}
                        onChange={e => setForgotOtp(e.target.value)}
                        className={inputCls}
                      />

                      <input
                        type="password"
                        placeholder="New Password"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        className={inputCls}
                      />

                      <button
                        onClick={async () => {
                          const res = await fetch("http://localhost:3001/api/auth/reset-password-otp", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              email: loginForm.emailOrUsername,
                              otp: forgotOtp,
                              newPassword,
                            }),
                          });

                          const data = await res.json();
                          if (data.ok) {
                            setInfo("Password reset successful");
                            setTab('login');
                          } else {
                            setError(data.message);
                          }
                        }}
                        className="w-full py-3 bg-primary text-white rounded-xl"
                      >
                        Reset Password
                      </button>
                    </>
                  )}

                </div>
              ) : signupStep === 'form' ? (
                <form onSubmit={handleSignup} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Choose Your Avatar</label>
                    <div className="flex flex-wrap gap-2">
                      {avatarOptions.map(a => (
                        <button
                          key={a}
                          type="button"
                          onClick={() => setSignupForm(p => ({ ...p, avatar: a }))}
                          className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all ${
                            signupForm.avatar === a
                              ? 'bg-primary/20 ring-2 ring-primary scale-110 shadow-sm'
                              : 'bg-muted hover:bg-muted/80 hover:scale-105'
                          }`}
                        >
                          {a}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Full Name <span className="text-destructive">*</span></label>
                      <input type="text" value={signupForm.name} onChange={e => setSignupForm(p => ({ ...p, name: e.target.value }))} placeholder="Your name" className={inputSmCls} required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Username <span className="text-destructive">*</span></label>
                      <input type="text" value={signupForm.username} onChange={e => setSignupForm(p => ({ ...p, username: e.target.value.replace(/\s/g, '') }))} placeholder="username" className={inputSmCls} required />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Email <span className="text-destructive">*</span></label>
                    <input type="email" value={signupForm.email} onChange={e => setSignupForm(p => ({ ...p, email: e.target.value }))} placeholder="you@example.com" className={inputCls} required />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Mobile Number <span className="text-destructive">*</span></label>
                    <input
                      type="tel"
                      value={signupForm.mobile}
                      onChange={e => setSignupForm(p => ({ ...p, mobile: e.target.value }))}
                      placeholder="10 to 15 digits"
                      className={inputCls}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Password <span className="text-destructive">*</span></label>
                    <div className="relative">
                      <input
                        type={showPass ? 'text' : 'password'}
                        value={signupForm.password}
                        onChange={e => setSignupForm(p => ({ ...p, password: e.target.value }))}
                        placeholder="Min. 6 characters"
                        className={`${inputCls} pr-12`}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(p => !p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 transition-all active:scale-[0.98] shadow-md shadow-primary/20 text-sm disabled:opacity-60"
                  >
                    {isSubmitting ? 'Sending Code...' : 'Send Verification Code'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-2xl bg-primary/10 p-2 text-primary">
                        <MailCheck className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">Verify your email</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          We sent a 6-digit code to <span className="font-medium text-foreground">{signupForm.email}</span>. Enter it below to finish creating your account.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Verification Code</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={otpCode}
                      onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="Enter 6-digit code"
                      className={`${inputCls} text-center text-lg tracking-[0.4em]`}
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 transition-all active:scale-[0.98] shadow-md shadow-primary/20 text-sm disabled:opacity-60"
                  >
                    {isSubmitting ? 'Verifying...' : 'Verify And Create Account'}
                  </button>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setSignupStep('form');
                        setOtpCode('');
                        resetFeedback();
                      }}
                      className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
                    >
                      Edit Details
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleResendOtp()}
                      disabled={isSubmitting}
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-60"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Resend Code
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-5 flex items-center justify-center gap-1.5">
          <Lock className="w-3 h-3" /> Live Mongo auth · Email OTP verification
        </p>
      </div>
    </div>
  );
}
