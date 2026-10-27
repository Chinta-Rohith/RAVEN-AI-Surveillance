import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  User,
  Shield,
  Lock,
  CheckCircle2,
  AlertCircle,
  Save,
  LogOut,
  Key
} from 'lucide-react';

export const AccountProfilePage: React.FC = () => {
  const { user, updateProfile, changePassword, logout } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [nameSuccess, setNameSuccess] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameLoading, setNameLoading] = useState(false);

  // Password change state
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwLoading, setPwLoading] = useState(false);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameError(null);
    setNameSuccess(false);
    if (!name.trim()) {
      setNameError('Name cannot be empty.');
      return;
    }
    setNameLoading(true);
    try {
      await updateProfile(name.trim());
      setNameSuccess(true);
      setTimeout(() => setNameSuccess(false), 3000);
    } catch (err: any) {
      setNameError(err.message || 'Failed to update profile.');
    } finally {
      setNameLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    setPwSuccess(false);

    if (newPass.length < 8) {
      setPwError('New password must be at least 8 characters long.');
      return;
    }

    if (newPass !== confirmPass) {
      setPwError('New passwords do not match.');
      return;
    }

    setPwLoading(true);
    try {
      await changePassword(currentPass, newPass, confirmPass);
      setPwSuccess(true);
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
      setTimeout(() => setPwSuccess(false), 3000);
    } catch (err: any) {
      setPwError(err.message || 'Failed to update password.');
    } finally {
      setPwLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-white">Account &amp; Security Settings</h1>
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${
              user.role === 'admin' ? 'badge-alert' : 'badge-info'
            }`}>
              {user.role === 'admin' ? 'Administrator' : 'Client Workspace'}
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Manage your authenticated identity, update credentials, and review workspace permissions.
          </p>
        </div>
        <button
          onClick={logout}
          className="btn-secondary text-xs flex items-center gap-1.5 self-start sm:self-auto text-red-400 hover:text-red-300 hover:border-red-800"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Profile Card */}
        <div className="enterprise-card p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center font-bold text-lg">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">{user.name}</h3>
                <p className="text-xs text-slate-400">{user.email}</p>
              </div>
            </div>

            <div className="space-y-2 pt-4 border-t border-slate-800 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/40">
                <span className="text-slate-400">Account Role</span>
                <span className="font-semibold text-white uppercase">{user.role}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/40">
                <span className="text-slate-400">Email Status</span>
                <span className={`font-semibold ${user.is_verified ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {user.is_verified ? 'Verified' : 'Pending Verification'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/40">
                <span className="text-slate-400">Account State</span>
                <span className="text-emerald-400 font-semibold uppercase">{user.account_status}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Member Since</span>
                <span className="text-slate-300 font-mono text-[11px]">
                  {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800 text-[11px] text-slate-500 flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-sky-400" />
            <span>Multi-Tenant Client Isolation Active</span>
          </div>
        </div>

        {/* Right 2 Columns: Forms */}
        <div className="md:col-span-2 space-y-6">
          {/* Form 1: Update Name */}
          <div className="enterprise-card p-6">
            <h3 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
              <User className="w-4 h-4 text-sky-400" />
              Personal Profile
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Update how your name appears across monitoring sessions and audit reports.
            </p>

            {nameSuccess && (
              <div className="mb-4 p-2.5 rounded bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Profile updated successfully.</span>
              </div>
            )}
            {nameError && (
              <div className="mb-4 p-2.5 rounded bg-red-950/60 border border-red-800/80 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span>{nameError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateName} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={nameLoading}
                  className="btn-primary text-xs flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{nameLoading ? 'Saving...' : 'Save Profile'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Form 2: Change Password */}
          <div className="enterprise-card p-6">
            <h3 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
              <Key className="w-4 h-4 text-amber-400" />
              Change Password
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Update your account password. Secure Argon2id encryption will re-hash your credentials.
            </p>

            {pwSuccess && (
              <div className="mb-4 p-2.5 rounded bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Password changed successfully.</span>
              </div>
            )}
            {pwError && (
              <div className="mb-4 p-2.5 rounded bg-red-950/60 border border-red-800/80 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span>{pwError}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  value={currentPass}
                  onChange={(e) => setCurrentPass(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    placeholder="Min 8 characters"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPass}
                    onChange={(e) => setConfirmPass(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={pwLoading}
                  className="btn-primary text-xs flex items-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{pwLoading ? 'Updating...' : 'Update Password'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
