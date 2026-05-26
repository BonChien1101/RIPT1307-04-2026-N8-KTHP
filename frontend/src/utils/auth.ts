export type UserRole = 'student' | 'admin' | 'super_admin' | 'warehouse_admin' | 'request_admin' | 'warehouse_staff' | 'assistant' | string;

export interface StoredUser {
  id?: number;
  full_name?: string;
  name?: string;
  email?: string;
  role?: UserRole;
  permissions?: string[];
}

export const getStoredUser = (): StoredUser | null => {
  const raw = localStorage.getItem('user');
  if (!raw || raw === 'undefined' || raw === 'null') return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') return parsed;
    return null;
  } catch {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    return null;
  }
};

export const normalizeRole = (role?: UserRole) => {
  if (!role) return 'student';
  return String(role).trim().toLowerCase();
};

export const isStudentRole = (role?: UserRole) => normalizeRole(role) === 'student';

export const isAdminRole = (role?: UserRole) => !isStudentRole(role);

export const routeByRole = (role?: UserRole) => (isStudentRole(role) ? '#/student' : '#/admin');
