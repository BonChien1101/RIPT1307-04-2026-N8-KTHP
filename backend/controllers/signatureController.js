const sequelize = require('../config/database');
const { ok, fail } = require('../utils/response');
const { getAffectedRows } = require('../utils/sqlCompat');

const saveSignature = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return fail(res, 'Bạn cần đăng nhập', 'AUTH_REQUIRED', 401);

    const { borrow_request_id: borrowRequestId, signature_data: signatureData } = req.body || {};
    if (!borrowRequestId || !signatureData) {
      return fail(res, 'Thiếu borrow_request_id hoặc signature_data', 'VALIDATION_ERROR', 400);
    }

    // Verify ownership (student can sign own request, admin can sign any)
    const [rows] = await sequelize.query(
      'SELECT id, user_id FROM borrow_requests WHERE id = ? LIMIT 1',
      { replacements: [borrowRequestId] }
    );
    if (!rows.length) return fail(res, 'Không tìm thấy yêu cầu mượn', 'NOT_FOUND', 404);

    const request = rows[0];
    if (req.user.role !== 'admin' && request.user_id !== userId) {
      return fail(res, 'Không có quyền ký yêu cầu này', 'FORBIDDEN', 403);
    }

    const [r, rMeta] = await sequelize.query(
      'UPDATE borrow_requests SET signature_data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      { replacements: [signatureData, borrowRequestId] }
    );

    if (!getAffectedRows(r, rMeta)) {
      return fail(res, 'Cập nhật chữ ký thất bại', 'INTERNAL_ERROR', 500);
    }

    return ok(res, { borrow_request_id: borrowRequestId }, 'Đã lưu chữ ký');
  } catch (e) {
    return fail(res, 'Lỗi server khi lưu chữ ký', 'INTERNAL_ERROR', 500);
  }
};

const getSignature = async (req, res) => {
  try {
    const requestId = Number(req.params.requestId);
    if (!requestId) return fail(res, 'ID yêu cầu không hợp lệ', 'VALIDATION_ERROR', 400);

    const userId = req.user?.id;
    const [rows] = await sequelize.query(
      'SELECT id, user_id, signature_data FROM borrow_requests WHERE id = ? LIMIT 1',
      { replacements: [requestId] }
    );
    if (!rows.length) return fail(res, 'Không tìm thấy yêu cầu mượn', 'NOT_FOUND', 404);

    const request = rows[0];
    if (req.user.role !== 'admin' && request.user_id !== userId) {
      return fail(res, 'Không có quyền xem chữ ký này', 'FORBIDDEN', 403);
    }

    return ok(res, { borrow_request_id: request.id, signature_data: request.signature_data }, 'OK');
  } catch (e) {
    return fail(res, 'Lỗi server khi lấy chữ ký', 'INTERNAL_ERROR', 500);
  }
};

module.exports = { saveSignature, getSignature };
