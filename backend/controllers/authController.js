const sequelize = require('../config/database');
const { ok, fail } = require('../utils/response');
const { signToken } = require('../utils/jwt');

const dangNhap = async (req, res) => {
	try {
		const { email, password: matKhau } = req.body || {};
		if (!email || !matKhau) {
			return fail(
				res,
				'Vui lòng nhập email và mật khẩu',
				'VALIDATION_ERROR',
				400,
				[
					...(!email ? [{ field: 'email', message: 'Email là bắt buộc' }] : []),
					...(!matKhau ? [{ field: 'password', message: 'Mật khẩu là bắt buộc' }] : []),
				]
			);
		}

		// Seed hiện lưu password dạng plain text.
		const [rows] = await sequelize.query(
			'SELECT id, full_name, email, role, password FROM users WHERE email = ? LIMIT 1',
			{ replacements: [email] }
		);
		const nguoiDung = rows?.[0];
		if (!nguoiDung || String(nguoiDung.password) !== String(matKhau)) {
			return fail(res, 'Email hoặc mật khẩu không đúng', 'AUTH_INVALID_CREDENTIALS', 401);
		}

		const token = signToken(
			{ id: nguoiDung.id, role: nguoiDung.role, email: nguoiDung.email },
			{ expiresIn: '7d' }
		);
		return ok(
			res,
			{
				token,
				user: {
					id: nguoiDung.id,
					full_name: nguoiDung.full_name,
					email: nguoiDung.email,
					role: nguoiDung.role,
				},
			},
			'Đăng nhập thành công'
		);
	} catch (e) {
		return fail(res, 'Lỗi đăng nhập', 'INTERNAL_ERROR', 500);
	}
};

const thongTinToi = async (req, res) => {
	try {
		const nguoiDungId = req.user?.id;
		if (!nguoiDungId) return fail(res, 'Bạn cần đăng nhập', 'AUTH_REQUIRED', 401);

		const [rows] = await sequelize.query(
			'SELECT id, full_name, email, role, created_at, updated_at FROM users WHERE id = ? LIMIT 1',
			{ replacements: [nguoiDungId] }
		);
		const nguoiDung = rows?.[0];
		if (!nguoiDung) return fail(res, 'Không tìm thấy người dùng', 'NOT_FOUND', 404);
		return ok(res, nguoiDung, 'OK');
	} catch (e) {
		return fail(res, 'Lỗi server', 'INTERNAL_ERROR', 500);
	}
};

const dangKy = async (req, res) => {
	try {
		const { full_name: hoTen, student_code: maSV, email, password: matKhau } = req.body || {};
		const loi = [];
		if (!hoTen) loi.push({ field: 'full_name', message: 'Họ tên là bắt buộc' });
		if (!email) loi.push({ field: 'email', message: 'Email là bắt buộc' });
		if (!matKhau) loi.push({ field: 'password', message: 'Mật khẩu là bắt buộc' });
		if (loi.length) return fail(res, 'Dữ liệu không hợp lệ', 'VALIDATION_ERROR', 400, loi);

		// Check trùng email
		const [kiemTraEmail] = await sequelize.query('SELECT id FROM users WHERE email = ? LIMIT 1', {
			replacements: [email],
		});
		if (kiemTraEmail?.length) return fail(res, 'Email đã được sử dụng', 'CONFLICT', 409);

		// Check trùng mã SV 
		if (maSV) {
			const [kiemTraMa] = await sequelize.query('SELECT id FROM users WHERE student_code = ? LIMIT 1', {
				replacements: [maSV],
			});
			if (kiemTraMa?.length) return fail(res, 'Mã sinh viên đã tồn tại', 'CONFLICT', 409);
		}

		const [ketQua] = await sequelize.query(
			'INSERT INTO users (full_name, student_code, email, password, role) VALUES (?, ?, ?, ?, \"student\")',
			{ replacements: [hoTen, maSV || null, email, matKhau] }
		);

		const id = ketQua.insertId;
		const token = signToken({ id, role: 'student', email }, { expiresIn: '7d' });
		return ok(
			res,
			{
				token,
				user: {
					id,
					full_name: hoTen,
					email,
					role: 'student',
				},
			},
			'Đăng ký thành công',
			201
		);
	} catch (e) {
		return fail(res, 'Lỗi đăng ký', 'INTERNAL_ERROR', 500);
	}
};

module.exports = { dangNhap, thongTinToi, dangKy };

