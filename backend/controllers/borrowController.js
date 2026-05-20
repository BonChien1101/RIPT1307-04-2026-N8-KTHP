const sequelize = require('../config/database');
const { ok, fail } = require('../utils/response');

// Trạng thái :
// pending -> approved | rejected
// approved -> borrowed (ghi nhận đã lấy thiết bị, trừ kho)
// borrowed -> returned (ghi nhận đã trả, cộng kho)

const taoYeuCau = async (req, res) => {
	try {
		const nguoiDungId = req.user?.id;
		if (!nguoiDungId) return fail(res, 'Bạn cần đăng nhập', 'AUTH_REQUIRED', 401);

		const { borrowDate, returnDate, items } = req.body || {};
		if (!borrowDate || !returnDate || !Array.isArray(items) || items.length === 0) {
			return fail(res, 'Thiếu dữ liệu yêu cầu mượn', 'VALIDATION_ERROR', 400);
		}

		const ketQua = await sequelize.transaction(async (t) => {
			const [rq] = await sequelize.query(
				`INSERT INTO borrow_requests (user_id, borrow_date, expected_return_date, status, created_at, updated_at)
				 VALUES (?, ?, ?, 'pending', NOW(), NOW())`,
				{ replacements: [nguoiDungId, borrowDate, returnDate], transaction: t }
			);

			const requestId = rq.insertId;
			for (const item of items) {
				const thietBiId = Number(item?.equipmentId);
				const soLuong = Number(item?.quantity || 1);
				if (!thietBiId || !Number.isFinite(soLuong) || soLuong <= 0) {
					throw new Error('INVALID_ITEM');
				}

				await sequelize.query(
					`INSERT INTO borrow_items (request_id, equipment_id, quantity)
					 VALUES (?, ?, ?)`,
					{ replacements: [requestId, thietBiId, soLuong], transaction: t }
				);
			}

			return { requestId };
		});

		return ok(res, ketQua, 'Tạo yêu cầu mượn thành công', 201);
	} catch (e) {
		if (e?.message === 'INVALID_ITEM') {
			return fail(res, 'Danh sách thiết bị không hợp lệ', 'VALIDATION_ERROR', 400);
		}
		return fail(res, 'Lỗi server khi tạo yêu cầu mượn', 'INTERNAL_ERROR', 500);
	}
};

const lichSuCuaToi = async (req, res) => {
	try {
		const nguoiDungId = req.user?.id;
		if (!nguoiDungId) return fail(res, 'Bạn cần đăng nhập', 'AUTH_REQUIRED', 401);

		const [rows] = await sequelize.query(
			`SELECT id, user_id, borrow_date, expected_return_date, actual_return_date, status, approved_by, note, created_at, updated_at
			 FROM borrow_requests
			 WHERE user_id = ?
			 ORDER BY id DESC`,
			{ replacements: [nguoiDungId] }
		);

		return ok(res, rows, 'OK');
	} catch (e) {
		return fail(res, 'Lỗi server khi lấy lịch sử mượn', 'INTERNAL_ERROR', 500);
	}
};

const danhSachChoDuyet = async (req, res) => {
	try {
		const [rows] = await sequelize.query(
			`SELECT id, user_id, borrow_date, expected_return_date, actual_return_date, status, approved_by, note, created_at, updated_at
			 FROM borrow_requests
			 WHERE status = 'pending'
			 ORDER BY id DESC`
		);
		return ok(res, rows, 'OK');
	} catch (e) {
		return fail(res, 'Lỗi server khi lấy danh sách chờ duyệt', 'INTERNAL_ERROR', 500);
	}
};

const duyet = async (req, res) => {
	try {
		const nguoiDuyetId = req.user?.id;
		if (!nguoiDuyetId) return fail(res, 'Bạn cần đăng nhập', 'AUTH_REQUIRED', 401);

		const requestId = Number(req.params.id);
		if (!requestId) return fail(res, 'ID yêu cầu không hợp lệ', 'VALIDATION_ERROR', 400);

		const [result] = await sequelize.query(
			`UPDATE borrow_requests
			 SET status = 'approved', approved_by = ?, approved_at = NOW(), updated_at = NOW()
			 WHERE id = ? AND status = 'pending'`,
			{ replacements: [nguoiDuyetId, requestId] }
		);

		if (!result.affectedRows) {
			return fail(res, 'Không tìm thấy yêu cầu hoặc không ở trạng thái chờ duyệt', 'NOT_FOUND', 404);
		}
		return ok(res, { id: requestId }, 'Đã duyệt yêu cầu');
	} catch (e) {
		return fail(res, 'Lỗi server khi duyệt yêu cầu', 'INTERNAL_ERROR', 500);
	}
};

const tuChoi = async (req, res) => {
	try {
		const nguoiDuyetId = req.user?.id;
		if (!nguoiDuyetId) return fail(res, 'Bạn cần đăng nhập', 'AUTH_REQUIRED', 401);

		const requestId = Number(req.params.id);
		if (!requestId) return fail(res, 'ID yêu cầu không hợp lệ', 'VALIDATION_ERROR', 400);
		const { reason } = req.body || {};

		const [result] = await sequelize.query(
			`UPDATE borrow_requests
			 SET status = 'rejected', approved_by = ?, rejected_reason = ?, updated_at = NOW()
			 WHERE id = ? AND status = 'pending'`,
			{ replacements: [nguoiDuyetId, reason || null, requestId] }
		);

		if (!result.affectedRows) {
			return fail(res, 'Không tìm thấy yêu cầu hoặc không ở trạng thái chờ duyệt', 'NOT_FOUND', 404);
		}
		return ok(res, { id: requestId }, 'Đã từ chối yêu cầu');
	} catch (e) {
		return fail(res, 'Lỗi server khi từ chối yêu cầu', 'INTERNAL_ERROR', 500);
	}
};

const ghiNhanDaMuon = async (req, res) => {
	try {
		const requestId = Number(req.params.id);
		if (!requestId) return fail(res, 'ID yêu cầu không hợp lệ', 'VALIDATION_ERROR', 400);

		await sequelize.transaction(async (t) => {
			const [reqRows] = await sequelize.query(
				`SELECT status FROM borrow_requests WHERE id = ?`,
				{ replacements: [requestId], transaction: t }
			);
			if (!reqRows.length) throw new Error('REQUEST_NOT_FOUND');
			if (reqRows[0].status !== 'approved') throw new Error('INVALID_STATUS');

			const [items] = await sequelize.query(
				`SELECT equipment_id, quantity FROM borrow_items WHERE request_id = ?`,
				{ replacements: [requestId], transaction: t }
			);
			if (!items.length) throw new Error('REQUEST_NOT_FOUND');

			for (const it of items) {
				const [r] = await sequelize.query(
					`UPDATE equipments
					 SET available_quantity = available_quantity - ?
					 WHERE id = ? AND available_quantity >= ?`,
					{ replacements: [it.quantity, it.equipment_id, it.quantity], transaction: t }
				);
				if (!r.affectedRows) throw new Error('OUT_OF_STOCK');
			}

			await sequelize.query(
				`UPDATE borrow_requests
				 SET status = 'borrowed', borrowed_at = NOW(), updated_at = NOW()
				 WHERE id = ?`,
				{ replacements: [requestId], transaction: t }
			);
		});

		return ok(res, { id: requestId }, 'Đã ghi nhận mượn thiết bị');
	} catch (e) {
		if (e?.message === 'OUT_OF_STOCK') return fail(res, 'Không đủ số lượng thiết bị trong kho', 'OUT_OF_STOCK', 409);
		if (e?.message === 'INVALID_STATUS') return fail(res, 'Yêu cầu chưa ở trạng thái đã duyệt', 'INVALID_STATUS', 409);
		if (e?.message === 'REQUEST_NOT_FOUND') return fail(res, 'Không tìm thấy yêu cầu mượn', 'NOT_FOUND', 404);
		return fail(res, 'Lỗi server khi ghi nhận mượn', 'INTERNAL_ERROR', 500);
	}
};

const ghiNhanDaTra = async (req, res) => {
	try {
		const requestId = Number(req.params.id);
		if (!requestId) return fail(res, 'ID yêu cầu không hợp lệ', 'VALIDATION_ERROR', 400);

		await sequelize.transaction(async (t) => {
			const [reqRows] = await sequelize.query(
				`SELECT status FROM borrow_requests WHERE id = ?`,
				{ replacements: [requestId], transaction: t }
			);
			if (!reqRows.length) throw new Error('REQUEST_NOT_FOUND');
			if (reqRows[0].status !== 'borrowed') throw new Error('INVALID_STATUS');

			const [items] = await sequelize.query(
				`SELECT equipment_id, quantity FROM borrow_items WHERE request_id = ?`,
				{ replacements: [requestId], transaction: t }
			);
			if (!items.length) throw new Error('REQUEST_NOT_FOUND');

			for (const it of items) {
				await sequelize.query(
					`UPDATE equipments SET available_quantity = available_quantity + ? WHERE id = ?`,
					{ replacements: [it.quantity, it.equipment_id], transaction: t }
				);
			}

			await sequelize.query(
				`UPDATE borrow_requests
				 SET status = 'returned', returned_at = NOW(), updated_at = NOW()
				 WHERE id = ?`,
				{ replacements: [requestId], transaction: t }
			);
		});

		return ok(res, { id: requestId }, 'Đã ghi nhận trả thiết bị');
	} catch (e) {
		if (e?.message === 'INVALID_STATUS') return fail(res, 'Yêu cầu chưa ở trạng thái đang mượn', 'INVALID_STATUS', 409);
		if (e?.message === 'REQUEST_NOT_FOUND') return fail(res, 'Không tìm thấy yêu cầu mượn', 'NOT_FOUND', 404);
		return fail(res, 'Lỗi server khi ghi nhận trả', 'INTERNAL_ERROR', 500);
	}
};

module.exports = {
	taoYeuCau,
	lichSuCuaToi,
	danhSachChoDuyet,
	duyet,
	tuChoi,
	ghiNhanDaMuon,
	ghiNhanDaTra,
};
