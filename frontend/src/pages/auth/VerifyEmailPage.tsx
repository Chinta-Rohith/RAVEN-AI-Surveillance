import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Shield, CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react';

interface Props {
  onNavigate: (view: string) => void;
}

export const VerifyEmailPage: React.FC<Props> = ({ onNavigate }) => {
  const { verifyEmail } = useAuth();
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token');
    if (urlToken) {
      setToken(urlToken);
      handleAutoVerify(urlToken);
    }
  }, []);

  const handleAutoVerify = async (tok: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const msg = await verifyEmail(tok);
      setMessage(msg);
      setIsSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Verification token is invalid or expired.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError('Please provide a verification token.');
      return;
    }
    handleAutoVerify(token);
  };

  return (
    <div className="min-h-screen bg-[#070b14] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-tr from-sky-600 to-cyan-400 shadow-lg shadow-sky-500/20 text-white font-bold mb-4">
          <Shield className="w-6 h-6 fill-white/20" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-white font-sans">
          Email Verification
        </h2>
        <p className="mt-1.5 text-xs text-slate-400">
          Confirming your authorized identity on the RAVEN Surveillance Platform
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="enterprise-card p-6 sm:p-8">
          {isLoading ? (
            <div className="py-8 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-sky-400 animate-spin mx-auto" />
              <p className="text-xs text-slate-300">Validating cryptographic token...</p>
            </div>
          ) : isSuccess ? (
            <div className="space-y-4 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-white">Email Verified Successfully</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {message || 'Your email has been verified. Your client workspace is fully operational.'}
              </p>
              <div className="pt-4 border-t border-slate-800">
                <button
                  onClick={() => onNavigate('overview')}
                  className="w-full btn-primary py-2.5 text-xs font-semibold flex items-center justify-center gap-2"
                >
                  <span>Enter Workspace</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {error && (
                <div className="p-3 rounded bg-red-950/60 border border-red-800/80 text-red-300 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleManualSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Paste Verification Token
                  </label>
                  <input
                    type="text"
                    required
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Enter token from email"
                    className="enterprise-input font-mono"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full btn-primary py-2 text-xs font-semibold"
                >
                  Verify Email
                </button>
              </form>

              <div className="pt-4 border-t border-slate-800 text-center">
                <button
                  onClick={() => onNavigate('login')}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Return to Sign In
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
