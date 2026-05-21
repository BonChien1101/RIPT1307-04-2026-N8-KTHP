const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

const statisticsController = require('../controllers/statisticsController');

const router = express.Router();

router.get('/statistics/dashboard', authMiddleware, requireRole('admin'), statisticsController.dashboard);
router.get('/statistics/monthly', authMiddleware, requireRole('admin'), statisticsController.thongKeTheoThang);
router.get('/statistics/top-equipment', authMiddleware, requireRole('admin'), statisticsController.topThietBi);

module.exports = router;
