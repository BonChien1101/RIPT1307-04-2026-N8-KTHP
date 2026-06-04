const router = require('express').Router();
const auth = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const { processOverdueRequests } = require('../services/overdueService');
const { ok, fail } = require('../utils/response');

router.post('/trigger-overdue', auth, requireRole('admin'), async (req, res) => {
	try {
		const result = await processOverdueRequests();
		return ok(res, result, 'Đã chạy kiểm tra quá hạn');
	} catch (e) {
		return fail(res, 'Không thể chạy kiểm tra quá hạn', 'INTERNAL_ERROR', 500);
	}
});

module.exports = router;