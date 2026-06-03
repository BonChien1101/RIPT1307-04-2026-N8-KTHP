const sequelize = require('../config/database');
const { ok, fail } = require('../utils/response');
const { getInsertedId, getAffectedRows } = require('../utils/sqlCompat');
const socketManager = require('../socket');

const getCurrentDateSql = () => (sequelize.getDialect() === 'mysql' ? 'CURDATE()' : "DATE('now')");

const pushUserNotification = async (userId, title, message, type = 'borrow') => {
	if (!userId) return;
	try {
		await sequelize.query(
			`INSERT INTO notifications (user_id, title, message, is_read, created_at)
			 VALUES (?, ?, ?, 0, CURRENT_TIMESTAMP)`,
			{ replacements: [userId, title, message] }
		);
		socketManager.emitToUser(userId, 'notification', {
			id: Date.now(),
			title,
			message,
			type,
			is_read: false,
			created_at: new Date().toISOString(),
		});
	} catch (e) {
		console.error('pushUserNotification error:', e.message);
	}
};

// Trạng thái:
// pending -> approved | rejected
// approved -> borrowed (ghi nhận đã lấy thiết bị, trừ kho)
// borrowed -> returned (ghi nhận đã trả, cộng kho)
// borrowed -> overdue (tự động bởi cron nếu quá hạn)

// ============================================================
// TẠO YÊU CẦU MƯỢN
// ============================================================
const taoYeuCau = async (req, res) => {
	try {
		const nguoiDungId = req.user && req.user.id;
		if (!nguoiDungId) return fail(res, 'Bạn cần đăng nhập', 'AUTH_REQUIRED', 401);

		const { borrow_date: borrowDate, expected_return_date: returnDate, note, items } = req.body || {};
		if (!borrowDate || !returnDate || !Array.isArray(items) || items.length === 0) {
			return fail(res, 'Thiếu dữ liệu yêu cầu mượn', 'VALIDATION_ERROR', 400);
		}

		// Validate ngày mượn/trả
		const today = new Date().toISOString().slice(0, 10);
		if (borrowDate < today) return fail(res, 'Ngày mượn không thể là ngày trong quá khứ', 'VALIDATION_ERROR', 400);
		if (returnDate <= borrowDate) return fail(res, 'Ngày trả phải sau ngày mượn', 'VALIDATION_ERROR', 400);
		const daysDiff = Math.ceil((new Date(returnDate) - new Date(borrowDate)) / (1000 * 60 * 60 * 24));
		if (daysDiff > 30) return fail(res, 'Thời gian mượn tối đa là 30 ngày', 'VALIDATION_ERROR', 400);

		// Kiểm tra tài khoản bị khóa
		const [userRows] = await sequelize.query(
			'SELECT is_banned, banned_until FROM users WHERE id = ? LIMIT 1',
			{ replacements: [nguoiDungId] }
		);
		const userInfo = userRows && userRows[0];
		if (userInfo && userInfo.is_banned) {
			const bannedUntil = userInfo.banned_until
				? new Date(userInfo.banned_until).toLocaleDateString('vi-VN')
				: 'không xác định';
			return fail(res, `Tài khoản của bạn đang bị tạm khóa đến ${bannedUntil}`, 'ACCOUNT_BANNED', 403);
		}

		const ketQua = await sequelize.transaction(async (t) => {
			const [rq, rqMeta] = await sequelize.query(
				`INSERT INTO borrow_requests (user_id, borrow_date, expected_return_date, status, note, created_at, updated_at)
				 VALUES (?, ?, ?, 'pending', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
				{ replacements: [nguoiDungId, borrowDate, returnDate, note || null], transaction: t }
			);

			const requestId = getInsertedId(rq, rqMeta);
			for (const item of items) {
				const thietBiId = Number(item && item.equipment_id);
				const soLuong = Number((item && item.quantity) || 1);
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

		return ok(res, { id: ketQua.requestId, status: 'pending' }, 'Tạo yêu cầu mượn thành công', 201);
	} catch (e) {
		if (e && e.message === 'INVALID_ITEM') {
			return fail(res, 'Danh sách thiết bị không hợp lệ', 'VALIDATION_ERROR', 400);
		}
		return fail(res, 'Lỗi server khi tạo yêu cầu mượn', 'INTERNAL_ERROR', 500);
	}
};

// ============================================================
// LỊCH SỬ CỦA TÔI - JOIN items và tên thiết bị
// ============================================================
const lichSuCuaToi = async (req, res) => {
	try {
		const nguoiDungId = req.user && req.user.id;
		if (!nguoiDungId) return fail(res, 'Bạn cần đăng nhập', 'AUTH_REQUIRED', 401);

		const [rows] = await sequelize.query(
			`SELECT br.id, br.user_id, br.borrow_date, br.expected_return_date, br.actual_return_date,
			        br.status, br.approved_by, br.note, br.created_at, br.updated_at,
			        br.club_status, br.club_approved_at,
			        (SELECT GROUP_CONCAT(e.name || ' (x' || bi2.quantity || ')', ', ')
			         FROM borrow_items bi2 JOIN equipments e ON e.id = bi2.equipment_id
			         WHERE bi2.request_id = br.id) AS equipment_names,
			        (SELECT json_group_array(json_object('equipment_id', bi3.equipment_id, 'equipment_name', e3.name, 'quantity', bi3.quantity))
			         FROM borrow_items bi3 JOIN equipments e3 ON e3.id = bi3.equipment_id
			         WHERE bi3.request_id = br.id) AS items_json
			 FROM borrow_requests br
			 WHERE br.user_id = ?
			 ORDER BY br.id DESC`,
			{ replacements: [nguoiDungId] }
		);

		// Parse items_json từ chuỗi JSON sang mảng object
		const result = rows.map(r => ({
			...r,
			items: r.items_json ? JSON.parse(r.items_json) : [],
		}));
		return ok(res, result, 'OK');
	} catch (e) {
		return fail(res, 'Lỗi server khi lấy lịch sử mượn', 'INTERNAL_ERROR', 500);
	}
};

// ============================================================
// DANH SÁCH CHỜ DUYỆT - JOIN user info + tên thiết bị
// ============================================================
const danhSachChoDuyet = async (req, res) => {
	try {
		const [rows] = await sequelize.query(
			`SELECT br.id, br.user_id, br.borrow_date, br.expected_return_date, br.actual_return_date,
			        br.status, br.approved_by, br.note, br.created_at, br.updated_at,
			        br.club_id, br.club_status, br.club_approved_by, br.club_approved_at,
			        u.full_name, u.email, u.student_code, u.trust_score, u.trust_rank,
			        (SELECT GROUP_CONCAT(e.name || ' (x' || bi2.quantity || ')', ', ')
			         FROM borrow_items bi2 JOIN equipments e ON e.id = bi2.equipment_id
			         WHERE bi2.request_id = br.id) AS equipment_names
			 FROM borrow_requests br
			 LEFT JOIN users u ON u.id = br.user_id
			 WHERE br.status = 'pending'
			 ORDER BY br.id DESC`
		);
		return ok(res, rows, 'OK');
	} catch (e) {
		return fail(res, 'Lỗi server khi lấy danh sách chờ duyệt', 'INTERNAL_ERROR', 500);
	}
};

// ============================================================
// DANH SÁCH ADMIN - JOIN user info + tên thiết bị
// ============================================================
const danhSachAdmin = async (req, res) => {
	// Trả toàn bộ requests (admin) để khớp docs /api/borrow-requests
	try {
		const { status, from, to } = req.query || {};
		const where = [];
		const params = [];
		if (status) {
			where.push('br.status = ?');
			params.push(status);
		}
		if (from) {
			where.push('br.borrow_date >= ?');
			params.push(from);
		}
		if (to) {
			where.push('br.borrow_date <= ?');
			params.push(to);
		}
		const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
		const [rows] = await sequelize.query(
			`SELECT br.id, br.user_id, br.borrow_date, br.expected_return_date, br.actual_return_date,
			        br.status, br.approved_by, br.note, br.created_at, br.updated_at,
			        br.club_id, br.club_status, br.club_approved_by, br.club_approved_at,
			        u.full_name, u.email, u.student_code, u.trust_score, u.trust_rank,
			        (SELECT GROUP_CONCAT(e.name || ' (x' || bi2.quantity || ')', ', ')
			         FROM borrow_items bi2 JOIN equipments e ON e.id = bi2.equipment_id
			         WHERE bi2.request_id = br.id) AS equipment_names
			 FROM borrow_requests br
			 LEFT JOIN users u ON u.id = br.user_id
			 ${whereSql}
			 ORDER BY br.id DESC`,
			{ replacements: params }
		);
		return ok(res, rows, 'OK');
	} catch (e) {
		return fail(res, 'Lỗi server khi lấy danh sách yêu cầu', 'INTERNAL_ERROR', 500);
	}
};

// ============================================================
// CHI TIẾT YÊU CẦU - JOIN user info + equipment names vào items
// ============================================================
const chiTiet = async (req, res) => {
	try {
		const requestId = Number(req.params.id);
		if (!requestId) return fail(res, 'ID yêu cầu không hợp lệ', 'VALIDATION_ERROR', 400);

		const [rows] = await sequelize.query(
			`SELECT br.id, br.user_id, br.borrow_date, br.expected_return_date, br.actual_return_date,
			        br.status, br.approved_by, br.note, br.created_at, br.updated_at,
			        br.club_id, br.club_status, br.club_approved_by, br.club_approved_at,
			        br.signature_data, br.return_note,
			        u.full_name, u.email, u.student_code, u.trust_score, u.club_id as user_club_id
			 FROM borrow_requests br
			 LEFT JOIN users u ON u.id = br.user_id
			 WHERE br.id = ? LIMIT 1`,
			{ replacements: [requestId] }
		);
		const request = rows && rows[0];
		if (!request) return fail(res, 'Không tìm thấy yêu cầu mượn', 'NOT_FOUND', 404);

		const [items] = await sequelize.query(
			`SELECT bi.id, bi.request_id, bi.equipment_id, bi.quantity, bi.created_at,
			        e.name as equipment_name, e.status as equipment_status,
			        e.available_quantity, e.storage_location
			 FROM borrow_items bi
			 LEFT JOIN equipments e ON e.id = bi.equipment_id
			 WHERE bi.request_id = ? ORDER BY bi.id ASC`,
			{ replacements: [requestId] }
		);
		return ok(res, { ...request, items }, 'OK');
	} catch (e) {
		return fail(res, 'Lỗi server khi lấy chi tiết yêu cầu', 'INTERNAL_ERROR', 500);
	}
};

// ============================================================
// HELPER: Cập nhật trạng thái yêu cầu mượn
// ============================================================
const updateBorrowRequestStatus = async ({ requestId, nguoiDuyetId, nextStatus, note = null }) => {
	const [currentRows] = await sequelize.query(
			`SELECT id, user_id, status FROM borrow_requests WHERE id = ? LIMIT 1`,
		{ replacements: [requestId] }
	);
	const currentRequest = currentRows && currentRows[0];
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
	const updatedRequest = afterRows && afterRows[0];
	if (updatedRequest && currentRequest?.user_id) {
		const notificationType = nextStatus === 'approved' ? 'borrow' : 'system';
		const title = nextStatus === 'approved' ? 'Yêu cầu mượn đã được duyệt' : 'Yêu cầu mượn bị từ chối';
		const message = nextStatus === 'approved'
			? `Đơn mượn #${requestId} đã được duyệt.`
			: `Đơn mượn #${requestId} đã bị từ chối${note ? `: ${note}` : ''}.`;
		await pushUserNotification(currentRequest.user_id, title, message, notificationType);
	}
	return {
		found: true,
		updated: updatedRequest && updatedRequest.status === nextStatus,
		status: updatedRequest && updatedRequest.status,
	};
};

// ============================================================
// DUYỆT YÊU CẦU (Admin)
// ============================================================
const duyet = async (req, res) => {
	try {
		const nguoiDuyetId = req.user && req.user.id;
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

// ============================================================
// TỪ CHỐI YÊU CẦU (Admin)
// ============================================================
const tuChoi = async (req, res) => {
	try {
		const nguoiDuyetId = req.user && req.user.id;
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

// ============================================================
// GHI NHẬN ĐÃ MƯỢN (Admin - trừ kho)
// ============================================================
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
				const [r, rMeta] = await sequelize.query(
					`UPDATE equipments
					 SET available_quantity = available_quantity - ?
					 WHERE id = ? AND available_quantity >= ?`,
					{ replacements: [it.quantity, it.equipment_id, it.quantity], transaction: t }
				);
				if (!getAffectedRows(r, rMeta)) throw new Error('OUT_OF_STOCK');
			}

			await sequelize.query(
				`UPDATE borrow_requests SET status = 'borrowed', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
				{ replacements: [requestId], transaction: t }
			);
		});

		const [afterRows] = await sequelize.query('SELECT user_id FROM borrow_requests WHERE id = ? LIMIT 1', { replacements: [requestId] });
		if (afterRows.length) {
			await pushUserNotification(afterRows[0].user_id, 'Đã ghi nhận mượn thiết bị', `Đơn mượn #${requestId} đã được ghi nhận đang mượn.`, 'borrow');
		}

		return ok(res, { id: requestId }, 'Đã ghi nhận mượn thiết bị');
	} catch (e) {
		if (e && e.message === 'OUT_OF_STOCK') return fail(res, 'Không đủ số lượng thiết bị trong kho', 'OUT_OF_STOCK', 409);
		if (e && e.message === 'INVALID_STATUS') return fail(res, 'Yêu cầu chưa ở trạng thái đã duyệt', 'INVALID_STATUS', 409);
		if (e && e.message === 'REQUEST_NOT_FOUND') return fail(res, 'Không tìm thấy yêu cầu mượn', 'NOT_FOUND', 404);
		return fail(res, 'Lỗi server khi ghi nhận mượn', 'INTERNAL_ERROR', 500);
	}
};

// ============================================================
// GHI NHẬN ĐÃ TRẢ (Admin - cộng kho + điểm uy tín)
// ============================================================
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
			if (reqRows[0].status !== 'borrowed' && reqRows[0].status !== 'overdue') throw new Error('INVALID_STATUS');

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

		// Hiệu ứng sau giao dịch (không critical)
		if (borrowUserId) {
			try {
				const { calculateOverdue } = require('./penaltyController');
				const { updateTrustScore } = require('./trustController');

				const penalty = await calculateOverdue(requestId);
				if (penalty > 0) {
					// Trả trễ: trừ điểm uy tín
					await updateTrustScore(borrowUserId, -20, 'Trả thiết bị trễ hạn');
				} else {
					// Đúng hạn: tăng điểm nhỏ
					await updateTrustScore(borrowUserId, 5, 'Trả thiết bị đúng hạn');
				}
			} catch (sideErr) {
				console.error('Post-return side effects error:', sideErr.message);
			}
			await pushUserNotification(
				borrowUserId,
				'Đã ghi nhận trả thiết bị',
				`Đơn mượn #${requestId} đã được ghi nhận trả${isLate ? ' và đang được tính trễ hạn' : ''}.`,
				'return'
			);
		}

		return ok(res, { id: requestId }, 'Đã ghi nhận trả thiết bị');
	} catch (e) {
		if (e && e.message === 'INVALID_STATUS') return fail(res, 'Yêu cầu chưa ở trạng thái đang mượn', 'INVALID_STATUS', 409);
		if (e && e.message === 'REQUEST_NOT_FOUND') return fail(res, 'Không tìm thấy yêu cầu mượn', 'NOT_FOUND', 404);
		return fail(res, 'Lỗi server khi ghi nhận trả', 'INTERNAL_ERROR', 500);
	}
};

// ============================================================
// SMART APPROVE (Admin - tự động duyệt nếu đủ điều kiện)
// ============================================================
const smartApprove = async (req, res) => {
	try {
		const adminId = req.user && req.user.id;
		if (req.user && req.user.role !== 'admin') return fail(res, 'Không có quyền', 'FORBIDDEN', 403);

		const requestId = Number(req.params.id);
		if (!requestId) return fail(res, 'ID yêu cầu không hợp lệ', 'VALIDATION_ERROR', 400);

		// Lấy thông tin yêu cầu
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

		// Kiểm tra 1: điểm tin cậy > 80
		const [userRows] = await sequelize.query(
			'SELECT trust_score, is_banned FROM users WHERE id = ? LIMIT 1',
			{ replacements: [borrowReq.user_id] }
		);
		const user = userRows && userRows[0];
		const trustScore = (user && user.trust_score !== null && user.trust_score !== undefined) ? user.trust_score : 100;
		if (!user || trustScore <= 80) {
			return ok(res, { auto_approved: false, reason: 'Điểm tin cậy của người dùng không đủ (cần > 80)' });
		}
		if (user.is_banned) {
			return ok(res, { auto_approved: false, reason: 'Người dùng đang bị cấm' });
		}

		// Kiểm tra 2: tất cả thiết bị đủ số lượng
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

		// Kiểm tra 3: không có lịch mượn trùng
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
			const conflict = conflicts && conflicts[0];
			if (conflict && conflict.cnt > 0) {
				return ok(res, {
					auto_approved: false,
					reason: `Thiết bị "${item.name}" đã có lịch mượn trùng trong khoảng thời gian này`,
				});
			}
		}

		// Tất cả điều kiện ok — tự động duyệt
		await sequelize.query(
			`UPDATE borrow_requests SET status = 'approved', approved_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'pending'`,
			{ replacements: [adminId, requestId] }
		);

		return ok(res, { auto_approved: true, reason: 'AUTO_APPROVED: Tất cả điều kiện đều hợp lệ' });
	} catch (e) {
		return fail(res, 'Lỗi server khi tự động duyệt', 'INTERNAL_ERROR', 500);
	}
};

// ============================================================
// CLB DUYỆT YÊU CẦU (vòng 1 - trưởng CLB)
// ============================================================
const clubApprove = async (req, res) => {
	try {
		const approvedById = req.user && req.user.id;
		if (!approvedById) return fail(res, 'Bạn cần đăng nhập', 'AUTH_REQUIRED', 401);

		const requestId = Number(req.params.id);
		if (!requestId) return fail(res, 'ID không hợp lệ', 'VALIDATION_ERROR', 400);

		const { action, note } = req.body || {}; // action: 'approve' | 'reject'
		if (!['approve', 'reject'].includes(action)) {
			return fail(res, 'action phải là approve hoặc reject', 'VALIDATION_ERROR', 400);
		}

		// Kiểm tra yêu cầu tồn tại và đang ở trạng thái chờ duyệt CLB
		const [reqRows] = await sequelize.query(
			`SELECT br.id, br.club_id, br.club_status, br.status FROM borrow_requests br WHERE br.id = ? LIMIT 1`,
			{ replacements: [requestId] }
		);
		const req2 = reqRows && reqRows[0];
		if (!req2) return fail(res, 'Không tìm thấy yêu cầu', 'NOT_FOUND', 404);
		if (req2.club_status !== 'pending') {
			return fail(res, 'Yêu cầu này không cần duyệt CLB hoặc đã được xử lý', 'INVALID_STATUS', 409);
		}

		const newClubStatus = action === 'approve' ? 'approved' : 'rejected';
		// Sau khi CLB duyệt -> chờ admin duyệt; CLB từ chối -> rejected
		const newBrStatus = action === 'approve' ? 'pending' : 'rejected';

		await sequelize.query(
			`UPDATE borrow_requests
			 SET club_status = ?, club_approved_by = ?, club_approved_at = CURRENT_TIMESTAMP,
			     status = ?, note = COALESCE(?, note), updated_at = CURRENT_TIMESTAMP
			 WHERE id = ?`,
			{ replacements: [newClubStatus, approvedById, newBrStatus, note || null, requestId] }
		);

		const msg = action === 'approve'
			? 'CLB đã duyệt yêu cầu, chờ Admin xét duyệt'
			: 'CLB đã từ chối yêu cầu';
		const [studentRows] = await sequelize.query('SELECT user_id FROM borrow_requests WHERE id = ? LIMIT 1', { replacements: [requestId] });
		if (studentRows.length) {
			await pushUserNotification(
				studentRows[0].user_id,
				action === 'approve' ? 'CLB đã duyệt đơn' : 'CLB đã từ chối đơn',
				msg,
				action === 'approve' ? 'borrow' : 'system'
			);
		}
		return ok(res, { id: requestId, club_status: newClubStatus }, msg);
	} catch (e) {
		return fail(res, 'Lỗi server khi duyệt CLB', 'INTERNAL_ERROR', 500);
	}
};

// ============================================================
// DANH SÁCH QUÁ HẠN (Admin)
// ============================================================
const getOverdueList = async (req, res) => {
	try {
		if (req.user && req.user.role !== 'admin') return fail(res, 'Không có quyền', 'FORBIDDEN', 403);
		const today = new Date().toISOString().slice(0, 10);
		const [rows] = await sequelize.query(
			`SELECT br.id, br.user_id, br.borrow_date, br.expected_return_date, br.status,
			        u.full_name, u.email, u.student_code, u.trust_score,
			        CAST((julianday(?) - julianday(br.expected_return_date)) AS INTEGER) as days_overdue,
			        (SELECT GROUP_CONCAT(e.name, ', ')
			         FROM borrow_items bi2 JOIN equipments e ON e.id = bi2.equipment_id
			         WHERE bi2.request_id = br.id) AS equipment_names
			 FROM borrow_requests br LEFT JOIN users u ON u.id = br.user_id
			 WHERE br.status IN ('borrowed', 'overdue') AND br.expected_return_date < ?
			 ORDER BY days_overdue DESC`,
			{ replacements: [today, today] }
		);
		return ok(res, rows, 'OK');
	} catch (e) {
		return fail(res, 'Lỗi server', 'INTERNAL_ERROR', 500);
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
	clubApprove,
	getOverdueList,
};
