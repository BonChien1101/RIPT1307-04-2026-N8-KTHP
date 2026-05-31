const sequelize = require('../config/database');
const { ok, fail } = require('../utils/response');
const { getInsertedId, getAffectedRows } = require('../utils/sqlCompat');

const getCurrentDateSql = () => (sequelize.getDialect() === 'mysql' ? 'CURDATE()' : "DATE('now')");

const { QueryTypes } = require('sequelize');

const toPlainObject = (v) => {
	if (v == null) return v;
	try {
		return JSON.parse(JSON.stringify(v));
	} catch {
		return v;
	}
};

const extractInsertId = (rq) => {
	if (rq == null) return undefined;
	if (typeof rq === 'number') return rq;
	if (typeof rq?.insertId === 'number') return rq.insertId;
	if (typeof rq?.[0]?.insertId === 'number') return rq[0].insertId;
	if (typeof rq?.[0] === 'number') return rq[0];
	if (typeof rq?.[1]?.insertId === 'number') return rq[1].insertId;
	return undefined;
};

const taoYeuCau = async (req, res) => {
	try {
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

	
		if (!/^\d{4}-\d{2}-\d{2}$/.test(String(borrowDate)) || !/^\d{4}-\d{2}-\d{2}$/.test(String(returnDate))) {
			return fail(res, 'Ngày mượn/trả không hợp lệ (YYYY-MM-DD)', 'VALIDATION_ERROR', 400);
		}
		if (String(returnDate) < String(borrowDate)) {
			return fail(res, 'Ngày trả dự kiến phải bằng hoặc sau ngày mượn', 'VALIDATION_ERROR', 400, [
				{ field: 'expected_return_date', message: 'expected_return_date phải >= borrow_date' },
			]);
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

			let rq;
			try {
				rq = await sequelize.query(
					`INSERT INTO borrow_requests (user_id, borrow_date, expected_return_date, status, note, created_at, updated_at)
					 VALUES (?, ?, ?, 'pending', ?, NOW(), NOW())`,
					{ replacements: [nguoiDungId, borrowDate, returnDate, note ?? null], transaction: t, type: QueryTypes.INSERT }
				);
	
				console.log('[borrow_requests.insert] rq =', toPlainObject(rq));
			} catch (err) {
				console.error('[borrow_requests.insert] error =', err);
				throw err;
			}

			const requestId = extractInsertId(rq);
			if (!requestId) {
				const e = new Error('INSERT_REQUEST_FAILED');
				e.meta = { rq: toPlainObject(rq) };
				throw e;
			}

			for (const item of items) {
				const thietBiId = Number(item?.equipment_id);
				const soLuong = Number(item?.quantity || 1);
				if (!thietBiId || !Number.isFinite(soLuong) || soLuong <= 0) {
					throw new Error('INVALID_ITEM');
				}
				try {
					await sequelize.query(
						`INSERT INTO borrow_items (request_id, equipment_id, quantity)
						 VALUES (?, ?, ?)`,
						{ replacements: [requestId, thietBiId, soLuong], transaction: t, type: QueryTypes.INSERT }
					);
				} catch (err) {
					err.statement = 'INSERT_BORROW_ITEMS';
					err.replacements = [requestId, thietBiId, soLuong];
	
					console.error('[borrow_items.insert] error =', err);
					throw err;
				}
			}

			return { requestId };
		});

		return ok(res, { id: ketQua.requestId, status: 'pending' }, 'Tạo yêu cầu mượn thành công', 201);
	} catch (e) {
		if (e?.message === 'INSERT_REQUEST_FAILED') {
			return fail(res, 'Không thể tạo yêu cầu mượn', 'INTERNAL_ERROR', 500);
		}
		console.error('[borrowController.taoYeuCau] error =', e);

		console.error('[borrowController.taoYeuCau] error.message =', e?.message);

		console.error('[borrowController.taoYeuCau] error.stack =', e?.stack);

		console.error('[borrowController.taoYeuCau] error.original =', e?.original);
		if (e?.meta) {
	
			console.error('[borrowController.taoYeuCau] meta =', toPlainObject(e.meta));
		}
		if (e?.statement) {

			console.error('[borrowController.taoYeuCau] statement =', e.statement);
		}
		if (e?.replacements) {

			console.error('[borrowController.taoYeuCau] replacements =', e.replacements);
		}

		if (String(e?.message || '').includes('Positional replacement (?)')) {
			return fail(res, 'Dữ liệu gửi lên không hợp lệ/thiếu, vui lòng kiểm tra lại payload', 'VALIDATION_ERROR', 400);
		}

		if (e?.message === 'INVALID_ITEM') {
			return fail(res, 'Danh sách thiết bị không hợp lệ', 'VALIDATION_ERROR', 400);
		}
		if (e?.original?.code === 'ER_NO_REFERENCED_ROW_2') {
			return fail(res, 'Thiết bị không tồn tại', 'CONFLICT', 409);
		}
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

const updateBorrowRequestStatus = async ({ requestId, nguoiDuyetId, nextStatus, note = null }) => {
	const [currentRows] = await sequelize.query(
		`SELECT id, status FROM borrow_requests WHERE id = ? LIMIT 1`,
		{ replacements: [requestId] }
	);
	const currentRequest = currentRows?.[0];
	if (!currentRequest) return { found: false, updated: false };
	if (currentRequest.status === nextStatus) return { found: true, updated: true, status: currentRequest.status, noop: true };
	if (currentRequest.status !== 'pending') return { found: true, updated: false, status: currentRequest.status };

	if (nextStatus === 'approved') {
		await sequelize.query(
			`UPDATE borrow_requests
			 SET status = 'approved', approved_by = ?, updated_at = CURRENT_TIMESTAMP
			 WHERE id = ?`,
			{ replacements: [nguoiDuyetId, requestId] }
		);
	} else if (nextStatus === 'rejected') {
		await sequelize.query(
			`UPDATE borrow_requests
			 SET status = 'rejected', approved_by = ?, note = ?, updated_at = CURRENT_TIMESTAMP
			 WHERE id = ?`,
			{ replacements: [nguoiDuyetId, note, requestId] }
		);
	} else {
		throw new Error('UNSUPPORTED_STATUS');
	}

	const [afterRows] = await sequelize.query(
		`SELECT id, status FROM borrow_requests WHERE id = ? LIMIT 1`,
		{ replacements: [requestId] }
	);
	const updatedRequest = afterRows?.[0];
	return {
		found: true,
		updated: updatedRequest?.status === nextStatus,
		status: updatedRequest?.status,
	};
};

const duyet = async (req, res) => {
	try {
		const nguoiDuyetId = req.user?.id;
		if (!nguoiDuyetId) return fail(res, 'Bạn cần đăng nhập', 'AUTH_REQUIRED', 401);

		const requestId = Number(req.params.id);
		if (!requestId) return fail(res, 'ID yêu cầu không hợp lệ', 'VALIDATION_ERROR', 400);

		const result = await updateBorrowRequestStatus({
			requestId,
			nguoiDuyetId,
			nextStatus: 'approved',
		});

		if (!result.found) {
			return fail(res, 'Không tìm thấy yêu cầu hoặc không ở trạng thái chờ duyệt', 'NOT_FOUND', 404);
		}
		if (!result.updated) {
			return fail(res, 'Không thể duyệt yêu cầu', 'INTERNAL_ERROR', 500);
		}
		return ok(res, { id: requestId, noop: !!result.noop }, 'Đã duyệt yêu cầu');
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

		const result = await updateBorrowRequestStatus({
			requestId,
			nguoiDuyetId,
			nextStatus: 'rejected',
			note: note || reason || null,
		});

		if (!result.found) {
			return fail(res, 'Không tìm thấy yêu cầu hoặc không ở trạng thái chờ duyệt', 'NOT_FOUND', 404);
		}
		if (!result.updated) {
			return fail(res, 'Không thể từ chối yêu cầu', 'INTERNAL_ERROR', 500);
		}
		return ok(res, { id: requestId, noop: !!result.noop }, 'Đã từ chối yêu cầu');
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

				let r;
				try {
					[r] = await sequelize.query(
						`UPDATE equipments
						 SET available_quantity = available_quantity - ?
						 WHERE id = ? AND available_quantity >= ?`,
						{ replacements: [it.quantity, it.equipment_id, it.quantity], transaction: t }
					);
				} catch (err) {
					err.statement = 'UPDATE_EQUIPMENTS_DECREASE';
					err.replacements = [it.quantity, it.equipment_id, it.quantity];
					throw err;
				}
				if (!r.affectedRows) throw new Error('OUT_OF_STOCK');
			}

			try {
				await sequelize.query(
					`UPDATE borrow_requests SET status = 'borrowed', updated_at = NOW() WHERE id = ?`,
					{ replacements: [requestId], transaction: t }
				);
			} catch (err) {
				err.statement = 'UPDATE_BORROW_REQUESTS_STATUS';
				err.replacements = [requestId];
				throw err;
			}
		});

		return ok(res, { id: requestId }, 'Đã ghi nhận mượn thiết bị');
	} catch (e) {
		console.error('[borrowController.ghiNhanDaMuon] error =', e);
	
		console.error('[borrowController.ghiNhanDaMuon] error.message =', e?.message);
		console.error('[borrowController.ghiNhanDaMuon] error.stack =', e?.stack);
	
		console.error('[borrowController.ghiNhanDaMuon] error.original =', e?.original);
		if (e?.statement) {p

			console.error('[borrowController.ghiNhanDaMuon] statement =', e.statement);
		}
		if (e?.replacements) {
			console.error('[borrowController.ghiNhanDaMuon] replacements =', e.replacements);
		}
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

		let borrowUserId = null;
		let isLate = false;

		await sequelize.transaction(async (t) => {
			const [reqRows] = await sequelize.query(
				`SELECT id, user_id, status, expected_return_date FROM borrow_requests WHERE id = ?`,
				{ replacements: [requestId], transaction: t }
			);
			if (!reqRows.length) throw new Error('REQUEST_NOT_FOUND');
			if (reqRows[0].status !== 'borrowed') throw new Error('INVALID_STATUS');

			borrowUserId = reqRows[0].user_id;
			const expectedDate = reqRows[0].expected_return_date;
			const today = new Date().toISOString().slice(0, 10);
			isLate = expectedDate && today > expectedDate;

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
				`UPDATE borrow_requests SET status = 'returned', actual_return_date = ${getCurrentDateSql()}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
				{ replacements: [requestId], transaction: t }
			);
		});

		// Post-return side effects (non-critical, run after transaction)
		if (borrowUserId) {
			try {
				const { calculateOverdue } = require('./penaltyController');
				const { updateTrustScore } = require('./trustController');

				const penalty = await calculateOverdue(requestId);
				if (penalty > 0) {
					// Late return: reduce trust score
					await updateTrustScore(borrowUserId, -20, 'Trả thiết bị trễ hạn');
				} else {
					// On time: small trust boost
					await updateTrustScore(borrowUserId, 5, 'Trả thiết bị đúng hạn');
				}
			} catch (sideErr) {
				console.error('Post-return side effects error:', sideErr.message);
			}
		}

		return ok(res, { id: requestId }, 'Đã ghi nhận trả thiết bị');
	} catch (e) {
		if (e?.message === 'INVALID_STATUS') return fail(res, 'Yêu cầu chưa ở trạng thái đang mượn', 'INVALID_STATUS', 409);
		if (e?.message === 'REQUEST_NOT_FOUND') return fail(res, 'Không tìm thấy yêu cầu mượn', 'NOT_FOUND', 404);
		return fail(res, 'Lỗi server khi ghi nhận trả', 'INTERNAL_ERROR', 500);
	}
};

const smartApprove = async (req, res) => {
	try {
		const adminId = req.user?.id;
		if (req.user?.role !== 'admin') return fail(res, 'Không có quyền', 'FORBIDDEN', 403);

		const requestId = Number(req.params.id);
		if (!requestId) return fail(res, 'ID yêu cầu không hợp lệ', 'VALIDATION_ERROR', 400);

		// Fetch the request
		const [reqRows] = await sequelize.query(
			`SELECT br.id, br.user_id, br.borrow_date, br.expected_return_date, br.status
			 FROM borrow_requests br WHERE br.id = ? LIMIT 1`,
			{ replacements: [requestId] }
		);
		if (!reqRows.length) return fail(res, 'Không tìm thấy yêu cầu mượn', 'NOT_FOUND', 404);
		const borrowReq = reqRows[0];

		if (borrowReq.status !== 'pending') {
			return ok(res, { auto_approved: false, reason: 'Yêu cầu không ở trạng thái chờ duyệt' });
		}

		// Check 1: user trust score > 80
		const [userRows] = await sequelize.query(
			'SELECT trust_score, is_banned FROM users WHERE id = ? LIMIT 1',
			{ replacements: [borrowReq.user_id] }
		);
		const user = userRows?.[0];
		if (!user || (user.trust_score ?? 100) <= 80) {
			return ok(res, { auto_approved: false, reason: 'Điểm tin cậy của người dùng không đủ (cần > 80)' });
		}
		if (user.is_banned) {
			return ok(res, { auto_approved: false, reason: 'Người dùng đang bị cấm' });
		}

		// Check 2: all equipment has available_quantity > 0
		const [items] = await sequelize.query(
			`SELECT bi.equipment_id, bi.quantity, e.available_quantity, e.name
			 FROM borrow_items bi JOIN equipments e ON e.id = bi.equipment_id
			 WHERE bi.request_id = ?`,
			{ replacements: [requestId] }
		);
		for (const item of items) {
			if (item.available_quantity < item.quantity) {
				return ok(res, {
					auto_approved: false,
					reason: `Thiết bị "${item.name}" không đủ số lượng (cần ${item.quantity}, có ${item.available_quantity})`,
				});
			}
		}

		// Check 3: no date conflict for the same equipment
		for (const item of items) {
			const [conflicts] = await sequelize.query(
				`SELECT COUNT(*) as cnt FROM borrow_items bi
				 JOIN borrow_requests br ON br.id = bi.request_id
				 WHERE bi.equipment_id = ?
				   AND br.id != ?
				   AND br.status IN ('approved', 'borrowed')
				   AND br.borrow_date <= ? AND br.expected_return_date >= ?`,
				{ replacements: [item.equipment_id, requestId, borrowReq.expected_return_date, borrowReq.borrow_date] }
			);
			if (conflicts[0]?.cnt > 0) {
				return ok(res, {
					auto_approved: false,
					reason: `Thiết bị "${item.name}" đã có lịch mượn trùng trong khoảng thời gian này`,
				});
			}
		}

		// All checks passed — auto approve
		await sequelize.query(
			`UPDATE borrow_requests SET status = 'approved', approved_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'pending'`,
			{ replacements: [adminId, requestId] }
		);

		return ok(res, { auto_approved: true, reason: 'AUTO_APPROVED: Tất cả điều kiện đều hợp lệ' });
	} catch (e) {
		return fail(res, 'Lỗi server khi tự động duyệt', 'INTERNAL_ERROR', 500);
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
	smartApprove,
};

