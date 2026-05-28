const sequelize = require('../config/database');
const { ok, fail } = require('../utils/response');
const { getInsertedId, getAffectedRows } = require('../utils/sqlCompat');

/**
 * Internal: calculate overdue penalty for a returned borrow request.
 * Returns penalty amount (VND) and creates record if > 0.
 */
const calculateOverdue = async (borrowRequestId) => {
  try {
    const [rows] = await sequelize.query(
      `SELECT id, user_id, expected_return_date, actual_return_date
       FROM borrow_requests WHERE id = ? LIMIT 1`,
      { replacements: [borrowRequestId] }
    );
    if (!rows.length) return 0;

    const req = rows[0];
    if (!req.actual_return_date || !req.expected_return_date) return 0;

    const expected = new Date(req.expected_return_date);
    const actual = new Date(req.actual_return_date);
    const msPerDay = 24 * 60 * 60 * 1000;
    const daysLate = Math.floor((actual - expected) / msPerDay);
    if (daysLate <= 0) return 0;

    const amount = daysLate * 10000;
    const reason = `Trả trễ ${daysLate} ngày`;

    await sequelize.query(
      `INSERT INTO penalties (user_id, borrow_request_id, amount, reason, paid, created_at)
       VALUES (?, ?, ?, ?, 0, CURRENT_TIMESTAMP)`,
      { replacements: [req.user_id, borrowRequestId, amount, reason] }
    );

    return amount;
  } catch (e) {
    console.error('calculateOverdue error:', e.message);
    return 0;
  }
};

const getAll = async (req, res) => {
  try {
    if (req.user?.role !== 'admin') return fail(res, 'Không có quyền', 'FORBIDDEN', 403);

    const [rows] = await sequelize.query(
      `SELECT p.id, p.user_id, p.borrow_request_id, p.amount, p.reason, p.paid, p.created_at,
              u.full_name as user_name, u.email, u.student_code
       FROM penalties p
       LEFT JOIN users u ON u.id = p.user_id
       ORDER BY p.created_at DESC`
    );

    return ok(res, rows, 'OK');
  } catch (e) {
    return fail(res, 'Lỗi server khi lấy danh sách phạt', 'INTERNAL_ERROR', 500);
  }
};

const getMyPenalties = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return fail(res, 'Bạn cần đăng nhập', 'AUTH_REQUIRED', 401);

    const [rows] = await sequelize.query(
      `SELECT id, borrow_request_id, amount, reason, paid, created_at
       FROM penalties WHERE user_id = ?
       ORDER BY created_at DESC`,
      { replacements: [userId] }
    );

    return ok(res, rows, 'OK');
  } catch (e) {
    return fail(res, 'Lỗi server khi lấy phạt của tôi', 'INTERNAL_ERROR', 500);
  }
};

const createPenalty = async (req, res) => {
  try {
    if (req.user?.role !== 'admin') return fail(res, 'Không có quyền', 'FORBIDDEN', 403);

    const { user_id: userId, borrow_request_id: borrowRequestId, amount, reason } = req.body || {};
    if (!userId || !amount) {
      return fail(res, 'Thiếu user_id hoặc amount', 'VALIDATION_ERROR', 400);
    }

    const [rq, rqMeta] = await sequelize.query(
      `INSERT INTO penalties (user_id, borrow_request_id, amount, reason, paid, created_at)
       VALUES (?, ?, ?, ?, 0, CURRENT_TIMESTAMP)`,
      { replacements: [userId, borrowRequestId || null, amount, reason || null] }
    );
    const id = getInsertedId(rq, rqMeta);

    return ok(res, { id }, 'Đã tạo phiếu phạt', 201);
  } catch (e) {
    return fail(res, 'Lỗi server khi tạo phiếu phạt', 'INTERNAL_ERROR', 500);
  }
};

const markPaid = async (req, res) => {
  try {
    if (req.user?.role !== 'admin') return fail(res, 'Không có quyền', 'FORBIDDEN', 403);

    const penaltyId = Number(req.params.id);
    if (!penaltyId) return fail(res, 'ID không hợp lệ', 'VALIDATION_ERROR', 400);

    const [r, rMeta] = await sequelize.query(
      `UPDATE penalties SET paid = 1 WHERE id = ?`,
      { replacements: [penaltyId] }
    );

    if (!getAffectedRows(r, rMeta)) {
      return fail(res, 'Không tìm thấy phiếu phạt', 'NOT_FOUND', 404);
    }

    return ok(res, { id: penaltyId }, 'Đã đánh dấu đã thanh toán');
  } catch (e) {
    return fail(res, 'Lỗi server khi cập nhật phiếu phạt', 'INTERNAL_ERROR', 500);
  }
};

module.exports = { getAll, getMyPenalties, createPenalty, markPaid, calculateOverdue };
