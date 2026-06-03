const sequelize = require('../config/database');
const { ok, fail } = require('../utils/response');
const { getInsertedId, getAffectedRows } = require('../utils/sqlCompat');

const isAdmin = (req) => req.user?.role === 'admin' || (Array.isArray(req.user?.roles) && req.user.roles.includes('admin'));

const getAll = async (req, res) => {
	try {
		if (!req.user) return fail(res, 'Bạn cần đăng nhập', 'AUTH_REQUIRED', 401);
		const [clubs] = await sequelize.query(
			`SELECT c.id, c.name, c.description, c.leader_id, c.created_at,
			        u.full_name AS leader_name
			 FROM clubs c
			 LEFT JOIN users u ON u.id = c.leader_id
			 ORDER BY c.id DESC`
		);
		const [memberRows] = await sequelize.query(
			`SELECT club_id, COUNT(*) AS member_count
			 FROM users
			 WHERE club_id IS NOT NULL
			 GROUP BY club_id`,
		);
		const countMap = new Map(memberRows.map((row) => [row.club_id, Number(row.member_count || 0)]));
		return ok(res, clubs.map((club) => ({ ...club, member_count: countMap.get(club.id) || 0 })), 'OK');
	} catch (e) {
		return fail(res, 'Lỗi server khi lấy danh sách CLB', 'INTERNAL_ERROR', 500);
	}
};

const getOne = async (req, res) => {
	try {
		if (!req.user) return fail(res, 'Bạn cần đăng nhập', 'AUTH_REQUIRED', 401);
		const clubId = Number(req.params.id);
		if (!clubId) return fail(res, 'ID không hợp lệ', 'VALIDATION_ERROR', 400);
		const [clubs] = await sequelize.query(
			`SELECT c.id, c.name, c.description, c.leader_id, c.created_at,
			        u.full_name AS leader_name, u.email AS leader_email
			 FROM clubs c
			 LEFT JOIN users u ON u.id = c.leader_id
			 WHERE c.id = ? LIMIT 1`,
			{ replacements: [clubId] }
		);
		if (!clubs.length) return fail(res, 'Không tìm thấy CLB', 'NOT_FOUND', 404);
		const [members] = await sequelize.query(
			`SELECT id, full_name, email, student_code, role, club_id
			 FROM users WHERE club_id = ? ORDER BY full_name ASC`,
			{ replacements: [clubId] }
		);
		return ok(res, { ...clubs[0], members }, 'OK');
	} catch (e) {
		return fail(res, 'Lỗi server khi lấy CLB', 'INTERNAL_ERROR', 500);
	}
};

const create = async (req, res) => {
	try {
		if (!isAdmin(req)) return fail(res, 'Không đủ quyền', 'FORBIDDEN', 403);
		const { name, description, leader_id: leaderId } = req.body || {};
		if (!name) return fail(res, 'Tên CLB là bắt buộc', 'VALIDATION_ERROR', 400);
		const [inserted, metadata] = await sequelize.query(
			`INSERT INTO clubs (name, description, leader_id, created_at)
			 VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
			{ replacements: [name, description || null, leaderId || null] }
		);
		return ok(res, { id: getInsertedId(inserted, metadata) }, 'Tạo CLB thành công', 201);
	} catch (e) {
		return fail(res, 'Lỗi server khi tạo CLB', 'INTERNAL_ERROR', 500);
	}
};

const update = async (req, res) => {
	try {
		if (!isAdmin(req)) return fail(res, 'Không đủ quyền', 'FORBIDDEN', 403);
		const clubId = Number(req.params.id);
		if (!clubId) return fail(res, 'ID không hợp lệ', 'VALIDATION_ERROR', 400);
		const { name, description, leader_id: leaderId } = req.body || {};
		const fields = [];
		const params = [];
		if (name !== undefined) { fields.push('name = ?'); params.push(name); }
		if (description !== undefined) { fields.push('description = ?'); params.push(description); }
		if (leaderId !== undefined) { fields.push('leader_id = ?'); params.push(leaderId || null); }
		if (!fields.length) return fail(res, 'Không có dữ liệu để cập nhật', 'VALIDATION_ERROR', 400);
		params.push(clubId);
		const [result, metadata] = await sequelize.query(
			`UPDATE clubs SET ${fields.join(', ')} WHERE id = ?`,
			{ replacements: params }
		);
		if (!getAffectedRows(result, metadata)) return fail(res, 'Không tìm thấy CLB', 'NOT_FOUND', 404);
		return ok(res, { id: clubId }, 'Cập nhật CLB thành công');
	} catch (e) {
		return fail(res, 'Lỗi server khi cập nhật CLB', 'INTERNAL_ERROR', 500);
	}
};

const remove = async (req, res) => {
	try {
		if (!isAdmin(req)) return fail(res, 'Không đủ quyền', 'FORBIDDEN', 403);
		const clubId = Number(req.params.id);
		if (!clubId) return fail(res, 'ID không hợp lệ', 'VALIDATION_ERROR', 400);
		const [result, metadata] = await sequelize.query('DELETE FROM clubs WHERE id = ?', { replacements: [clubId] });
		if (!getAffectedRows(result, metadata)) return fail(res, 'Không tìm thấy CLB', 'NOT_FOUND', 404);
		await sequelize.query('UPDATE users SET club_id = NULL WHERE club_id = ?', { replacements: [clubId] });
		return ok(res, { id: clubId }, 'Xóa CLB thành công');
	} catch (e) {
		return fail(res, 'Không thể xóa CLB', 'INTERNAL_ERROR', 500);
	}
};

const getMembers = async (req, res) => {
	try {
		if (!req.user) return fail(res, 'Bạn cần đăng nhập', 'AUTH_REQUIRED', 401);
		const clubId = Number(req.params.id);
		if (!clubId) return fail(res, 'ID không hợp lệ', 'VALIDATION_ERROR', 400);
		const [members] = await sequelize.query(
			`SELECT id, full_name, email, student_code, role, club_id
			 FROM users WHERE club_id = ? ORDER BY full_name ASC`,
			{ replacements: [clubId] }
		);
		return ok(res, members, 'OK');
	} catch (e) {
		return fail(res, 'Lỗi server khi lấy thành viên CLB', 'INTERNAL_ERROR', 500);
	}
};

const addMember = async (req, res) => {
	try {
		if (!isAdmin(req)) return fail(res, 'Không đủ quyền', 'FORBIDDEN', 403);
		const clubId = Number(req.params.id);
		const { user_id: userId } = req.body || {};
		if (!clubId || !userId) return fail(res, 'Dữ liệu không hợp lệ', 'VALIDATION_ERROR', 400);
		await sequelize.query('UPDATE users SET club_id = ? WHERE id = ?', { replacements: [clubId, userId] });
		return ok(res, { club_id: clubId, user_id: Number(userId) }, 'Đã thêm thành viên');
	} catch (e) {
		return fail(res, 'Lỗi server khi thêm thành viên', 'INTERNAL_ERROR', 500);
	}
};

const getClubRequests = async (req, res) => {
	try {
		const userId = req.user?.id;
		if (!userId) return fail(res, 'Bạn cần đăng nhập', 'AUTH_REQUIRED', 401);
		const [leaderRows] = await sequelize.query('SELECT club_id FROM users WHERE id = ? LIMIT 1', { replacements: [userId] });
		if (!leaderRows.length || !leaderRows[0].club_id) return fail(res, 'Bạn chưa thuộc CLB nào', 'NOT_FOUND', 404);
		const clubId = leaderRows[0].club_id;
		const [rows] = await sequelize.query(
			`SELECT br.id, br.user_id, br.borrow_date, br.expected_return_date, br.status, br.note,
			        u.full_name, u.email, u.student_code,
			        (SELECT GROUP_CONCAT(e.name || ' (x' || bi.quantity || ')', ', ')
			         FROM borrow_items bi JOIN equipments e ON e.id = bi.equipment_id
			         WHERE bi.request_id = br.id) AS equipment_names
			 FROM borrow_requests br
			 LEFT JOIN users u ON u.id = br.user_id
			 WHERE br.club_id = ? AND br.club_status = 'pending'
			 ORDER BY br.id DESC`,
			{ replacements: [clubId] }
		);
		return ok(res, rows, 'OK');
	} catch (e) {
		return fail(res, 'Lỗi server khi lấy đơn của CLB', 'INTERNAL_ERROR', 500);
	}
};

module.exports = { getAll, getOne, create, update, remove, getMembers, addMember, getClubRequests };