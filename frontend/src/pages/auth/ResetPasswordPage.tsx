import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Shield, Lock, Key, ArrowRight, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface Props {
  onNavigate: (view: string) => void;
}

export const ResetPasswordPage: React.FC<Props> = ({ onNavigate }) => {
  const { resetPassword } = useAuth();
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if token is provided in URL query string
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token');
    if (urlToken) {
      setToken(urlToken);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError('A valid single-use reset token is required.');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const msg = await resetPassword(token, newPassword, confirmPassword);
      setMessage(msg);
      setIsSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-tr from-sky-600 to-cyan-400 shadow-lg shadow-sky-500/20 text-white font-bold mb-4">
          <Shield className="w-6 h-6 fill-white/20" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-white font-sans">
          Choose New Password
        </h2>
        <p className="mt-1.5 text-xs text-slate-400">
          Provide your single-use recovery token and select a secure password
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="enterprise-card p-6 sm:p-8">
          {isSuccess ? (
            <div className="space-y-4 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-white">Password Updated</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {message || 'Your password has been securely updated. You can now log in with your new credentials.'}
              </p>
              <div className="pt-4 border-t border-slate-800">
                <button
                  onClick={() => onNavigate('login')}
                  className="w-full btn-primary py-2.5 text-xs font-semibold"
                >
                  Proceed to Sign In
                </button>
              </div>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-5 p-3 rounded bg-red-950/60 border border-red-800/80 text-red-300 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Reset Token
                  </label>
                  <div className="relative">
                    <Key className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      placeholder="Paste single-use token"
                      className="enterprise-input pl-9 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      className="enterprise-input pl-9"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className="enterprise-input pl-9"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full btn-primary py-2.5 text-xs font-semibold flex items-center justify-center gap-2 mt-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <>
                      <span>Set New Password</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 pt-5 border-t border-slate-800 text-center">
                <button
                  onClick={() => onNavigate('login')}
                  className="text-xs text-slate-400 hover:text-white transition-colors"
                >
                  ← Return to Sign In
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
