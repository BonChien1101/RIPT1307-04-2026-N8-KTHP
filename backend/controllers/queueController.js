const sequelize = require('../config/database');
const { ok, fail } = require('../utils/response');
const { getInsertedId, getAffectedRows } = require('../utils/sqlCompat');
const socketManager = require('../socket');

/**
 * Internal: Notify the next user in queue for an equipment
 */
const notifyNextInQueue = async (equipmentId) => {
  try {
    const [rows] = await sequelize.query(
      `SELECT bq.id, bq.user_id, e.name as equipment_name
       FROM borrow_queue bq
       JOIN equipments e ON e.id = bq.equipment_id
       WHERE bq.equipment_id = ? AND bq.status = 'waiting'
       ORDER BY bq.created_at ASC
       LIMIT 1`,
      { replacements: [equipmentId] }
    );
    if (!rows.length) return;

    const next = rows[0];
    await sequelize.query(
      'UPDATE borrow_queue SET notified_at = CURRENT_TIMESTAMP WHERE id = ?',
      { replacements: [next.id] }
    );

    // Emit socket notification
    socketManager.emitToUser(next.user_id, 'queue_notify', {
      message: `Thiết bị "${next.equipment_name}" đã có sẵn. Hãy đặt mượn ngay!`,
      equipment_id: equipmentId,
    });
  } catch (e) {
    console.error('notifyNextInQueue error:', e.message);
  }
};

const joinQueue = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return fail(res, 'Bạn cần đăng nhập', 'AUTH_REQUIRED', 401);

    const { equipment_id: equipmentId } = req.body || {};
    if (!equipmentId) return fail(res, 'Thiếu equipment_id', 'VALIDATION_ERROR', 400);

    // Check not already in queue
    const [existing] = await sequelize.query(
      `SELECT id FROM borrow_queue WHERE equipment_id = ? AND user_id = ? AND status = 'waiting' LIMIT 1`,
      { replacements: [equipmentId, userId] }
    );
    if (existing.length) {
      return fail(res, 'Bạn đã có trong hàng đợi của thiết bị này', 'CONFLICT', 409);
    }

    const [rq, rqMeta] = await sequelize.query(
      `INSERT INTO borrow_queue (equipment_id, user_id, status)
       VALUES (?, ?, 'waiting')`,
      { replacements: [equipmentId, userId] }
    );
    const id = getInsertedId(rq, rqMeta);

    // Get position
    const [posRows] = await sequelize.query(
      `SELECT COUNT(*) as position FROM borrow_queue
       WHERE equipment_id = ? AND status = 'waiting' AND created_at <= (SELECT created_at FROM borrow_queue WHERE id = ?)`,
      { replacements: [equipmentId, id] }
    );

    return ok(res, { id, position: posRows[0]?.position || 1 }, 'Đã thêm vào hàng đợi', 201);
  } catch (e) {
    return fail(res, 'Lỗi server khi thêm vào hàng đợi', 'INTERNAL_ERROR', 500);
  }
};

const getMyQueue = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return fail(res, 'Bạn cần đăng nhập', 'AUTH_REQUIRED', 401);

    const [rows] = await sequelize.query(
      `SELECT bq.id, bq.equipment_id, bq.created_at, bq.notified_at, bq.status,
              e.name as equipment_name, e.status as equipment_status, e.available_quantity
       FROM borrow_queue bq
       JOIN equipments e ON e.id = bq.equipment_id
       WHERE bq.user_id = ? AND bq.status = 'waiting'
       ORDER BY bq.created_at DESC`,
      { replacements: [userId] }
    );

    return ok(res, rows, 'OK');
  } catch (e) {
    return fail(res, 'Lỗi server khi lấy hàng đợi', 'INTERNAL_ERROR', 500);
  }
};

const getEquipmentQueue = async (req, res) => {
  try {
    if (req.user?.role !== 'admin') return fail(res, 'Không có quyền', 'FORBIDDEN', 403);

    const equipmentId = Number(req.params.id);
    if (!equipmentId) return fail(res, 'ID thiết bị không hợp lệ', 'VALIDATION_ERROR', 400);

    const [rows] = await sequelize.query(
      `SELECT bq.id, bq.user_id, bq.created_at, bq.notified_at, bq.status,
              u.full_name, u.email, u.student_code
       FROM borrow_queue bq
       JOIN users u ON u.id = bq.user_id
       WHERE bq.equipment_id = ? AND bq.status = 'waiting'
       ORDER BY bq.created_at ASC`,
      { replacements: [equipmentId] }
    );

    return ok(res, rows, 'OK');
  } catch (e) {
    return fail(res, 'Lỗi server khi lấy hàng đợi thiết bị', 'INTERNAL_ERROR', 500);
  }
};

const leaveQueue = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return fail(res, 'Bạn cần đăng nhập', 'AUTH_REQUIRED', 401);

    const queueId = Number(req.params.id);
    if (!queueId) return fail(res, 'ID không hợp lệ', 'VALIDATION_ERROR', 400);

    const [r, rMeta] = await sequelize.query(
      `UPDATE borrow_queue SET status = 'cancelled' WHERE id = ? AND user_id = ?`,
      { replacements: [queueId, userId] }
    );

    if (!getAffectedRows(r, rMeta)) {
      return fail(res, 'Không tìm thấy bản ghi hàng đợi', 'NOT_FOUND', 404);
    }

    return ok(res, { id: queueId }, 'Đã rời khỏi hàng đợi');
  } catch (e) {
    return fail(res, 'Lỗi server khi rời hàng đợi', 'INTERNAL_ERROR', 500);
  }
};

module.exports = { joinQueue, getMyQueue, getEquipmentQueue, leaveQueue, notifyNextInQueue };
