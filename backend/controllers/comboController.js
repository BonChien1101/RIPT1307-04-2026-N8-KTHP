const sequelize = require('../config/database');
const { ok, fail } = require('../utils/response');
const { getInsertedId, getAffectedRows } = require('../utils/sqlCompat');

const isStudentOrAdmin = (req) => ['student', 'admin'].includes(req.user?.role) || (Array.isArray(req.user?.roles) && (req.user.roles.includes('student') || req.user.roles.includes('admin')));

const getComboItems = async (comboIds = []) => {
	if (!comboIds.length) return [];
	const placeholders = comboIds.map(() => '?').join(', ');
	const [rows] = await sequelize.query(
		`SELECT ci.combo_id, ci.equipment_id, ci.quantity, e.name AS equipment_name, e.available_quantity, e.total_quantity
		 FROM combo_items ci
		 LEFT JOIN equipments e ON e.id = ci.equipment_id
		 WHERE ci.combo_id IN (${placeholders})
		 ORDER BY ci.id ASC`,
		{ replacements: comboIds }
	);
	return rows;
};

const mapCombos = async (comboRows) => {
	const comboIds = comboRows.map((item) => item.id);
	const itemRows = await getComboItems(comboIds);
	const grouped = new Map();
	for (const item of itemRows) {
		if (!grouped.has(item.combo_id)) grouped.set(item.combo_id, []);
		grouped.get(item.combo_id).push(item);
	}
	return comboRows.map((combo) => {
		const items = grouped.get(combo.id) || [];
		const available = items.every((item) => Number(item.available_quantity || 0) >= Number(item.quantity || 0));
		return { ...combo, items, available };
	});
};

const getAll = async (req, res) => {
	try {
		if (!isStudentOrAdmin(req)) return fail(res, 'Bạn cần đăng nhập', 'AUTH_REQUIRED', 401);
		const [comboRows] = await sequelize.query(
			`SELECT id, name, description, image_url, created_at, updated_at
			 FROM equipment_combos ORDER BY id DESC`
		);
		return ok(res, await mapCombos(comboRows), 'OK');
	} catch (e) {
		return fail(res, 'Lỗi server khi lấy danh sách combo', 'INTERNAL_ERROR', 500);
	}
};

const getOne = async (req, res) => {
	try {
		if (!isStudentOrAdmin(req)) return fail(res, 'Bạn cần đăng nhập', 'AUTH_REQUIRED', 401);
		const comboId = Number(req.params.id);
		if (!comboId) return fail(res, 'ID không hợp lệ', 'VALIDATION_ERROR', 400);
		const [comboRows] = await sequelize.query(
			`SELECT id, name, description, image_url, created_at, updated_at
			 FROM equipment_combos WHERE id = ? LIMIT 1`,
			{ replacements: [comboId] }
		);
		if (!comboRows.length) return fail(res, 'Không tìm thấy combo', 'NOT_FOUND', 404);
		const [items] = await sequelize.query(
			`SELECT ci.id, ci.combo_id, ci.equipment_id, ci.quantity, e.name AS equipment_name,
			        e.available_quantity, e.total_quantity, e.storage_location, e.condition_status
			 FROM combo_items ci
			 LEFT JOIN equipments e ON e.id = ci.equipment_id
			 WHERE ci.combo_id = ? ORDER BY ci.id ASC`,
			{ replacements: [comboId] }
		);
		const combo = comboRows[0];
		return ok(res, { ...combo, items, available: items.every((item) => Number(item.available_quantity || 0) >= Number(item.quantity || 0)) }, 'OK');
	} catch (e) {
		return fail(res, 'Lỗi server khi lấy combo', 'INTERNAL_ERROR', 500);
	}
};

const saveItems = async (comboId, items, transaction) => {
	await sequelize.query('DELETE FROM combo_items WHERE combo_id = ?', { replacements: [comboId], transaction });
	for (const item of items) {
		const equipmentId = Number(item?.equipment_id);
		const quantity = Number(item?.quantity || 1);
		if (!equipmentId || quantity <= 0) throw new Error('INVALID_ITEM');
		// eslint-disable-next-line no-await-in-loop
		await sequelize.query(
			'INSERT INTO combo_items (combo_id, equipment_id, quantity, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
			{ replacements: [comboId, equipmentId, quantity], transaction }
		);
	}
};

const create = async (req, res) => {
	try {
		if (req.user?.role !== 'admin') return fail(res, 'Không đủ quyền', 'FORBIDDEN', 403);
		const { name, description, image_url: imageUrl, items = [] } = req.body || {};
		if (!name) return fail(res, 'Tên combo là bắt buộc', 'VALIDATION_ERROR', 400);
		if (!Array.isArray(items) || !items.length) return fail(res, 'Combo cần ít nhất một thiết bị', 'VALIDATION_ERROR', 400);

		const result = await sequelize.transaction(async (t) => {
			const [inserted, metadata] = await sequelize.query(
				`INSERT INTO equipment_combos (name, description, image_url, created_at, updated_at)
				 VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
				{ replacements: [name, description || null, imageUrl || null], transaction: t }
			);
			const comboId = getInsertedId(inserted, metadata);
			await saveItems(comboId, items, t);
			return comboId;
		});
		return ok(res, { id: result }, 'Tạo combo thành công', 201);
	} catch (e) {
		if (e?.message === 'INVALID_ITEM') return fail(res, 'Danh sách thiết bị trong combo không hợp lệ', 'VALIDATION_ERROR', 400);
		return fail(res, 'Lỗi server khi tạo combo', 'INTERNAL_ERROR', 500);
	}
};

const update = async (req, res) => {
	try {
		if (req.user?.role !== 'admin') return fail(res, 'Không đủ quyền', 'FORBIDDEN', 403);
		const comboId = Number(req.params.id);
		if (!comboId) return fail(res, 'ID không hợp lệ', 'VALIDATION_ERROR', 400);
		const { name, description, image_url: imageUrl, items } = req.body || {};
		await sequelize.transaction(async (t) => {
			const sets = [];
			const params = [];
			if (name !== undefined) { sets.push('name = ?'); params.push(name); }
			if (description !== undefined) { sets.push('description = ?'); params.push(description); }
			if (imageUrl !== undefined) { sets.push('image_url = ?'); params.push(imageUrl); }
			if (sets.length) {
				params.push(comboId);
				const [result, metadata] = await sequelize.query(`UPDATE equipment_combos SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, { replacements: params, transaction: t });
				if (!getAffectedRows(result, metadata)) throw new Error('NOT_FOUND');
			}
			if (Array.isArray(items)) {
				await saveItems(comboId, items, t);
			}
		});
		return ok(res, { id: comboId }, 'Cập nhật combo thành công');
	} catch (e) {
		if (e?.message === 'NOT_FOUND') return fail(res, 'Không tìm thấy combo', 'NOT_FOUND', 404);
		if (e?.message === 'INVALID_ITEM') return fail(res, 'Danh sách thiết bị trong combo không hợp lệ', 'VALIDATION_ERROR', 400);
		return fail(res, 'Lỗi server khi cập nhật combo', 'INTERNAL_ERROR', 500);
	}
};

const remove = async (req, res) => {
	try {
		if (req.user?.role !== 'admin') return fail(res, 'Không đủ quyền', 'FORBIDDEN', 403);
		const comboId = Number(req.params.id);
		if (!comboId) return fail(res, 'ID không hợp lệ', 'VALIDATION_ERROR', 400);
		const [result, metadata] = await sequelize.query('DELETE FROM equipment_combos WHERE id = ?', { replacements: [comboId] });
		if (!getAffectedRows(result, metadata)) return fail(res, 'Không tìm thấy combo', 'NOT_FOUND', 404);
		await sequelize.query('DELETE FROM combo_items WHERE combo_id = ?', { replacements: [comboId] });
		return ok(res, { id: comboId }, 'Xóa combo thành công');
	} catch (e) {
		return fail(res, 'Lỗi server khi xóa combo', 'INTERNAL_ERROR', 500);
	}
};

const borrowCombo = async (req, res) => {
	try {
		const userId = req.user?.id;
		if (!userId) return fail(res, 'Bạn cần đăng nhập', 'AUTH_REQUIRED', 401);
		if (!isStudentOrAdmin(req)) return fail(res, 'Không đủ quyền', 'FORBIDDEN', 403);

		const comboId = Number(req.params.id);
		if (!comboId) return fail(res, 'ID không hợp lệ', 'VALIDATION_ERROR', 400);
		const { borrow_date: borrowDate, expected_return_date: returnDate, note } = req.body || {};
		if (!borrowDate || !returnDate) return fail(res, 'Thiếu ngày mượn/trả', 'VALIDATION_ERROR', 400);
		if (returnDate <= borrowDate) return fail(res, 'Ngày trả phải sau ngày mượn', 'VALIDATION_ERROR', 400);

		const [comboRows] = await sequelize.query('SELECT id, name FROM equipment_combos WHERE id = ? LIMIT 1', { replacements: [comboId] });
		if (!comboRows.length) return fail(res, 'Không tìm thấy combo', 'NOT_FOUND', 404);
		const [items] = await sequelize.query(
			`SELECT equipment_id, quantity FROM combo_items WHERE combo_id = ? ORDER BY id ASC`,
			{ replacements: [comboId] }
		);
		if (!items.length) return fail(res, 'Combo chưa có thiết bị', 'VALIDATION_ERROR', 400);

		const createdId = await sequelize.transaction(async (t) => {
			const [inserted, metadata] = await sequelize.query(
				`INSERT INTO borrow_requests (user_id, borrow_date, expected_return_date, status, note, created_at, updated_at)
				 VALUES (?, ?, ?, 'pending', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
				{ replacements: [userId, borrowDate, returnDate, note || `Mượn combo ${comboRows[0].name}`], transaction: t }
			);
			const requestId = getInsertedId(inserted, metadata);
			for (const item of items) {
				// eslint-disable-next-line no-await-in-loop
				await sequelize.query(
					'INSERT INTO borrow_items (request_id, equipment_id, quantity) VALUES (?, ?, ?)',
					{ replacements: [requestId, item.equipment_id, item.quantity], transaction: t }
				);
			}
			return requestId;
		});

		return ok(res, { id: createdId, status: 'pending' }, 'Tạo yêu cầu mượn từ combo thành công', 201);
	} catch (e) {
		return fail(res, 'Lỗi server khi mượn combo', 'INTERNAL_ERROR', 500);
	}
};

module.exports = { getAll, getOne, create, update, remove, borrowCombo };