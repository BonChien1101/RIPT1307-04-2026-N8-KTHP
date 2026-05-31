const sequelize = require('../config/database');
const { ok, fail } = require('../utils/response');
const { getInsertedId, getAffectedRows } = require('../utils/sqlCompat');

const getLogs = async (req, res) => {
  try {
    const [rows] = await sequelize.query(
      `SELECT rl.id, rl.equipment_id, rl.description, rl.cost, rl.repaired_by,
              rl.repaired_at, rl.status, rl.created_at, e.name as equipment_name
       FROM repair_logs rl
       LEFT JOIN equipments e ON e.id = rl.equipment_id
       ORDER BY rl.created_at DESC`
    );
    return ok(res, rows, 'OK');
  } catch (e) {
    return fail(res, 'Lỗi server khi lấy nhật ký bảo trì', 'INTERNAL_ERROR', 500);
  }
};

const getEquipmentLogs = async (req, res) => {
  try {
    const equipmentId = Number(req.params.id);
    if (!equipmentId) return fail(res, 'ID thiết bị không hợp lệ', 'VALIDATION_ERROR', 400);

    const [rows] = await sequelize.query(
      `SELECT rl.id, rl.equipment_id, rl.description, rl.cost, rl.repaired_by,
              rl.repaired_at, rl.status, rl.created_at, e.name as equipment_name
       FROM repair_logs rl
       LEFT JOIN equipments e ON e.id = rl.equipment_id
       WHERE rl.equipment_id = ?
       ORDER BY rl.created_at DESC`,
      { replacements: [equipmentId] }
    );
    return ok(res, rows, 'OK');
  } catch (e) {
    return fail(res, 'Lỗi server khi lấy nhật ký bảo trì thiết bị', 'INTERNAL_ERROR', 500);
  }
};

const addLog = async (req, res) => {
  try {
    if (req.user?.role !== 'admin') return fail(res, 'Không có quyền', 'FORBIDDEN', 403);

    const { equipment_id: equipmentId, description, cost, repaired_by: repairedBy, repaired_at: repairedAt, status } = req.body || {};
    if (!equipmentId || !description) {
      return fail(res, 'Thiếu equipment_id hoặc description', 'VALIDATION_ERROR', 400);
    }

    const [rq, rqMeta] = await sequelize.query(
      `INSERT INTO repair_logs (equipment_id, description, cost, repaired_by, repaired_at, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      { replacements: [equipmentId, description, cost || 0, repairedBy || null, repairedAt || null, status || 'pending'] }
    );
    const id = getInsertedId(rq, rqMeta);

    // Update equipment's last_maintenance_at
    if (repairedAt) {
      await sequelize.query(
        'UPDATE equipments SET last_maintenance_at = ? WHERE id = ?',
        { replacements: [repairedAt, equipmentId] }
      );
    }

    return ok(res, { id }, 'Đã thêm nhật ký bảo trì', 201);
  } catch (e) {
    return fail(res, 'Lỗi server khi thêm nhật ký bảo trì', 'INTERNAL_ERROR', 500);
  }
};

const updateLog = async (req, res) => {
  try {
    if (req.user?.role !== 'admin') return fail(res, 'Không có quyền', 'FORBIDDEN', 403);

    const logId = Number(req.params.id);
    if (!logId) return fail(res, 'ID không hợp lệ', 'VALIDATION_ERROR', 400);

    const { description, cost, repaired_by: repairedBy, repaired_at: repairedAt, status } = req.body || {};
    const sets = [];
    const params = [];
    if (description !== undefined) { sets.push('description = ?'); params.push(description); }
    if (cost !== undefined) { sets.push('cost = ?'); params.push(cost); }
    if (repairedBy !== undefined) { sets.push('repaired_by = ?'); params.push(repairedBy); }
    if (repairedAt !== undefined) { sets.push('repaired_at = ?'); params.push(repairedAt); }
    if (status !== undefined) { sets.push('status = ?'); params.push(status); }

    if (!sets.length) return fail(res, 'Không có dữ liệu cập nhật', 'VALIDATION_ERROR', 400);
    params.push(logId);

    const [r, rMeta] = await sequelize.query(
      `UPDATE repair_logs SET ${sets.join(', ')} WHERE id = ?`,
      { replacements: params }
    );

    if (!getAffectedRows(r, rMeta)) {
      return fail(res, 'Không tìm thấy nhật ký bảo trì', 'NOT_FOUND', 404);
    }

    return ok(res, { id: logId }, 'Đã cập nhật nhật ký bảo trì');
  } catch (e) {
    return fail(res, 'Lỗi server khi cập nhật nhật ký bảo trì', 'INTERNAL_ERROR', 500);
  }
};

const getAlerts = async (req, res) => {
  try {
    // Equipment where last_maintenance_at is NULL or older than 180 days
    const dialect = sequelize.getDialect();
    let dateSql;
    if (dialect === 'mysql') {
      dateSql = `(last_maintenance_at IS NULL OR last_maintenance_at < DATE_SUB(NOW(), INTERVAL 180 DAY))`;
    } else {
      dateSql = `(last_maintenance_at IS NULL OR last_maintenance_at < datetime('now', '-180 days'))`;
    }

    const [rows] = await sequelize.query(
      `SELECT id, name, category, status, last_maintenance_at, condition_status
       FROM equipments
       WHERE ${dateSql}
       ORDER BY last_maintenance_at ASC NULLS FIRST`
    );

    return ok(res, rows, 'OK');
  } catch (e) {
    // Try without NULLS FIRST if not supported
    try {
      const dialect = sequelize.getDialect();
      let dateSql;
      if (dialect === 'mysql') {
        dateSql = `(last_maintenance_at IS NULL OR last_maintenance_at < DATE_SUB(NOW(), INTERVAL 180 DAY))`;
      } else {
        dateSql = `(last_maintenance_at IS NULL OR last_maintenance_at < datetime('now', '-180 days'))`;
      }
      const [rows] = await sequelize.query(
        `SELECT id, name, category, status, last_maintenance_at, condition_status
         FROM equipments
         WHERE ${dateSql}
         ORDER BY last_maintenance_at ASC`
      );
      return ok(res, rows, 'OK');
    } catch (e2) {
      return fail(res, 'Lỗi server khi lấy cảnh báo bảo trì', 'INTERNAL_ERROR', 500);
    }
  }
};

module.exports = { getLogs, getEquipmentLogs, addLog, updateLog, getAlerts };
