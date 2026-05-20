const { fail } = require('../utils/response');
const { verifyToken } = require('../utils/jwt');

const authMiddleware = (req, res, next) => {
	const tieuDe = req.headers.authorization || req.headers.Authorization;
	if (!tieuDe) return fail(res, 'Bạn cần đăng nhập', 'AUTH_REQUIRED', 401);

	const [kieu, token] = String(tieuDe).split(' ');
	if (kieu !== 'Bearer' || !token) {
		return fail(res, 'Token không hợp lệ', 'AUTH_INVALID_TOKEN', 401);
	}

	try {
		const thongTin = verifyToken(token);
		req.user = thongTin;
		return next();
	} catch (e) {
		return fail(res, 'Token không hợp lệ hoặc đã hết hạn', 'AUTH_INVALID_TOKEN', 401);
	}
};

module.exports = authMiddleware;
