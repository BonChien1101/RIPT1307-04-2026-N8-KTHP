const sequelize = require('../config/database');
const { ok, fail } = require('../utils/response');

/**
 * GET /api/admin/borrowed
 * Admin-only: list active borrowed requests with borrower info for manual warning emails.
 */
const listBorrowed = async (req, res) => {
	try {
		if (req.user?.role !== 'admin') return fail(res, 'Không có quyền', 'FORBIDDEN', 403);

		const [rows] = await sequelize.query(
			`SELECT br.id as request_id,
			        br.user_id,
			        br.borrow_date,
			        br.expected_return_date,
			        br.status,
			        u.full_name,
			        u.email,
			        GROUP_CONCAT(e.name, ', ') as equipments
			 FROM borrow_requests br
			 JOIN users u ON u.id = br.user_id
			 LEFT JOIN borrow_items bi ON bi.request_id = br.id
			 LEFT JOIN equipments e ON e.id = bi.equipment_id
			 WHERE br.status = 'borrowed'
			 GROUP BY br.id
			 ORDER BY br.id DESC`
		);
		return ok(res, rows, 'OK');
	} catch (e) {
		return fail(res, 'Lỗi server', 'INTERNAL_ERROR', 500);
	}
};

module.exports = { listBorrowed };
