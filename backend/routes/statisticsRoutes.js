const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

const statisticsController = require('../controllers/statisticsController');

const router = express.Router();

router.get('/statistics/dashboard', authMiddleware, requireRole('admin'), statisticsController.dashboard);
router.get('/statistics/monthly', authMiddleware, requireRole('admin'), statisticsController.thongKeTheoThang);
router.get('/statistics/top-equipment', authMiddleware, requireRole('admin'), statisticsController.topThietBi);
router.get('/statistics/overdue-rate', authMiddleware, requireRole('admin'), statisticsController.overdueRate);
router.get('/statistics/monthly-trend', authMiddleware, requireRole('admin'), statisticsController.monthlyTrend);
router.get('/statistics/ai-suggestion', authMiddleware, requireRole('admin'), statisticsController.aiSuggestion);
router.get('/statistics/club-stats', authMiddleware, requireRole('admin'), statisticsController.clubStats);

module.exports = router;
