const sequelize = require('../config/database');
const socketManager = require('../socket');
const { updateTrustScore } = require('../controllers/trustController');
const { getAffectedRows } = require('../utils/sqlCompat');

const processOverdueRequests = async () => {
	const today = new Date().toISOString().slice(0, 10);
	const [rows] = await sequelize.query(
		`SELECT br.id, br.user_id, br.expected_return_date
		 FROM borrow_requests br
		 WHERE br.status = 'borrowed' AND br.expected_return_date < ?
		 ORDER BY br.expected_return_date ASC`,
		{ replacements: [today] }
	);

	let marked = 0;
	for (const request of rows) {
		// eslint-disable-next-line no-await-in-loop
		await sequelize.transaction(async (t) => {
			const [result, metadata] = await sequelize.query(
				`UPDATE borrow_requests
				 SET status = 'overdue', updated_at = CURRENT_TIMESTAMP
				 WHERE id = ? AND status = 'borrowed'`,
				{ replacements: [request.id], transaction: t }
			);
			if (!getAffectedRows(result, metadata)) return;

			// Trừ điểm uy tín và tạo thông báo cho người dùng
			// eslint-disable-next-line no-await-in-loop
			await updateTrustScore(request.user_id, -20);
			await sequelize.query(
				`INSERT INTO notifications (user_id, title, message, is_read, created_at)
				 VALUES (?, ?, ?, 0, CURRENT_TIMESTAMP)`,
				{
					replacements: [
						request.user_id,
						'Đơn mượn đã quá hạn',
						`Đơn mượn #${request.id} đã quá hạn và được chuyển sang trạng thái quá hạn.`,
					],
					transaction: t,
				}
			);
			marked += 1;
		});

		socketManager.emitToUser(request.user_id, 'borrow_overdue', {
			requestId: request.id,
			expected_return_date: request.expected_return_date,
		});
	}

	return { total: rows.length, overdue_marked: marked };
};

module.exports = { processOverdueRequests };