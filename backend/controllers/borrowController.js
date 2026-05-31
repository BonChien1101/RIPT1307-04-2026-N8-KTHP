const sequelize = require('../config/database');
const { ok, fail } = require('../utils/response');

// Trạng thái :
// pending -> approved | rejected
// approved -> borrowed (ghi nhận đã lấy thiết bị, trừ kho)
// borrowed -> returned (ghi nhận đã trả, cộng kho)

const taoYeuCau = async (req, res) => {
	try {
		// Debug input để đối chiếu với FE khi deploy Render
		// eslint-disable-next-line no-console
		console.log('BODY =', req.body);
		// eslint-disable-next-line no-console
		console.log('PARAMS =', req.params);
		// eslint-disable-next-line no-console
		console.log('USER =', req.user);

		const nguoiDungId = req.user?.id;
		if (!nguoiDungId) return fail(res, 'Bạn cần đăng nhập', 'AUTH_REQUIRED', 401);

		const { borrow_date: borrowDate, expected_return_date: returnDate, note, items } = req.body || {};
		if (!borrowDate || !returnDate || !Array.isArray(items) || items.length === 0) {
			return fail(
				res,
				'Thiếu dữ liệu yêu cầu mượn',
				'VALIDATION_ERROR',
				400,
				[
					...(!borrowDate ? [{ field: 'borrow_date', message: 'borrow_date là bắt buộc' }] : []),
					...(!returnDate ? [{ field: 'expected_return_date', message: 'expected_return_date là bắt buộc' }] : []),
					...(!Array.isArray(items) || items.length === 0
						? [{ field: 'items', message: 'items phải là mảng và không được rỗng' }]
						: []),
				]
			);
		}

		// Validate tối thiểu để tránh rollback mù: item thiếu equipment_id/quantity, hoặc date format sai.
		// MySQL DATE thường nhận 'YYYY-MM-DD'.
		if (!/^\d{4}-\d{2}-\d{2}$/.test(String(borrowDate)) || !/^\d{4}-\d{2}-\d{2}$/.test(String(returnDate))) {
			return fail(res, 'Ngày mượn/trả không hợp lệ (YYYY-MM-DD)', 'VALIDATION_ERROR', 400);
		}
		for (const it of items) {
			const equipmentId = Number(it?.equipment_id);
			const quantity = Number(it?.quantity);
			if (!equipmentId || !Number.isFinite(quantity) || quantity <= 0) {
				return fail(res, 'Danh sách thiết bị không hợp lệ', 'VALIDATION_ERROR', 400, [
					{ field: 'items', message: 'Mỗi item cần equipment_id (number) và quantity > 0' },
				]);
			}
		}

		const ketQua = await sequelize.transaction(async (t) => {
			const rqReplacements = [nguoiDungId, borrowDate, returnDate, note ?? null];
			// eslint-disable-next-line no-console
			console.log('[borrow_requests.insert] replacements =', rqReplacements);

			const [rq] = await sequelize.query(
				`INSERT INTO borrow_requests (user_id, borrow_date, expected_return_date, status, note, created_at, updated_at)
				 VALUES (?, ?, ?, 'pending', ?, NOW(), NOW())`,
				{ replacements: rqReplacements, transaction: t }
			);

			const requestId = rq.insertId;
			for (const item of items) {
				const thietBiId = Number(item?.equipment_id);
				const soLuong = Number(item?.quantity || 1);
				if (!thietBiId || !Number.isFinite(soLuong) || soLuong <= 0) {
					throw new Error('INVALID_ITEM');
				}

				const itemReplacements = [requestId, thietBiId, soLuong];
				// eslint-disable-next-line no-console
				console.log('[borrow_items.insert] replacements =', itemReplacements);

				await sequelize.query(
					`INSERT INTO borrow_items (request_id, equipment_id, quantity)
					 VALUES (?, ?, ?)`,
					{ replacements: itemReplacements, transaction: t }
				);
			}

			return { requestId };
		});

		return ok(res, { id: ketQua.requestId, status: 'pending' }, 'Tạo yêu cầu mượn thành công', 201);
	} catch (e) {
		// Log chi tiết để debug trên Render (rollback trong transaction thường do lỗi insert borrow_items / FK constraint)
		// eslint-disable-next-line no-console
		console.error('[borrowController.taoYeuCau] error.message:', e?.message);
		// eslint-disable-next-line no-console
		console.error('[borrowController.taoYeuCau] error.stack:', e?.stack);
		// eslint-disable-next-line no-console
		console.error('[borrowController.taoYeuCau] sequelize/original:', e?.original || e);

		// Lỗi positional replacement: replacements thiếu phần tử (thường do biến undefined)
		if (String(e?.message || '').includes('Positional replacement (?)')) {
			return fail(res, 'Dữ liệu gửi lên không hợp lệ/thiếu, vui lòng kiểm tra lại payload', 'VALIDATION_ERROR', 400);
		}

		if (e?.message === 'INVALID_ITEM') {
			return fail(res, 'Danh sách thiết bị không hợp lệ', 'VALIDATION_ERROR', 400);
		}
		// MySQL FK violation
		if (e?.original?.code === 'ER_NO_REFERENCED_ROW_2') {
			return fail(res, 'Thiết bị không tồn tại hoặc user không hợp lệ', 'CONFLICT', 409);
		}
		// Invalid DATE
		if (e?.original?.code === 'ER_TRUNCATED_WRONG_VALUE') {
			return fail(res, 'Ngày mượn/trả không hợp lệ', 'VALIDATION_ERROR', 400);
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

const danhSachAdmin = async (req, res) => {
	// Trả toàn bộ requests (admin) để khớp docs /api/borrow-requests
	try {
		const { status, from, to } = req.query || {};
		const where = [];
		const params = [];
		if (status) {
			where.push('status = ?');
			params.push(status);
		}
		if (from) {
			where.push('borrow_date >= ?');
			params.push(from);
		}
		if (to) {
			where.push('borrow_date <= ?');
			params.push(to);
		}
		const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
		const [rows] = await sequelize.query(
			`SELECT id, user_id, borrow_date, expected_return_date, actual_return_date, status, approved_by, note, created_at, updated_at
			 FROM borrow_requests ${whereSql}
			 ORDER BY id DESC`,
			{ replacements: params }
		);
		return ok(res, rows, 'OK');
	} catch (e) {
		return fail(res, 'Lỗi server khi lấy danh sách yêu cầu', 'INTERNAL_ERROR', 500);
	}
};

const chiTiet = async (req, res) => {
	try {
		const requestId = Number(req.params.id);
		if (!requestId) return fail(res, 'ID yêu cầu không hợp lệ', 'VALIDATION_ERROR', 400);
		const [rows] = await sequelize.query(
			`SELECT id, user_id, borrow_date, expected_return_date, actual_return_date, status, approved_by, note, created_at, updated_at
			 FROM borrow_requests WHERE id = ? LIMIT 1`,
			{ replacements: [requestId] }
		);
		const request = rows?.[0];
		if (!request) return fail(res, 'Không tìm thấy yêu cầu mượn', 'NOT_FOUND', 404);
		const [items] = await sequelize.query(
			`SELECT id, request_id, equipment_id, quantity, created_at FROM borrow_items WHERE request_id = ? ORDER BY id ASC`,
			{ replacements: [requestId] }
		);
		return ok(res, { ...request, items }, 'OK');
	} catch (e) {
		return fail(res, 'Lỗi server khi lấy chi tiết yêu cầu', 'INTERNAL_ERROR', 500);
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
			 SET status = 'approved', approved_by = ?, updated_at = NOW()
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
		const { reason, note } = req.body || {};

		const [result] = await sequelize.query(
			`UPDATE borrow_requests
			 SET status = 'rejected', approved_by = ?, note = ?, updated_at = NOW()
			 WHERE id = ? AND status = 'pending'`,
			{ replacements: [nguoiDuyetId, note || reason || null, requestId] }
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
				`UPDATE borrow_requests SET status = 'borrowed', updated_at = NOW() WHERE id = ?`,
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
				`UPDATE borrow_requests SET status = 'returned', actual_return_date = CURDATE(), updated_at = NOW() WHERE id = ?`,
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
	danhSachAdmin,
	chiTiet,
	duyet,
	tuChoi,
	ghiNhanDaMuon,
	ghiNhanDaTra,
};
