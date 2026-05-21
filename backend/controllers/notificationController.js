
const sequelize = require('../config/database');
const { ok, fail } = require('../utils/response');

const danhSach = async (req, res) => {
  try {
  const nguoiDungId = req.user?.id;
  if (!nguoiDungId) return fail(res, 'Bạn cần đăng nhập', 'AUTH_REQUIRED', 401);

    const [rows] = await sequelize.query(
      'SELECT id, user_id, title, message, is_read, created_at FROM notifications WHERE user_id = ? ORDER BY id DESC',
  { replacements: [nguoiDungId] }
    );

    return ok(res, rows, 'OK');
  } catch (e) {
    return fail(res, 'Lỗi server', 'INTERNAL_ERROR', 500);
  }
};

const danhDauDaDoc = async (req, res) => {
  try {
  const nguoiDungId = req.user?.id;
  if (!nguoiDungId) return fail(res, 'Bạn cần đăng nhập', 'AUTH_REQUIRED', 401);

  const thongBaoId = Number(req.params.id);
  if (!thongBaoId) return fail(res, 'ID không hợp lệ', 'VALIDATION_ERROR', 400);

    const [result] = await sequelize.query(
      'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
  { replacements: [thongBaoId, nguoiDungId] }
    );

    if (!result.affectedRows) return fail(res, 'Không tìm thấy thông báo', 'NOT_FOUND', 404);
  return ok(res, { id: thongBaoId }, 'Đã đánh dấu đã đọc');
  } catch (e) {
    return fail(res, 'Lỗi server', 'INTERNAL_ERROR', 500);
  }
};

module.exports = { danhSach, danhDauDaDoc };
