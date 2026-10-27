import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Shield, Mail, ArrowRight, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface Props {
  onNavigate: (view: string) => void;
}

export const ForgotPasswordPage: React.FC<Props> = ({ onNavigate }) => {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email) {
      setError('Please provide your work email address.');
      return;
    }

    setIsLoading(true);
    try {
      const msg = await forgotPassword(email);
      setMessage(msg);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Request could not be processed.');
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
          Reset Password
        </h2>
        <p className="mt-1.5 text-xs text-slate-400">
          Enter your registered work email to receive recovery instructions
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="enterprise-card p-6 sm:p-8">
          {submitted ? (
            <div className="space-y-4 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-white">Instructions Dispatched</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {message || 'If your email is associated with an active account, a single-use password reset link has been dispatched.'}
              </p>
              <div className="pt-4 border-t border-slate-800 space-y-2">
                <button
                  onClick={() => onNavigate('reset-password')}
                  className="w-full btn-primary py-2 text-xs"
                >
                  Enter Reset Token
                </button>
                <button
                  onClick={() => onNavigate('login')}
                  className="w-full btn-secondary py-2 text-xs"
                >
                  Return to Sign In
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
                    Account Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="operator@organization.com"
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
                      <span>Sending Instructions...</span>
                    </>
                  ) : (
                    <>
                      <span>Send Recovery Link</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 pt-5 border-t border-slate-800 flex justify-between text-xs text-slate-400">
                <button
                  onClick={() => onNavigate('login')}
                  className="hover:text-white transition-colors"
                >
                  ← Back to Sign In
                </button>
                <button
                  onClick={() => onNavigate('reset-password')}
                  className="text-sky-400 hover:text-sky-300 transition-colors"
                >
                  Have a token?
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
