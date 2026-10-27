/**
 * RAVEN Authentication & Client Workspace API Client
 */

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'client' | 'admin';
  is_verified: boolean;
  account_status: 'active' | 'suspended';
  created_at?: string;
  last_login_at?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface AdminStats {
  total_users: number;
  verified_users: number;
  unverified_users: number;
  active_users: number;
  suspended_users: number;
  admin_users: number;
  client_users: number;
}

export interface AuditLog {
  id: number;
  timestamp: string;
  user_id?: string;
  email?: string;
  event_type: string;
  ip_address?: string;
  user_agent?: string;
  details?: string;
}

const API_BASE = '/api';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('raven_auth_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function apiRegister(data: {
  name: string;
  email: string;
  password: string;
  password_confirm: string;
}): Promise<User> {
  const resp = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: 'Registration failed.' }));
    throw new Error(err.detail || 'Registration failed.');
  }
  return resp.json();
}

export async function apiLogin(data: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const resp = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: 'Invalid email or password.' }));
    throw new Error(err.detail || 'Invalid email or password.');
  }
  return resp.json();
}

export async function apiGetMe(): Promise<User> {
  const resp = await fetch(`${API_BASE}/auth/me`, {
    headers: getAuthHeaders(),
  });
  if (!resp.ok) {
    throw new Error('Session expired or unauthorized.');
  }
  return resp.json();
}

export async function apiLogout(): Promise<void> {
  try {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  } catch {
    // Ignore network errors during logout
  }
}

export async function apiUpdateProfile(name: string): Promise<User> {
  const resp = await fetch(`${API_BASE}/auth/profile`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ name }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: 'Failed to update profile.' }));
    throw new Error(err.detail || 'Failed to update profile.');
  }
  return resp.json();
}

export async function apiChangePassword(data: {
  current_password: string;
  new_password: string;
  new_password_confirm: string;
}): Promise<{ message: string }> {
  const resp = await fetch(`${API_BASE}/auth/change-password`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: 'Failed to change password.' }));
    throw new Error(err.detail || 'Failed to change password.');
  }
  return resp.json();
}

export async function apiForgotPassword(email: string): Promise<{ message: string }> {
  const resp = await fetch(`${API_BASE}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: 'Request failed.' }));
    throw new Error(err.detail || 'Request failed.');
  }
  return resp.json();
}

export async function apiResetPassword(data: {
  token: string;
  new_password: string;
  new_password_confirm: string;
}): Promise<{ message: string }> {
  const resp = await fetch(`${API_BASE}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: 'Failed to reset password.' }));
    throw new Error(err.detail || 'Failed to reset password.');
  }
  return resp.json();
}

export async function apiVerifyEmail(token: string): Promise<{ message: string }> {
  const resp = await fetch(`${API_BASE}/auth/verify-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: 'Email verification failed.' }));
    throw new Error(err.detail || 'Email verification failed.');
  }
  return resp.json();
}

// Admin APIs
export async function apiAdminGetStats(): Promise<AdminStats> {
  const resp = await fetch(`${API_BASE}/admin/stats`, {
    headers: getAuthHeaders(),
  });
  if (!resp.ok) {
    throw new Error('Failed to retrieve administrative statistics.');
  }
  return resp.json();
}

export async function apiAdminListUsers(params?: {
  search?: string;
  role?: string;
  status_filter?: string;
}): Promise<User[]> {
  const query = new URLSearchParams();
  if (params?.search) query.set('search', params.search);
  if (params?.role) query.set('role', params.role);
  if (params?.status_filter) query.set('status_filter', params.status_filter);

  const resp = await fetch(`${API_BASE}/admin/users?${query.toString()}`, {
    headers: getAuthHeaders(),
  });
  if (!resp.ok) {
    throw new Error('Failed to retrieve user accounts.');
  }
  return resp.json();
}

export async function apiAdminUpdateUserStatus(
  userId: string,
  accountStatus: 'active' | 'suspended'
): Promise<{ message: string }> {
  const resp = await fetch(`${API_BASE}/admin/users/${userId}/status`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ account_status: accountStatus }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: 'Failed to update user status.' }));
    throw new Error(err.detail || 'Failed to update user status.');
  }
  return resp.json();
}

export async function apiAdminUpdateUserRole(
  userId: string,
  role: 'client' | 'admin'
): Promise<{ message: string }> {
  const resp = await fetch(`${API_BASE}/admin/users/${userId}/role`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ role }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: 'Failed to update user role.' }));
    throw new Error(err.detail || 'Failed to update user role.');
  }
  return resp.json();
}

export async function apiAdminGetAuditLogs(): Promise<AuditLog[]> {
  const resp = await fetch(`${API_BASE}/admin/audit-logs?limit=100`, {
    headers: getAuthHeaders(),
  });
  if (!resp.ok) {
    throw new Error('Failed to retrieve security audit logs.');
  }
  return resp.json();
}
