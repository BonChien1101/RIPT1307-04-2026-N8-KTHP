// GET /equipments
// GET /equipments/:id
// POST /equipments
// PUT /equipments/:id
// DELETE /equipments/:id

const sequelize = require('../config/database');
const { QueryTypes } = require('sequelize');
const { ok, fail } = require('../utils/response');
const { getInsertedId, getAffectedRows } = require('../utils/sqlCompat');

let equipmentColumnCache = null;

const getEquipmentColumns = async () => {
	if (equipmentColumnCache) return equipmentColumnCache;
	const tableInfo = await sequelize.getQueryInterface().describeTable('equipments');
	equipmentColumnCache = new Set(Object.keys(tableInfo));
	return equipmentColumnCache;
};

const resolveCategoryId = async (categoryName, transaction) => {
	const name = String(categoryName || '').trim();
	if (!name) return null;
	const [rows] = await sequelize.query(
		`SELECT id FROM categories WHERE name = ? LIMIT 1`,
		{ replacements: [name], transaction }
	);
	if (rows?.length) return rows[0].id;
	const [result, metadata] = await sequelize.query(
		`INSERT INTO categories (name) VALUES (?)`,
		{ replacements: [name], transaction }
	);
	return getInsertedId(result, metadata);
};

const danhSach = async (req, res) => {
	try {
		const columns = await getEquipmentColumns();
		const { q, status, onlyAvailable } = req.query || {};
		const dieuKien = [];
		const thamSo = [];

		if (q) {
			dieuKien.push('e.name LIKE ?');
			thamSo.push(`%${q}%`);
		}
		if (status) {
			dieuKien.push('e.status = ?');
			thamSo.push(status);
		}
		if (String(onlyAvailable).toLowerCase() === 'true') {
			dieuKien.push('e.available_quantity > 0');
		}

		const whereSql = dieuKien.length ? `WHERE ${dieuKien.join(' AND ')}` : '';
		const categorySelect = columns.has('category_id')
			? 'e.category_id, COALESCE(c.name, e.category) AS category'
			: 'e.category';
		const categoryJoin = columns.has('category_id') ? 'LEFT JOIN categories c ON c.id = e.category_id' : '';
		const [rows] = await sequelize.query(
			`SELECT e.id, e.name, ${categorySelect}, e.description, e.total_quantity, e.available_quantity, e.image_url, e.status, e.created_at, e.updated_at
			 FROM equipments e ${categoryJoin} ${whereSql}
			 ORDER BY e.id DESC`,
			{ replacements: thamSo }
		);
		return ok(res, rows, 'OK');
	} catch (e) {
		return fail(res, 'Lỗi server', 'INTERNAL_ERROR', 500);
	}
};

const chiTiet = async (req, res) => {
	try {
		const thietBiId = Number(req.params.id);
		if (!thietBiId) return fail(res, 'ID không hợp lệ', 'VALIDATION_ERROR', 400);
		const columns = await getEquipmentColumns();
		const categorySelect = columns.has('category_id')
			? 'e.category_id, COALESCE(c.name, e.category) AS category'
			: 'e.category';
		const categoryJoin = columns.has('category_id') ? 'LEFT JOIN categories c ON c.id = e.category_id' : '';
		const [rows] = await sequelize.query(
			`SELECT e.id, e.name, ${categorySelect}, e.description, e.total_quantity, e.available_quantity, e.image_url, e.status, e.created_at, e.updated_at
			 FROM equipments e ${categoryJoin} WHERE e.id = ? LIMIT 1`,
			{ replacements: [thietBiId] }
		);
		const thietBi = rows?.[0];
		if (!thietBi) return fail(res, 'Không tìm thấy thiết bị', 'NOT_FOUND', 404);
		return ok(res, thietBi, 'OK');
	} catch (e) {
		return fail(res, 'Lỗi server', 'INTERNAL_ERROR', 500);
	}
};

const taoMoi = async (req, res) => {
	try {
		const { name, category, description, total_quantity, available_quantity, image_url, status } = req.body || {};
		const columns = await getEquipmentColumns();
		if (!name) return fail(res, 'Tên thiết bị là bắt buộc', 'VALIDATION_ERROR', 400, [{ field: 'name', message: 'Bắt buộc' }]);
		const tongSoLuong = Number(total_quantity);
		const soLuongCon = Number(available_quantity);
		if (!Number.isFinite(tongSoLuong) || !Number.isFinite(soLuongCon)) {
			return fail(res, 'Số lượng không hợp lệ', 'VALIDATION_ERROR', 400);
		}
		if (soLuongCon > tongSoLuong) return fail(res, 'available_quantity không được lớn hơn total_quantity', 'VALIDATION_ERROR', 400);

		const useCategoryId = columns.has('category_id');
		const categoryValue = useCategoryId ? await resolveCategoryId(category, null) : (category || null);
		const insertSql = useCategoryId
			? `INSERT INTO equipments (name, category_id, description, total_quantity, available_quantity, image_url, status)
			   VALUES (?, ?, ?, ?, ?, ?, ?)`
			: `INSERT INTO equipments (name, category, description, total_quantity, available_quantity, image_url, status)
			   VALUES (?, ?, ?, ?, ?, ?, ?)`;
		const replacements = useCategoryId
			? [name, categoryValue, description || null, tongSoLuong, soLuongCon, image_url || null, status || 'available']
			: [name, category || null, description || null, tongSoLuong, soLuongCon, image_url || null, status || 'available'];
		const [result, metadata] = await sequelize.query(insertSql, { replacements });
		return ok(res, { id: getInsertedId(result, metadata) }, 'Tạo thiết bị thành công', 201);
	} catch (e) {
		return fail(res, 'Lỗi server', 'INTERNAL_ERROR', 500);
	}
};

const capNhat = async (req, res) => {
	try {
		const thietBiId = Number(req.params.id);
		if (!thietBiId) return fail(res, 'ID không hợp lệ', 'VALIDATION_ERROR', 400);
		const { name, category, description, total_quantity, available_quantity, image_url, status } = req.body || {};
		const columns = await getEquipmentColumns();
		const tongSoLuong = total_quantity === undefined ? undefined : Number(total_quantity);
		const soLuongCon = available_quantity === undefined ? undefined : Number(available_quantity);
		if (tongSoLuong !== undefined && !Number.isFinite(tongSoLuong)) return fail(res, 'total_quantity không hợp lệ', 'VALIDATION_ERROR', 400);
		if (soLuongCon !== undefined && !Number.isFinite(soLuongCon)) return fail(res, 'available_quantity không hợp lệ', 'VALIDATION_ERROR', 400);
		if (tongSoLuong !== undefined && soLuongCon !== undefined && soLuongCon > tongSoLuong) {
			return fail(res, 'available_quantity không được lớn hơn total_quantity', 'VALIDATION_ERROR', 400);
		}

		const truongCapNhat = [];
		const thamSo = [];
		const them = (sql, val) => {
			truongCapNhat.push(sql);
			thamSo.push(val);
		};

		if (name !== undefined) them('name = ?', name);
		if (category !== undefined) {
			if (columns.has('category_id')) {
				const categoryId = await resolveCategoryId(category, null);
				them('category_id = ?', categoryId);
			} else {
				them('category = ?', category);
			}
		}
		if (description !== undefined) them('description = ?', description);
		if (tongSoLuong !== undefined) them('total_quantity = ?', tongSoLuong);
		if (soLuongCon !== undefined) them('available_quantity = ?', soLuongCon);
		if (image_url !== undefined) them('image_url = ?', image_url);
		if (status !== undefined) them('status = ?', status);

		if (!truongCapNhat.length) return fail(res, 'Không có dữ liệu để cập nhật', 'VALIDATION_ERROR', 400);
		thamSo.push(thietBiId);

		const [result, metadata] = await sequelize.query(
			`UPDATE equipments SET ${truongCapNhat.join(', ')} WHERE id = ?`,
			{ replacements: thamSo, type: QueryTypes.UPDATE }
		);
		if (!getAffectedRows(result, metadata)) return fail(res, 'Không tìm thấy thiết bị', 'NOT_FOUND', 404);
		return ok(res, { id: thietBiId }, 'Cập nhật thiết bị thành công');
	} catch (e) {
		return fail(res, 'Lỗi server', 'INTERNAL_ERROR', 500);
	}
};

const xoa = async (req, res) => {
	try {
		const thietBiId = Number(req.params.id);
		if (!thietBiId) return fail(res, 'ID không hợp lệ', 'VALIDATION_ERROR', 400);
		const [result, metadata] = await sequelize.query('DELETE FROM equipments WHERE id = ?', {
			replacements: [thietBiId],
			type: QueryTypes.DELETE,
		});
		if (!getAffectedRows(result, metadata)) return fail(res, 'Không tìm thấy thiết bị', 'NOT_FOUND', 404);
		return ok(res, { id: thietBiId }, 'Xóa thiết bị thành công');
	} catch (e) {
		return fail(res, 'Không thể xóa thiết bị', 'CONFLICT', 409);
	}
};

module.exports = { danhSach, chiTiet, taoMoi, capNhat, xoa };

