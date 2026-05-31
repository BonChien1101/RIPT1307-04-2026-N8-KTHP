const sequelize = require('../config/database');
const { ok, fail } = require('../utils/response');
const { getInsertedId } = require('../utils/sqlCompat');

const addReview = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return fail(res, 'Bạn cần đăng nhập', 'AUTH_REQUIRED', 401);

    const { equipment_id: equipmentId, borrow_request_id: borrowRequestId, rating, comment } = req.body || {};
    if (!equipmentId || !rating) {
      return fail(res, 'Thiếu equipment_id hoặc rating', 'VALIDATION_ERROR', 400);
    }
    if (rating < 1 || rating > 5) {
      return fail(res, 'Rating phải từ 1-5', 'VALIDATION_ERROR', 400);
    }

    // Check user has a returned borrow for this equipment
    const [borrows] = await sequelize.query(
      `SELECT br.id FROM borrow_requests br
       JOIN borrow_items bi ON bi.request_id = br.id
       WHERE br.user_id = ? AND bi.equipment_id = ? AND br.status = 'returned'
       LIMIT 1`,
      { replacements: [userId, equipmentId] }
    );
    if (!borrows.length) {
      return fail(res, 'Bạn chưa trả thiết bị này nên không thể đánh giá', 'FORBIDDEN', 403);
    }

    // Insert review
    const [rq, rqMeta] = await sequelize.query(
      `INSERT INTO device_reviews (equipment_id, user_id, borrow_request_id, rating, comment, created_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      { replacements: [equipmentId, userId, borrowRequestId || null, rating, comment || null] }
    );
    const reviewId = getInsertedId(rq, rqMeta);

    // Update equipment rating_avg and rating_count
    const [stats] = await sequelize.query(
      'SELECT COUNT(*) as cnt, AVG(rating) as avg FROM device_reviews WHERE equipment_id = ?',
      { replacements: [equipmentId] }
    );
    if (stats.length) {
      await sequelize.query(
        'UPDATE equipments SET rating_avg = ?, rating_count = ? WHERE id = ?',
        { replacements: [stats[0].avg || 0, stats[0].cnt || 0, equipmentId] }
      );
    }

    return ok(res, { id: reviewId }, 'Đánh giá thành công', 201);
  } catch (e) {
    return fail(res, 'Lỗi server khi thêm đánh giá', 'INTERNAL_ERROR', 500);
  }
};

const getEquipmentReviews = async (req, res) => {
  try {
    const equipmentId = Number(req.params.id);
    if (!equipmentId) return fail(res, 'ID thiết bị không hợp lệ', 'VALIDATION_ERROR', 400);

    const [rows] = await sequelize.query(
      `SELECT dr.id, dr.rating, dr.comment, dr.created_at,
              u.full_name as user_name, u.id as user_id
       FROM device_reviews dr
       JOIN users u ON u.id = dr.user_id
       WHERE dr.equipment_id = ?
       ORDER BY dr.created_at DESC`,
      { replacements: [equipmentId] }
    );

    return ok(res, rows, 'OK');
  } catch (e) {
    return fail(res, 'Lỗi server khi lấy đánh giá', 'INTERNAL_ERROR', 500);
  }
};

const getMyPendingReviews = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return fail(res, 'Bạn cần đăng nhập', 'AUTH_REQUIRED', 401);

    // Get returned borrows user hasn't reviewed yet
    const [rows] = await sequelize.query(
      `SELECT br.id as borrow_request_id, br.actual_return_date,
              e.id as equipment_id, e.name as equipment_name
       FROM borrow_requests br
       JOIN borrow_items bi ON bi.request_id = br.id
       JOIN equipments e ON e.id = bi.equipment_id
       WHERE br.user_id = ? AND br.status = 'returned'
         AND NOT EXISTS (
           SELECT 1 FROM device_reviews dr
           WHERE dr.user_id = ? AND dr.equipment_id = bi.equipment_id
             AND dr.borrow_request_id = br.id
         )
       ORDER BY br.actual_return_date DESC`,
      { replacements: [userId, userId] }
    );

    return ok(res, rows, 'OK');
  } catch (e) {
    return fail(res, 'Lỗi server khi lấy đánh giá chờ', 'INTERNAL_ERROR', 500);
  }
};

module.exports = { addReview, getEquipmentReviews, getMyPendingReviews };
