const emailService = require('../services/emailService');
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

const normalizeUserRow = (row) => {
	if (!row) return row;
	const isBanned = Number(row.is_banned) === 1;
	return {
		...row,
		name: row.full_name ?? row.name ?? '',
		full_name: row.full_name ?? row.name ?? '',
		status: row.status ?? (isBanned ? 'inactive' : 'active'),
		is_banned: isBanned ? 1 : 0,
	};
};

const loadRoleContext = async (userId, baseRole) => {
	const [roleRows] = await sequelize.query(
		`SELECT r.name
		 FROM user_roles ur
		 INNER JOIN roles r ON r.id = ur.role_id
		 WHERE ur.user_id = ?
		 ORDER BY r.id ASC`,
		{ replacements: [userId] }
	);

	const roles = roleRows.map((row) => row.name);
	if (!roles.length) roles.push(baseRole || 'student');

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

const yeuCauOtp = async (req, res) => {
    try {
        const { email } = req.body || {};
        if (!email) {
            return fail(res, 'Vui lòng nhập email', 'VALIDATION_ERROR', 400);
        }
        const [rows] = await sequelize.query('SELECT id, full_name FROM users WHERE email = ? LIMIT 1', {
            replacements: [email.trim()],
        });
        const nguoiDung = rows?.[0];
        if (!nguoiDung) {
            return fail(res, 'Email không tồn tại trong hệ thống', 'NOT_FOUND', 404);
        }

        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = new Date(Date.now() + 5 * 60 * 1000); 


        await sequelize.query(
            'UPDATE users SET reset_password_otp = ?, reset_password_expires = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            { replacements: [otpCode, otpExpires, nguoiDung.id] }
        );


        const template = emailService.templates.forgotPassword({
            fullName: nguoiDung.full_name,
            otpCode: otpCode
        });

        
        await emailService.sendEmail({
            to: email.trim(),
            subject: template.subject,
            html: template.html
        });

        return ok(res, null, 'Mã OTP xác thực đã được gửi về email của bạn');
    } catch (e) {
        console.error('🔥 Lỗi yeuCauOtp:', e);
        if (isDbConnectionError(e)) {
            return fail(res, 'Không kết nối được CSDL cục bộ.', 'DB_CONNECTION_ERROR', 503);
        }
        return fail(res, 'Lỗi hệ thống khi gửi mã OTP', 'INTERNAL_ERROR', 500);
    }
};


const resetMatKhau = async (req, res) => {
    try {
        const { email, otp_code: otpCode, new_password: matKhauMoi } = req.body || {};
        
        if (!email || !otpCode || !matKhauMoi) {
            return fail(res, 'Vui lòng điền đầy đủ email, mã OTP và mật khẩu mới', 'VALIDATION_ERROR', 400, [
                ...(!email ? [{ field: 'email', message: 'Email là bắt buộc' }] : []),
                ...(!otpCode ? [{ field: 'otp_code', message: 'Mã OTP là bắt buộc' }] : []),
                ...(!matKhauMoi ? [{ field: 'new_password', message: 'Mật khẩu mới là bắt buộc' }] : []),
            ]);
        }

        
        const [rows] = await sequelize.query(
            `SELECT id FROM users 
             WHERE email = ? AND reset_password_otp = ? AND reset_password_expires > CURRENT_TIMESTAMP 
             LIMIT 1`,
            { replacements: [email.trim(), String(otpCode).trim()] }
        );
        const nguoiDung = rows?.[0];

       
        if (!nguoiDung) {
            return fail(res, 'Mã OTP không chính xác hoặc đã hết hạn sử dụng', 'INVALID_OR_EXPIRED_OTP', 400);
        }

        
        await sequelize.query(
            `UPDATE users 
             SET password = ?, reset_password_otp = NULL, reset_password_expires = NULL, updated_at = CURRENT_TIMESTAMP 
             WHERE id = ?`,
            { replacements: [matKhauMoi, nguoiDung.id] }
        );

        return ok(res, null, 'Đặt lại mật khẩu mới thành công!');
    } catch (e) {
        console.error('🔥 Lỗi resetMatKhau:', e);
        if (isDbConnectionError(e)) {
            return fail(res, 'Không kết nối được CSDL cục bộ.', 'DB_CONNECTION_ERROR', 503);
        }
        return fail(res, 'Lỗi hệ thống khi đặt lại mật khẩu', 'INTERNAL_ERROR', 500);
    }
};

const capNhatProfile = async (req, res) => {
	try {
		const nguoiDungId = req.user?.id;
		if (!nguoiDungId) return fail(res, 'Bạn cần đăng nhập', 'AUTH_REQUIRED', 401);

		const { full_name: hoTenRaw, email: emailRaw } = req.body || {};
		const hoTen = String(hoTenRaw || '').trim();
		const email = String(emailRaw || '').trim();

		const loi = [];
		if (hoTen && hoTen.length < 2) {
			loi.push({ field: 'full_name', message: 'Họ tên phải có ít nhất 2 ký tự' });
		}
		if (email && !email.includes('@')) {
			loi.push({ field: 'email', message: 'Email không hợp lệ' });
		}
		if (loi.length) return fail(res, 'Dữ liệu không hợp lệ', 'VALIDATION_ERROR', 400, loi);

		// Check trùng email nếu có thay đổi
		if (email) {
			const [existing] = await sequelize.query(
				'SELECT id FROM users WHERE email = ? AND id != ? LIMIT 1',
				{ replacements: [email, nguoiDungId] }
			);
			if (existing?.length) {
				return fail(res, 'Email đã được sử dụng', 'CONFLICT', 409);
			}
		}

		const updateValues = [];
		const updateFields = [];

		if (hoTen) {
			updateFields.push('full_name = ?');
			updateValues.push(hoTen);
		}
		if (email) {
			updateFields.push('email = ?');
			updateValues.push(email);
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

const layDanhSachNguoiDung = async (req, res) => {
	try {
		const [rows] = await sequelize.query(
			`SELECT id, full_name, student_code, email, role, is_banned, trust_score, trust_rank, created_at, updated_at
			 FROM users ORDER BY id DESC`
		);
		return ok(res, rows.map(normalizeUserRow), 'OK');
	} catch (e) {
		return fail(res, 'Lỗi lấy danh sách người dùng', 'INTERNAL_ERROR', 500);
	}
};

const layChiTietNguoiDung = async (req, res) => {
	try {
		const id = Number(req.params.id);
		if (!id) return fail(res, 'ID người dùng không hợp lệ', 'VALIDATION_ERROR', 400);

		const [rows] = await sequelize.query(
			`SELECT id, full_name, student_code, email, role, is_banned, trust_score, trust_rank, created_at, updated_at
			 FROM users WHERE id = ? LIMIT 1`,
			{ replacements: [id] }
		);
		const user = normalizeUserRow(rows?.[0]);
		if (!user) return fail(res, 'Không tìm thấy người dùng', 'NOT_FOUND', 404);
		return ok(res, user, 'OK');
	} catch (e) {
		return fail(res, 'Lỗi lấy chi tiết người dùng', 'INTERNAL_ERROR', 500);
	}
};

const taoNguoiDung = async (req, res) => {
	try {
		const {
			full_name: fullNameRaw,
			name: legacyNameRaw,
			student_code: studentCodeRaw,
			email: emailRaw,
			password: passwordRaw,
			role: roleRaw,
			status: statusRaw,
		} = req.body || {};

		const fullName = String(fullNameRaw || legacyNameRaw || '').trim();
		const studentCode = String(studentCodeRaw || '').trim();
		const email = String(emailRaw || '').trim();
		const password = String(passwordRaw || '').trim();
		const role = String(roleRaw || 'student').trim() || 'student';
		const status = String(statusRaw || 'active').trim();
		const isBanned = status === 'inactive' ? 1 : 0;

		const errors = [];
		if (!fullName) errors.push({ field: 'full_name', message: 'Họ tên là bắt buộc' });
		if (!email) errors.push({ field: 'email', message: 'Email là bắt buộc' });
		if (!password) errors.push({ field: 'password', message: 'Mật khẩu là bắt buộc' });
		if (errors.length) return fail(res, 'Dữ liệu không hợp lệ', 'VALIDATION_ERROR', 400, errors);

		const [emailExists] = await sequelize.query('SELECT id FROM users WHERE email = ? LIMIT 1', {
			replacements: [email],
		});
		if (emailExists?.length) return fail(res, 'Email đã được sử dụng', 'CONFLICT', 409);

		if (studentCode) {
			const [codeExists] = await sequelize.query('SELECT id FROM users WHERE student_code = ? LIMIT 1', {
				replacements: [studentCode],
			});
			if (codeExists?.length) return fail(res, 'Mã sinh viên đã tồn tại', 'CONFLICT', 409);
		}

		const [result, metadata] = await sequelize.query(
			`INSERT INTO users (full_name, student_code, email, password, role, is_banned)
			 VALUES (?, ?, ?, ?, ?, ?)`,
			{ replacements: [fullName, studentCode || null, email, password, role, isBanned] }
		);

		const id = getInsertedId(result, metadata);
		return ok(
			res,
			normalizeUserRow({
				id,
				full_name: fullName,
				student_code: studentCode || null,
				email,
				role,
				is_banned: isBanned,
				status: isBanned ? 'inactive' : 'active',
			}),
			'Tạo người dùng thành công',
			201
		);
	} catch (e) {
		if (isDbConnectionError(e)) {
			return fail(res, 'Không kết nối được CSDL cục bộ. Hãy chạy npm run db:init.', 'DB_CONNECTION_ERROR', 503);
		}
		if (e?.original?.code === 'ER_DUP_ENTRY') {
			const message = String(e?.original?.sqlMessage || 'Dữ liệu đã tồn tại');
			if (message.includes('email')) return fail(res, 'Email đã được sử dụng', 'CONFLICT', 409);
			if (message.includes('student_code')) return fail(res, 'Mã sinh viên đã tồn tại', 'CONFLICT', 409);
		}
		return fail(res, 'Lỗi tạo người dùng', 'INTERNAL_ERROR', 500);
	}
};

const capNhatNguoiDung = async (req, res) => {
	try {
		const { id } = req.params;
		const { full_name, name, student_code, email, role, status } = req.body || {};
		const fullName = String(full_name || name || '').trim();
		const studentCode = student_code === undefined ? undefined : String(student_code || '').trim();
		const emailValue = email === undefined ? undefined : String(email || '').trim();
		const roleValue = String(role || 'student').trim() || 'student';
		const is_banned = status === 'inactive' ? 1 : 0;

		const updateFields = ['full_name = ?', 'role = ?', 'is_banned = ?', 'updated_at = CURRENT_TIMESTAMP'];
		const replacements = [fullName, roleValue, is_banned, id];

		if (studentCode !== undefined) {
			updateFields.splice(1, 0, 'student_code = ?');
			replacements.splice(1, 0, studentCode || null);
		}
		if (emailValue !== undefined) {
			updateFields.splice(2, 0, 'email = ?');
			replacements.splice(2, 0, emailValue || null);
		}

		await sequelize.query(
			`UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
			{ replacements }
		);
		return ok(res, null, 'Cập nhật thành công');
	} catch (e) {
		return fail(res, 'Lỗi cập nhật người dùng', 'INTERNAL_ERROR', 500);
	}
};

const xoaNguoiDung = async (req, res) => {
	try {
		const { id } = req.params;
		await sequelize.query('DELETE FROM users WHERE id = ?', { replacements: [id] });
		return ok(res, null, 'Xóa người dùng thành công');
	} catch (e) {
		return fail(res, 'Lỗi xóa người dùng', 'INTERNAL_ERROR', 500);
	}
};

module.exports = { 
    dangNhap, thongTinToi, dangKy, yeuCauOtp, resetMatKhau, capNhatProfile, 
    taoNguoiDung, layDanhSachNguoiDung, layChiTietNguoiDung, capNhatNguoiDung, xoaNguoiDung 
};
