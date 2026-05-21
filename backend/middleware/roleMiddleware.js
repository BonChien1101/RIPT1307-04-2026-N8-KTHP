const { fail } = require('../utils/response');

const requireRole = (...roles) => {
	return (req, res, next) => {
		const vaiTro = req.user?.role;
		if (!vaiTro) return fail(res, 'Bạn cần đăng nhập', 'AUTH_REQUIRED', 401);
		if (!roles.includes(vaiTro)) return fail(res, 'Không đủ quyền', 'FORBIDDEN', 403);
		return next();
	};
};

module.exports = { requireRole };
