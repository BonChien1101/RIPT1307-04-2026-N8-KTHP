const sequelize = require('../config/database');
const { ok, fail } = require('../utils/response');

const calcRank = (score) => {
  if (score >= 80) return 'gold';
  if (score >= 50) return 'silver';
  return 'bronze';
};

/**
 * Internal function: update trust score for a user after borrow events.
 * delta: +10 (on time), -20 (late), -50 (damaged)
 */
const updateTrustScore = async (userId, delta) => {
  try {
    const [rows] = await sequelize.query(
      'SELECT trust_score FROM users WHERE id = ? LIMIT 1',
      { replacements: [userId] }
    );
    if (!rows.length) return;

    let newScore = (rows[0].trust_score ?? 100) + delta;
    if (newScore < 0) newScore = 0;
    const rank = calcRank(newScore);

    let bannedUntil = null;
    let isBanned = 0;
    if (newScore === 0 && delta <= -50) {
      isBanned = 1;
      const d = new Date();
      d.setDate(d.getDate() + 7);
      bannedUntil = d.toISOString().slice(0, 19).replace('T', ' ');
    }

    await sequelize.query(
      `UPDATE users SET trust_score = ?, trust_rank = ?, is_banned = ?, banned_until = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      { replacements: [newScore, rank, isBanned, bannedUntil, userId] }
    );
  } catch (e) {
    console.error('updateTrustScore error:', e.message);
  }
};

const getMyTrust = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return fail(res, 'Bạn cần đăng nhập', 'AUTH_REQUIRED', 401);

    const [rows] = await sequelize.query(
      'SELECT id, full_name, email, trust_score, trust_rank, is_banned, banned_until FROM users WHERE id = ? LIMIT 1',
      { replacements: [userId] }
    );
    if (!rows.length) return fail(res, 'Không tìm thấy người dùng', 'NOT_FOUND', 404);

    return ok(res, rows[0], 'OK');
  } catch (e) {
    return fail(res, 'Lỗi server', 'INTERNAL_ERROR', 500);
  }
};

const getUserTrust = async (req, res) => {
  try {
    if (req.user?.role !== 'admin') return fail(res, 'Không có quyền', 'FORBIDDEN', 403);

    const userId = Number(req.params.userId);
    if (!userId) return fail(res, 'ID không hợp lệ', 'VALIDATION_ERROR', 400);

    const [rows] = await sequelize.query(
      'SELECT id, full_name, email, trust_score, trust_rank, is_banned, banned_until, club FROM users WHERE id = ? LIMIT 1',
      { replacements: [userId] }
    );
    if (!rows.length) return fail(res, 'Không tìm thấy người dùng', 'NOT_FOUND', 404);

    return ok(res, rows[0], 'OK');
  } catch (e) {
    return fail(res, 'Lỗi server', 'INTERNAL_ERROR', 500);
  }
};

const getAllTrust = async (req, res) => {
  try {
    if (req.user?.role !== 'admin') return fail(res, 'Không có quyền', 'FORBIDDEN', 403);

    const [rows] = await sequelize.query(
      `SELECT id, full_name, email, student_code, trust_score, trust_rank, is_banned, banned_until, club
       FROM users ORDER BY trust_score DESC`
    );

    return ok(res, rows, 'OK');
  } catch (e) {
    return fail(res, 'Lỗi server', 'INTERNAL_ERROR', 500);
  }
};

module.exports = { getMyTrust, getUserTrust, getAllTrust, updateTrustScore };
