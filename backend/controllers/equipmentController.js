// GET /equipments
// GET /equipments/:id
// POST /equipments
// PUT /equipments/:id
// DELETE /equipments/:id

const sequelize = require('../config/database');
const { ok, fail } = require('../utils/response');

const danhSach = async (req, res) => {
	try {
		const { q, status, onlyAvailable } = req.query || {};
		const dieuKien = [];
		const thamSo = [];

		if (q) {
			dieuKien.push('name LIKE ?');
			thamSo.push(`%${q}%`);
		}
		if (status) {
			dieuKien.push('status = ?');
			thamSo.push(status);
		}
		if (String(onlyAvailable).toLowerCase() === 'true') {
			dieuKien.push('available_quantity > 0');
		}

		const whereSql = dieuKien.length ? `WHERE ${dieuKien.join(' AND ')}` : '';
		const [rows] = await sequelize.query(
			`SELECT id, name, category, description, total_quantity, available_quantity, image_url, status, created_at, updated_at
			 FROM equipments ${whereSql}
			 ORDER BY id DESC`,
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
		const [rows] = await sequelize.query(
			`SELECT id, name, category, description, total_quantity, available_quantity, image_url, status, created_at, updated_at
			 FROM equipments WHERE id = ? LIMIT 1`,
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
		if (!name) return fail(res, 'Tên thiết bị là bắt buộc', 'VALIDATION_ERROR', 400, [{ field: 'name', message: 'Bắt buộc' }]);
		const tongSoLuong = Number(total_quantity);
		const soLuongCon = Number(available_quantity);
		if (!Number.isFinite(tongSoLuong) || !Number.isFinite(soLuongCon)) {
			return fail(res, 'Số lượng không hợp lệ', 'VALIDATION_ERROR', 400);
		}
		if (soLuongCon > tongSoLuong) return fail(res, 'available_quantity không được lớn hơn total_quantity', 'VALIDATION_ERROR', 400);

		const [result] = await sequelize.query(
			`INSERT INTO equipments (name, category, description, total_quantity, available_quantity, image_url, status)
			 VALUES (?, ?, ?, ?, ?, ?, ?)`,
			{ replacements: [name, category || null, description || null, tongSoLuong, soLuongCon, image_url || null, status || 'available'] }
		);
		return ok(res, { id: result.insertId }, 'Tạo thiết bị thành công', 201);
	} catch (e) {
		return fail(res, 'Lỗi server', 'INTERNAL_ERROR', 500);
	}
};

const capNhat = async (req, res) => {
	try {
		const thietBiId = Number(req.params.id);
		if (!thietBiId) return fail(res, 'ID không hợp lệ', 'VALIDATION_ERROR', 400);
		const { name, category, description, total_quantity, available_quantity, image_url, status } = req.body || {};
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
		if (category !== undefined) them('category = ?', category);
		if (description !== undefined) them('description = ?', description);
		if (tongSoLuong !== undefined) them('total_quantity = ?', tongSoLuong);
		if (soLuongCon !== undefined) them('available_quantity = ?', soLuongCon);
		if (image_url !== undefined) them('image_url = ?', image_url);
		if (status !== undefined) them('status = ?', status);

		if (!truongCapNhat.length) return fail(res, 'Không có dữ liệu để cập nhật', 'VALIDATION_ERROR', 400);
		thamSo.push(thietBiId);

		const [result] = await sequelize.query(
			`UPDATE equipments SET ${truongCapNhat.join(', ')} WHERE id = ?`,
			{ replacements: thamSo }
		);
		if (!result.affectedRows) return fail(res, 'Không tìm thấy thiết bị', 'NOT_FOUND', 404);
		return ok(res, { id: thietBiId }, 'Cập nhật thiết bị thành công');
	} catch (e) {
		return fail(res, 'Lỗi server', 'INTERNAL_ERROR', 500);
	}
};

const xoa = async (req, res) => {
	try {
		const thietBiId = Number(req.params.id);
		if (!thietBiId) return fail(res, 'ID không hợp lệ', 'VALIDATION_ERROR', 400);
		const [result] = await sequelize.query('DELETE FROM equipments WHERE id = ?', { replacements: [thietBiId] });
		if (!result.affectedRows) return fail(res, 'Không tìm thấy thiết bị', 'NOT_FOUND', 404);
		return ok(res, { id: thietBiId }, 'Xóa thiết bị thành công');
	} catch (e) {
		return fail(res, 'Không thể xóa thiết bị', 'CONFLICT', 409);
	}
};

module.exports = { danhSach, chiTiet, taoMoi, capNhat, xoa };

