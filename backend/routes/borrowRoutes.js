const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

const borrowController = require('../controllers/borrowController');

const router = express.Router();

// Student
router.post('/borrow/create', authMiddleware, borrowController.taoYeuCau);
router.get('/borrow/history', authMiddleware, borrowController.lichSuCuaToi);

// Admin/Staff (hiện dùng role admin theo middleware đang có)
router.get('/borrow/pending', authMiddleware, requireRole('admin'), borrowController.danhSachChoDuyet);
router.put('/borrow/approve/:id', authMiddleware, requireRole('admin'), borrowController.duyet);
router.put('/borrow/reject/:id', authMiddleware, requireRole('admin'), borrowController.tuChoi);

// Ghi nhận đã lấy đồ / đã trả đồ
router.put('/borrow/borrowed/:id', authMiddleware, requireRole('admin'), borrowController.ghiNhanDaMuon);
router.put('/borrow/return/:id', authMiddleware, requireRole('admin'), borrowController.ghiNhanDaTra);

module.exports = router;
