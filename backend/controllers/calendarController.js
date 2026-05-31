const sequelize = require('../config/database');
const { ok, fail } = require('../utils/response');

const statusColorMap = {
  pending: '#f59e0b',
  approved: '#3b82f6',
  borrowed: '#8b5cf6',
  returned: '#10b981',
  rejected: '#ef4444',
  overdue: '#dc2626',
  damaged: '#9a3412',
  lost: '#1f2937',
};

const monthFilter = (column, year, month, dialect) => {
  if (dialect === 'mysql') {
    return {
      sql: `YEAR(${column}) = ? AND MONTH(${column}) = ?`,
      params: [String(year), String(month)],
    };
  }
  return {
    sql: `strftime('%Y', ${column}) = ? AND strftime('%m', ${column}) = ?`,
    params: [String(year), String(month).padStart(2, '0')],
  };
};

const getCalendarEvents = async (req, res) => {
  try {
    const { month, year } = req.query || {};
    const nam = Number(year);
    const thang = Number(month);
    if (!nam || !thang || thang < 1 || thang > 12) {
      return fail(res, 'Tham số month/year không hợp lệ', 'VALIDATION_ERROR', 400);
    }

    const dialect = sequelize.getDialect();
    const filter = monthFilter('br.borrow_date', nam, thang, dialect);

    const [rows] = await sequelize.query(
      `SELECT br.id, br.borrow_date, br.expected_return_date, br.status,
              u.full_name as user_name,
              GROUP_CONCAT(e.name) as equipment_names
       FROM borrow_requests br
       JOIN users u ON u.id = br.user_id
       LEFT JOIN borrow_items bi ON bi.request_id = br.id
       LEFT JOIN equipments e ON e.id = bi.equipment_id
       WHERE ${filter.sql}
       GROUP BY br.id, br.borrow_date, br.expected_return_date, br.status, u.full_name
       ORDER BY br.borrow_date ASC`,
      { replacements: filter.params }
    );

    const events = rows.map((r) => ({
      id: r.id,
      title: `Mượn: ${r.user_name} - ${r.equipment_names || 'N/A'}`,
      start: r.borrow_date,
      end: r.expected_return_date,
      status: r.status,
      color: statusColorMap[r.status] || '#6b7280',
    }));

    return ok(res, events, 'OK');
  } catch (e) {
    return fail(res, 'Lỗi server khi lấy lịch', 'INTERNAL_ERROR', 500);
  }
};

const getEquipmentSchedule = async (req, res) => {
  try {
    const equipmentId = Number(req.params.id);
    if (!equipmentId) return fail(res, 'ID thiết bị không hợp lệ', 'VALIDATION_ERROR', 400);

    const { from, to } = req.query || {};
    const where = ['bi.equipment_id = ?'];
    const params = [equipmentId];

    if (from) {
      where.push('br.borrow_date >= ?');
      params.push(from);
    }
    if (to) {
      where.push('br.expected_return_date <= ?');
      params.push(to);
    }

    const [rows] = await sequelize.query(
      `SELECT br.id, br.borrow_date, br.expected_return_date, br.actual_return_date, br.status,
              u.full_name as user_name, e.name as equipment_name
       FROM borrow_items bi
       JOIN borrow_requests br ON br.id = bi.request_id
       JOIN users u ON u.id = br.user_id
       JOIN equipments e ON e.id = bi.equipment_id
       WHERE ${where.join(' AND ')}
       ORDER BY br.borrow_date ASC`,
      { replacements: params }
    );

    const events = rows.map((r) => ({
      id: r.id,
      title: `${r.user_name} - ${r.equipment_name}`,
      start: r.borrow_date,
      end: r.actual_return_date || r.expected_return_date,
      status: r.status,
      color: statusColorMap[r.status] || '#6b7280',
    }));

    return ok(res, events, 'OK');
  } catch (e) {
    return fail(res, 'Lỗi server khi lấy lịch thiết bị', 'INTERNAL_ERROR', 500);
  }
};

module.exports = { getCalendarEvents, getEquipmentSchedule };
