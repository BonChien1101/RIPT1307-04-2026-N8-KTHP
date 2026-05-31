import { isAdminRole, isStudentRole } from './utils/auth';

export default function access(initialState: any) {
  const { user } = initialState || {};

  return {
    canStudent: user && isStudentRole(user.role),
    canAdmin: user && isAdminRole(user.role),
  };
}
