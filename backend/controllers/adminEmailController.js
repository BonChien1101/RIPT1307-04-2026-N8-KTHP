const sequelize = require('../config/database');
const { ok, fail } = require('../utils/response');
const { sendEmail, templates } = require('../services/emailService');

/**
 * POST /api/admin/emails/borrow-warning
 * body: { request_id, content }
 * Sends an admin warning email to the borrower of a request.
 */
const sendBorrowWarning = async (req, res) => {
  try {
    if (req.user?.role !== 'admin') return fail(res, 'Không có quyền', 'FORBIDDEN', 403);

    const { request_id: requestIdRaw, content } = req.body || {};
    const requestId = Number(requestIdRaw);
    if (!requestId) return fail(res, 'request_id không hợp lệ', 'VALIDATION_ERROR', 400);
    if (!content || !String(content).trim()) return fail(res, 'Thiếu nội dung email', 'VALIDATION_ERROR', 400);

    const [rows] = await sequelize.query(
      `SELECT br.id as request_id, br.user_id, br.status,
              u.email, u.full_name,
              e.name as equipment_name
       FROM borrow_requests br
       JOIN users u ON u.id = br.user_id
       LEFT JOIN borrow_items bi ON bi.request_id = br.id
       LEFT JOIN equipments e ON e.id = bi.equipment_id
       WHERE br.id = ?
       LIMIT 1`,
      { replacements: [requestId] }
    );

    const row = rows?.[0];
    if (!row) return fail(res, 'Không tìm thấy phiếu mượn', 'NOT_FOUND', 404);
    if (!row.email) return fail(res, 'Người mượn không có email', 'CONFLICT', 409);

    const tpl = templates.adminWarning({
      fullName: row.full_name,
      equipmentName: row.equipment_name || 'thiết bị',
      requestId: row.request_id,
      content,
    });

    const r = await sendEmail({
      to: row.email,
      subject: tpl.subject,
      html: tpl.html,
      meta: { kind: 'admin_warning', request_id: requestId, admin_id: req.user?.id },
    });

    return ok(res, { sent: !r?.skipped, previewUrl: r?.previewUrl }, 'Đã gửi email cảnh báo');
  } catch (e) {
    return fail(res, 'Lỗi server khi gửi email', 'INTERNAL_ERROR', 500);
  }
};

module.exports = {
  sendBorrowWarning,
};
