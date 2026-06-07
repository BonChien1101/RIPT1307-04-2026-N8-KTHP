const { fail } = require('../utils/response');

const requireRole = (...roles) => {
	return (req, res, next) => {
		const vaiTroChinh = req.user?.role;
		const vaiTroPhu = Array.isArray(req.user?.roles) ? req.user.roles : [];
		if (!vaiTroChinh && !vaiTroPhu.length) return fail(res, 'Bạn cần đăng nhập', 'AUTH_REQUIRED', 401);
		const duocPhep = roles.some((role) => role === vaiTroChinh || vaiTroPhu.includes(role));
		if (!duocPhep) return fail(res, 'Không đủ quyền', 'FORBIDDEN', 403);
		return next();
	};
};

module.exports = { requireRole };
