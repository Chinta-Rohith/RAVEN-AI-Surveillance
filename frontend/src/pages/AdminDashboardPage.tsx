import React, { useState, useEffect } from 'react';
import {
  apiAdminGetStats,
  apiAdminListUsers,
  apiAdminUpdateUserStatus,
  apiAdminUpdateUserRole,
  apiAdminGetAuditLogs,
} from '../services/authApi';
import type { AdminStats, User, AuditLog } from '../services/authApi';
import {
  ShieldAlert,
  Users,
  UserCheck,
  ShieldCheck,
  Search,
  RefreshCw,
  Lock,
  Unlock,
  Activity,
  CheckCircle2,
} from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, usersData, logsData] = await Promise.all([
        apiAdminGetStats(),
        apiAdminListUsers({ search, role: roleFilter, status_filter: statusFilter }),
        apiAdminGetAuditLogs(),
      ]);
      setStats(statsData);
      setUsers(usersData);
      setAuditLogs(logsData);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [roleFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleToggleStatus = async (user: User) => {
    const newStatus = user.account_status === 'active' ? 'suspended' : 'active';
    try {
      const res = await apiAdminUpdateUserStatus(user.id, newStatus);
      setActionMsg(res.message);
      setTimeout(() => setActionMsg(null), 3000);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update user status.');
    }
  };

  const handleToggleRole = async (user: User) => {
    const newRole = user.role === 'admin' ? 'client' : 'admin';
    const confirmMsg = `Are you sure you want to change ${user.name}'s role to ${newRole.toUpperCase()}?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await apiAdminUpdateUserRole(user.id, newRole);
      setActionMsg(res.message);
      setTimeout(() => setActionMsg(null), 3000);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update role.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-white">System Administration</h1>
            <span className="badge-alert text-xs px-2 py-0.5 font-medium">RBAC Master Control</span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            User account management, security access enforcement, and tamper-evident audit logging.
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="btn-secondary text-xs flex items-center gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {actionMsg && (
        <div className="p-3 rounded bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{actionMsg}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="enterprise-card p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Total Accounts</span>
            <Users className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {stats?.total_users ?? 0}
          </div>
          <span className="text-[11px] text-slate-500">Registered across platform</span>
        </div>

        <div className="enterprise-card p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Verified Identity</span>
            <UserCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            {stats?.verified_users ?? 0}
          </div>
          <span className="text-[11px] text-slate-500">
            {stats?.unverified_users ?? 0} unverified accounts
          </span>
        </div>

        <div className="enterprise-card p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Active vs Suspended</span>
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {stats?.active_users ?? 0} / {stats?.suspended_users ?? 0}
          </div>
          <span className="text-[11px] text-slate-500">Active / Suspended</span>
        </div>

        <div className="enterprise-card p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Privileged Administrators</span>
            <ShieldAlert className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400">
            {stats?.admin_users ?? 0}
          </div>
          <span className="text-[11px] text-slate-500">
            {stats?.client_users ?? 0} client workspaces
          </span>
        </div>
      </div>

      {/* User Management Table */}
      <div className="enterprise-card p-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-4">
          <h2 className="text-base font-semibold text-white">Registered User Directory</h2>
          
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-60">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded text-xs px-2.5 py-1.5 text-slate-300 focus:outline-none"
            >
              <option value="">All Roles</option>
              <option value="client">Clients</option>
              <option value="admin">Admins</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded text-xs px-2.5 py-1.5 text-slate-300 focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </form>
        </div>

        <div className="overflow-x-auto">
          <table className="enterprise-table">
            <thead>
              <tr>
                <th>User / Identity</th>
                <th>Role</th>
                <th>Verification</th>
                <th>Account Status</th>
                <th>Created</th>
                <th>Last Login</th>
                <th>Administrative Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500 italic">
                    {loading ? 'Querying user accounts...' : 'No user records matching search criteria.'}
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div>
                        <span className="font-semibold text-white block text-xs">{u.name}</span>
                        <span className="font-mono text-[11px] text-slate-400">{u.email}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase ${
                        u.role === 'admin' ? 'badge-alert' : 'badge-info'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                        u.is_verified ? 'badge-online' : 'badge-warning'
                      }`}>
                        {u.is_verified ? 'Verified' : 'Pending'}
                      </span>
                    </td>
                    <td>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                        u.account_status === 'active' ? 'badge-online' : 'badge-alert'
                      }`}>
                        {u.account_status}
                      </span>
                    </td>
                    <td className="font-mono text-[11px] text-slate-400 whitespace-nowrap">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="font-mono text-[11px] text-slate-400 whitespace-nowrap">
                      {u.last_login_at ? new Date(u.last_login_at).toLocaleString() : 'Never'}
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleStatus(u)}
                          className={`p-1.5 rounded text-xs transition-colors ${
                            u.account_status === 'active'
                              ? 'bg-red-950/60 text-red-300 hover:bg-red-900 border border-red-800/80'
                              : 'bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900 border border-emerald-800/80'
                          }`}
                          title={u.account_status === 'active' ? 'Suspend Account' : 'Reactivate Account'}
                        >
                          {u.account_status === 'active' ? (
                            <Lock className="w-3.5 h-3.5" />
                          ) : (
                            <Unlock className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => handleToggleRole(u)}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] rounded border border-slate-700"
                        >
                          {u.role === 'admin' ? 'Make Client' : 'Make Admin'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Security Audit Log Ledger */}
      <div className="enterprise-card p-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-sky-400" />
            <h2 className="text-base font-semibold text-white">Security &amp; Access Audit Trail</h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {auditLogs.length} Logged Security Events
          </span>
        </div>

        <div className="overflow-x-auto max-h-96">
          <table className="enterprise-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Event Type</th>
                <th>Target / Email</th>
                <th>IP Address</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-500 italic">
                    No security events recorded.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="font-mono text-[11px] text-slate-400 whitespace-nowrap">
                      {log.timestamp}
                    </td>
                    <td>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-semibold font-mono ${
                        log.event_type.includes('FAIL') || log.event_type.includes('SUSPEND')
                          ? 'badge-alert'
                          : log.event_type.includes('SUCCESS') || log.event_type.includes('VERIFIED')
                          ? 'badge-online'
                          : 'badge-info'
                      }`}>
                        {log.event_type}
                      </span>
                    </td>
                    <td className="text-xs text-slate-300">
                      {log.email || log.user_id || 'System'}
                    </td>
                    <td className="font-mono text-[11px] text-slate-400">
                      {log.ip_address || 'unknown'}
                    </td>
                    <td className="text-xs text-slate-400">
                      {log.details || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
