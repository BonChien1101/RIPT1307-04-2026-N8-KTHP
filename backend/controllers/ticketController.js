const sequelize = require('../config/database');
const { ok, fail } = require('../utils/response');
const { getInsertedId, getAffectedRows } = require('../utils/sqlCompat');

const getAll = async (req, res) => {
  try {
    if (req.user?.role !== 'admin') return fail(res, 'Không có quyền', 'FORBIDDEN', 403);

    const [rows] = await sequelize.query(
      `SELECT t.id, t.equipment_id, t.user_id, t.title, t.description,
              t.status, t.priority, t.created_at, t.updated_at,
              u.full_name as user_name, u.email,
              e.name as equipment_name
       FROM tickets t
       LEFT JOIN users u ON u.id = t.user_id
       LEFT JOIN equipments e ON e.id = t.equipment_id
       ORDER BY t.created_at DESC`
    );

    return ok(res, rows, 'OK');
  } catch (e) {
    return fail(res, 'Lỗi server khi lấy tickets', 'INTERNAL_ERROR', 500);
  }
};

const getMyTickets = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return fail(res, 'Bạn cần đăng nhập', 'AUTH_REQUIRED', 401);

    const [rows] = await sequelize.query(
      `SELECT t.id, t.equipment_id, t.title, t.description, t.status, t.priority,
              t.created_at, t.updated_at, e.name as equipment_name
       FROM tickets t
       LEFT JOIN equipments e ON e.id = t.equipment_id
       WHERE t.user_id = ?
       ORDER BY t.created_at DESC`,
      { replacements: [userId] }
    );

    return ok(res, rows, 'OK');
  } catch (e) {
    return fail(res, 'Lỗi server khi lấy tickets của tôi', 'INTERNAL_ERROR', 500);
  }
};

const createTicket = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return fail(res, 'Bạn cần đăng nhập', 'AUTH_REQUIRED', 401);

    const { equipment_id: equipmentId, title, description, priority } = req.body || {};
    if (!equipmentId || !title) {
      return fail(res, 'Thiếu equipment_id hoặc title', 'VALIDATION_ERROR', 400);
    }

    const [rq, rqMeta] = await sequelize.query(
      `INSERT INTO tickets (equipment_id, user_id, title, description, status, priority, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'open', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      { replacements: [equipmentId, userId, title, description || null, priority || 'normal'] }
    );
    const id = getInsertedId(rq, rqMeta);

    return ok(res, { id }, 'Đã tạo ticket', 201);
  } catch (e) {
    return fail(res, 'Lỗi server khi tạo ticket', 'INTERNAL_ERROR', 500);
  }
};

const updateStatus = async (req, res) => {
  try {
    if (req.user?.role !== 'admin') return fail(res, 'Không có quyền', 'FORBIDDEN', 403);

    const ticketId = Number(req.params.id);
    if (!ticketId) return fail(res, 'ID không hợp lệ', 'VALIDATION_ERROR', 400);

    const { status } = req.body || {};
    const validStatuses = ['open', 'in_progress', 'resolved'];
    if (!status || !validStatuses.includes(status)) {
      return fail(res, `Status phải là một trong: ${validStatuses.join(', ')}`, 'VALIDATION_ERROR', 400);
    }

    const [r, rMeta] = await sequelize.query(
      `UPDATE tickets SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      { replacements: [status, ticketId] }
    );

    if (!getAffectedRows(r, rMeta)) {
      return fail(res, 'Không tìm thấy ticket', 'NOT_FOUND', 404);
    }

    return ok(res, { id: ticketId, status }, 'Đã cập nhật trạng thái ticket');
  } catch (e) {
    return fail(res, 'Lỗi server khi cập nhật ticket', 'INTERNAL_ERROR', 500);
  }
};

const deleteTicket = async (req, res) => {
  try {
    if (req.user?.role !== 'admin') return fail(res, 'Không có quyền', 'FORBIDDEN', 403);

    const ticketId = Number(req.params.id);
    if (!ticketId) return fail(res, 'ID không hợp lệ', 'VALIDATION_ERROR', 400);

    const [r, rMeta] = await sequelize.query(
      'DELETE FROM tickets WHERE id = ?',
      { replacements: [ticketId] }
    );

    if (!getAffectedRows(r, rMeta)) {
      return fail(res, 'Không tìm thấy ticket', 'NOT_FOUND', 404);
    }

    return ok(res, { id: ticketId }, 'Đã xóa ticket');
  } catch (e) {
    return fail(res, 'Lỗi server khi xóa ticket', 'INTERNAL_ERROR', 500);
  }
};

module.exports = { getAll, getMyTickets, createTicket, updateStatus, deleteTicket };
