// GET /equipments
// GET /equipments/:id
// POST /equipments
// PUT /equipments/:id
// DELETE /equipments/:id

const sequelize = require('../config/database');
const { ok, fail } = require('../utils/response');
const { getInsertedId, getAffectedRows } = require('../utils/sqlCompat');

let equipmentColumnCache = null;

const getEquipmentColumns = async () => {
	if (equipmentColumnCache) return equipmentColumnCache;
	const tableInfo = await sequelize.getQueryInterface().describeTable('equipments');
	equipmentColumnCache = new Set(Object.keys(tableInfo));
	return equipmentColumnCache;
};

// Đặt lại cache khi thêm/sửa thiết bị (để nhận cột mới)
const invalidateColumnCache = () => {
	equipmentColumnCache = null;
};

const resolveCategoryId = async (categoryName, transaction) => {
	const name = String(categoryName || '').trim();
	if (!name) return null;
	const [rows] = await sequelize.query(
		`SELECT id FROM categories WHERE name = ? LIMIT 1`,
		{ replacements: [name], transaction }
	);
	if (rows && rows.length) return rows[0].id;
	const [result, metadata] = await sequelize.query(
		`INSERT INTO categories (name) VALUES (?)`,
		{ replacements: [name], transaction }
	);
	return getInsertedId(result, metadata);
};

const equipmentImageSelect = `COALESCE(
	NULLIF(e.image_url, ''),
	(
		SELECT ei.url
		FROM equipment_images ei
		WHERE ei.equipment_id = e.id
		ORDER BY ei.is_primary DESC, ei.id ASC
		LIMIT 1
	)
) AS image_url`;

const defaultEquipmentImages = [
	{
		keywords: ['camera', 'media', 'may anh', 'may quay', 'canon', 'sony'],
		url: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1200&q=80',
	},
	{
		keywords: ['audio', 'micro', 'loa', 'am thanh', 'mixer'],
		url: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=1200&q=80',
	},
	{
		keywords: ['presentation', 'projector', 'may chieu', 'trinh chieu'],
		url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
	},
	{
		keywords: ['computer', 'laptop', 'may tinh'],
		url: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=1200&q=80',
	},
	{
		keywords: ['tripod', 'gimbal', 'phu kien', 'chan may'],
		url: 'https://images.unsplash.com/photo-1519638831568-d9897f54ed69?auto=format&fit=crop&w=1200&q=80',
	},
];

const normalizeSearchText = (value) => String(value || '')
	.toLowerCase()
	.normalize('NFD')
	.replace(/[\u0300-\u036f]/g, '');

const isAbsoluteUrl = (url) => /^https?:\/\//i.test(url) || /^data:/i.test(url) || /^blob:/i.test(url);

const apiOrigin = (req) => `${req.protocol}://${req.get('host')}`;

const resolveImageUrl = (req, row) => {
	const raw = String(row.image_url || '').trim();
	if (raw) {
		if (isAbsoluteUrl(raw)) return raw;
		if (raw.startsWith('/')) return `${apiOrigin(req)}${raw}`;
		return `${apiOrigin(req)}/${raw.replace(/^\/+/, '')}`;
	}

	const haystack = normalizeSearchText([row.name, row.category, row.description].filter(Boolean).join(' '));
	const match = defaultEquipmentImages.find((item) => item.keywords.some((keyword) => haystack.includes(keyword)));
	return (match || defaultEquipmentImages[0]).url;
};

const attachDisplayImage = (req, row) => ({
	...row,
	image_url: resolveImageUrl(req, row),
});

// ============================================================
// DANH SÁCH THIẾT BỊ
// ============================================================
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

		// Thêm cột mới: storage_location, condition_status, max_borrow_days
		const extraCols = [
			columns.has('storage_location') ? 'e.storage_location' : null,
			columns.has('condition_status') ? 'e.condition_status' : null,
			columns.has('max_borrow_days') ? 'e.max_borrow_days' : null,
		].filter(Boolean).join(', ');
		const extraSelect = extraCols ? `, ${extraCols}` : '';

		const [rows] = await sequelize.query(
			`SELECT e.id, e.name, ${categorySelect}, e.description, e.total_quantity, e.available_quantity,
		        ${equipmentImageSelect}, e.status, e.created_at, e.updated_at${extraSelect}
			 FROM equipments e ${categoryJoin} ${whereSql}
			 ORDER BY e.id DESC`,
			{ replacements: thamSo }
		);
		return ok(res, rows.map((row) => attachDisplayImage(req, row)), 'OK');
	} catch (e) {
		return fail(res, 'Lỗi server', 'INTERNAL_ERROR', 500);
	}
};

// ============================================================
// CHI TIẾT THIẾT BỊ
// ============================================================
const chiTiet = async (req, res) => {
	try {
		const thietBiId = Number(req.params.id);
		if (!thietBiId) return fail(res, 'ID không hợp lệ', 'VALIDATION_ERROR', 400);
		const columns = await getEquipmentColumns();
		const categorySelect = columns.has('category_id')
			? 'e.category_id, COALESCE(c.name, e.category) AS category'
			: 'e.category';
		const categoryJoin = columns.has('category_id') ? 'LEFT JOIN categories c ON c.id = e.category_id' : '';

		// Thêm cột mới: storage_location, condition_status, max_borrow_days
		const extraCols = [
			columns.has('storage_location') ? 'e.storage_location' : null,
			columns.has('condition_status') ? 'e.condition_status' : null,
			columns.has('max_borrow_days') ? 'e.max_borrow_days' : null,
		].filter(Boolean).join(', ');
		const extraSelect = extraCols ? `, ${extraCols}` : '';

		const [rows] = await sequelize.query(
			`SELECT e.id, e.name, ${categorySelect}, e.description, e.total_quantity, e.available_quantity,
		        ${equipmentImageSelect}, e.status, e.created_at, e.updated_at${extraSelect}
			 FROM equipments e ${categoryJoin} WHERE e.id = ? LIMIT 1`,
			{ replacements: [thietBiId] }
		);
		const thietBi = rows && rows[0];
		if (!thietBi) return fail(res, 'Không tìm thấy thiết bị', 'NOT_FOUND', 404);
		return ok(res, attachDisplayImage(req, thietBi), 'OK');
	} catch (e) {
		return fail(res, 'Lỗi server', 'INTERNAL_ERROR', 500);
	}
};

// ============================================================
// TẠO THIẾT BỊ MỚI
// ============================================================
const taoMoi = async (req, res) => {
	try {
		const {
			name, category, description, total_quantity, available_quantity, image_url, status,
			storage_location, max_borrow_days, condition_status,
		} = req.body || {};
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

		// Xây dựng câu INSERT động tùy theo cột có tồn tại
		const insertCols = [];
		const insertVals = [];
		const insertPlaceholders = [];

		const addField = (col, val) => {
			insertCols.push(col);
			insertVals.push(val);
			insertPlaceholders.push('?');
		};

		addField('name', name);
		addField(useCategoryId ? 'category_id' : 'category', categoryValue || (useCategoryId ? null : (category || null)));
		addField('description', description || null);
		addField('total_quantity', tongSoLuong);
		addField('available_quantity', soLuongCon);
		addField('image_url', image_url || null);
		addField('status', status || 'available');

		if (columns.has('storage_location') && storage_location !== undefined) {
			addField('storage_location', storage_location || null);
		}
		if (columns.has('max_borrow_days') && max_borrow_days !== undefined) {
			addField('max_borrow_days', Number(max_borrow_days) || 14);
		}
		if (columns.has('condition_status') && condition_status !== undefined) {
			addField('condition_status', condition_status || null);
		}

		const insertSql = `INSERT INTO equipments (${insertCols.join(', ')}) VALUES (${insertPlaceholders.join(', ')})`;
		const [result, metadata] = await sequelize.query(insertSql, { replacements: insertVals });

		// Đặt lại cache để cột mới được nhận biết
		invalidateColumnCache();

		return ok(res, { id: getInsertedId(result, metadata) }, 'Tạo thiết bị thành công', 201);
	} catch (e) {
		return fail(res, 'Lỗi server', 'INTERNAL_ERROR', 500);
	}
};

// ============================================================
// CẬP NHẬT THIẾT BỊ
// ============================================================
const capNhat = async (req, res) => {
	try {
		const thietBiId = Number(req.params.id);
		if (!thietBiId) return fail(res, 'ID không hợp lệ', 'VALIDATION_ERROR', 400);
		const {
			name, category, description, total_quantity, available_quantity, image_url, status,
			storage_location, max_borrow_days, condition_status,
		} = req.body || {};
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

		// Cột mở rộng
		if (columns.has('storage_location') && storage_location !== undefined) them('storage_location = ?', storage_location || null);
		if (columns.has('max_borrow_days') && max_borrow_days !== undefined) them('max_borrow_days = ?', Number(max_borrow_days) || 14);
		if (columns.has('condition_status') && condition_status !== undefined) them('condition_status = ?', condition_status || null);

		if (!truongCapNhat.length) return fail(res, 'Không có dữ liệu để cập nhật', 'VALIDATION_ERROR', 400);
		thamSo.push(thietBiId);

		const [result, metadata] = await sequelize.query(
			`UPDATE equipments SET ${truongCapNhat.join(', ')} WHERE id = ?`,
			{ replacements: thamSo }
		);
		if (!getAffectedRows(result, metadata)) return fail(res, 'Không tìm thấy thiết bị', 'NOT_FOUND', 404);

		// Đặt lại cache
		invalidateColumnCache();

		return ok(res, { id: thietBiId }, 'Cập nhật thiết bị thành công');
	} catch (e) {
		return fail(res, 'Lỗi server', 'INTERNAL_ERROR', 500);
	}
};

// ============================================================
// XÓA THIẾT BỊ
// ============================================================
const xoa = async (req, res) => {
	try {
		const thietBiId = Number(req.params.id);
		if (!thietBiId) return fail(res, 'ID không hợp lệ', 'VALIDATION_ERROR', 400);
		const [result, metadata] = await sequelize.query('DELETE FROM equipments WHERE id = ?', { replacements: [thietBiId] });
		if (!getAffectedRows(result, metadata)) return fail(res, 'Không tìm thấy thiết bị', 'NOT_FOUND', 404);
		return ok(res, { id: thietBiId }, 'Xóa thiết bị thành công');
	} catch (e) {
		return fail(res, 'Không thể xóa thiết bị', 'CONFLICT', 409);
	}
};

module.exports = { danhSach, chiTiet, taoMoi, capNhat, xoa };
