export default function access(initialState: any) {
  const { user } = initialState || {};

  return {
    canStudent: user && user.role === 'student',
    canAdmin: user && user.role === 'admin',
  };
}
