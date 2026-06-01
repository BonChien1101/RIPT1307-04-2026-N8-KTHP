const sequelize = require('../config/database');
const { ok, fail } = require('../utils/response');
const { signToken } = require('../utils/jwt');
const { getInsertedId } = require('../utils/sqlCompat');

const isDbConnectionError = (error) => {
	return (
		error?.name === 'SequelizeConnectionRefusedError' ||
		error?.original?.code === 'ECONNREFUSED' ||
		error?.parent?.code === 'ECONNREFUSED'
	);
};

const loadRoleContext = async (userId, baseRole) => {
	if (baseRole !== 'admin') {
		return { roles: ['student'], permissions: [] };
	}

	const [roleRows] = await sequelize.query(
		`SELECT r.name
		 FROM user_roles ur
		 INNER JOIN roles r ON r.id = ur.role_id
		 WHERE ur.user_id = ?
		 ORDER BY r.id ASC`,
		{ replacements: [userId] }
	);

	const roles = roleRows.map((row) => row.name);
	if (!roles.length) roles.push('admin');

	const [permissionRows] = await sequelize.query(
		`SELECT DISTINCT p.name
		 FROM user_roles ur
		 INNER JOIN role_permissions rp ON rp.role_id = ur.role_id
		 INNER JOIN permissions p ON p.id = rp.permission_id
		 WHERE ur.user_id = ?
		 ORDER BY p.name ASC`,
		{ replacements: [userId] }
	);

	return {
		roles,
		permissions: permissionRows.map((row) => row.name),
	};
};

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

		const roleContext = await loadRoleContext(nguoiDung.id, nguoiDung.role);
		const token = signToken(
			{ id: nguoiDung.id, role: nguoiDung.role, roles: roleContext.roles, permissions: roleContext.permissions, email: nguoiDung.email },
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
					roles: roleContext.roles,
					permissions: roleContext.permissions,
				},
			},
			'Đăng nhập thành công'
		);
	} catch (e) {
		if (isDbConnectionError(e)) {
			return fail(res, 'Không kết nối được CSDL cục bộ. Hãy chạy npm run db:init.', 'DB_CONNECTION_ERROR', 503);
		}
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
		const roleContext = await loadRoleContext(nguoiDung.id, nguoiDung.role);
		return ok(
			res,
			{
				...nguoiDung,
				roles: roleContext.roles,
				permissions: roleContext.permissions,
			},
			'OK'
		);
	} catch (e) {
		if (isDbConnectionError(e)) {
			return fail(res, 'Không kết nối được CSDL cục bộ. Hãy chạy npm run db:init.', 'DB_CONNECTION_ERROR', 503);
		}
		return fail(res, 'Lỗi server', 'INTERNAL_ERROR', 500);
	}
};

const dangKy = async (req, res) => {
	try {
		const { full_name: hoTenRaw, student_code: maSVRaw, email: emailRaw, password: matKhauRaw } = req.body || {};
		const hoTen = String(hoTenRaw || '').trim();
		const maSV = String(maSVRaw || '').trim();
		const email = String(emailRaw || '').trim();
		const matKhau = String(matKhauRaw || '').trim();
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

		const [ketQua, metadata] = await sequelize.query(
			"INSERT INTO users (full_name, student_code, email, password, role) VALUES (?, ?, ?, ?, 'student')",
			{ replacements: [hoTen, maSV || null, email, matKhau] }
		);

		const id = getInsertedId(ketQua, metadata);
		const token = signToken({ id, role: 'student', roles: ['student'], permissions: [], email }, { expiresIn: '7d' });
		return ok(
			res,
			{
				token,
				user: {
					id,
					full_name: hoTen,
					email,
					role: 'student',
					roles: ['student'],
					permissions: [],
				},
			},
			'Đăng ký thành công',
			201
		);
	} catch (e) {
		console.error('dangKy error:', e);
		if (isDbConnectionError(e)) {
			return fail(res, 'Không kết nối được CSDL cục bộ. Hãy chạy npm run db:init.', 'DB_CONNECTION_ERROR', 503);
		}
		if (e?.original?.code === 'ER_DUP_ENTRY') {
			const message = String(e?.original?.sqlMessage || 'Dữ liệu đã tồn tại');
			if (message.includes('email')) {
				return fail(res, 'Email đã được sử dụng', 'CONFLICT', 409);
			}
			if (message.includes('student_code')) {
				return fail(res, 'Mã sinh viên đã tồn tại', 'CONFLICT', 409);
			}
			return fail(res, 'Dữ liệu đăng ký đã tồn tại', 'CONFLICT', 409);
		}
		return fail(res, e?.message || 'Lỗi đăng ký', 'INTERNAL_ERROR', 500);
	}
};

const resetMatKhau = async (req, res) => {
	try {
		const { email, new_password: matKhauMoi, password: matKhauMoiLegacy } = req.body || {};
		const passwordToUse = matKhauMoi || matKhauMoiLegacy;
		if (!email || !passwordToUse) {
			return fail(
				res,
				'Vui lòng nhập email và mật khẩu mới',
				'VALIDATION_ERROR',
				400,
				[
					...(!email ? [{ field: 'email', message: 'Email là bắt buộc' }] : []),
					...(!passwordToUse ? [{ field: 'new_password', message: 'Mật khẩu mới là bắt buộc' }] : []),
				]
			);
		}

		const [rows] = await sequelize.query('SELECT id FROM users WHERE email = ? LIMIT 1', {
			replacements: [email],
		});
		const nguoiDung = rows?.[0];
		if (!nguoiDung) {
			return fail(res, 'Email không tồn tại', 'NOT_FOUND', 404);
		}

		await sequelize.query('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE email = ?', {
			replacements: [passwordToUse, email],
		});

		return ok(res, null, 'Đặt lại mật khẩu thành công');
	} catch (e) {
		if (isDbConnectionError(e)) {
			return fail(res, 'Không kết nối được CSDL cục bộ. Hãy chạy npm run db:init.', 'DB_CONNECTION_ERROR', 503);
		}
		return fail(res, 'Lỗi đặt lại mật khẩu', 'INTERNAL_ERROR', 500);
	}
};

const capNhatProfile = async (req, res) => {
	try {
		const nguoiDungId = req.user?.id;
		if (!nguoiDungId) return fail(res, 'Bạn cần đăng nhập', 'AUTH_REQUIRED', 401);

		const { full_name: hoTenRaw, student_code: maSVRaw } = req.body || {};
		const hoTen = String(hoTenRaw || '').trim();
		const maSV = String(maSVRaw || '').trim();

		const loi = [];
		if (hoTen && hoTen.length < 2) {
			loi.push({ field: 'full_name', message: 'Họ tên phải có ít nhất 2 ký tự' });
		}
		if (loi.length) return fail(res, 'Dữ liệu không hợp lệ', 'VALIDATION_ERROR', 400, loi);

		// Check trùng mã SV nếu có thay đổi
		if (maSV) {
			const [existing] = await sequelize.query(
				'SELECT id FROM users WHERE student_code = ? AND id != ? LIMIT 1',
				{ replacements: [maSV, nguoiDungId] }
			);
			if (existing?.length) {
				return fail(res, 'Mã sinh viên đã được sử dụng', 'CONFLICT', 409);
			}
		}

		const updateValues = [];
		const updateFields = [];

		if (hoTen) {
			updateFields.push('full_name = ?');
			updateValues.push(hoTen);
		}
		if (maSV !== undefined) {
			updateFields.push('student_code = ?');
			updateValues.push(maSV || null);
		}

		if (!updateFields.length) {
			return fail(res, 'Không có dữ liệu để cập nhật', 'VALIDATION_ERROR', 400);
		}

		updateFields.push('updated_at = CURRENT_TIMESTAMP');
		updateValues.push(nguoiDungId);

		await sequelize.query(
			`UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
			{ replacements: updateValues }
		);

		const [rows] = await sequelize.query(
			'SELECT id, full_name, email, role, student_code, created_at, updated_at FROM users WHERE id = ? LIMIT 1',
			{ replacements: [nguoiDungId] }
		);
		const nguoiDung = rows?.[0];

		return ok(res, nguoiDung, 'Cập nhật thông tin cá nhân thành công');
	} catch (e) {
		console.error('capNhatProfile error:', e);
		if (isDbConnectionError(e)) {
			return fail(res, 'Không kết nối được CSDL cục bộ', 'DB_CONNECTION_ERROR', 503);
		}
		return fail(res, 'Lỗi cập nhật thông tin', 'INTERNAL_ERROR', 500);
	}
};

module.exports = { dangNhap, thongTinToi, dangKy, resetMatKhau, capNhatProfile };

