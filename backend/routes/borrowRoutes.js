const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

const borrowController = require('../controllers/borrowController');

const router = express.Router();

// Student
router.post('/borrow-requests', authMiddleware, requireRole('student'), borrowController.taoYeuCau);
router.get('/borrow-requests/me', authMiddleware, requireRole('student'), borrowController.lichSuCuaToi);

// Admin
router.get('/borrow-requests', authMiddleware, requireRole('admin'), borrowController.danhSachAdmin);
router.get('/borrow-requests/:id', authMiddleware, requireRole('admin'), borrowController.chiTiet);
router.patch('/borrow-requests/:id/approve', authMiddleware, requireRole('admin'), borrowController.duyet);
router.patch('/borrow-requests/:id/reject', authMiddleware, requireRole('admin'), borrowController.tuChoi);
router.patch('/borrow-requests/:id/mark-borrowed', authMiddleware, requireRole('admin'), borrowController.ghiNhanDaMuon);
router.patch('/borrow-requests/:id/mark-returned', authMiddleware, requireRole('admin'), borrowController.ghiNhanDaTra);
router.post('/borrow-requests/:id/smart-approve', authMiddleware, requireRole('admin'), borrowController.smartApprove);
router.post('/borrow-requests/:id/club-approve', authMiddleware, requireRole('club_leader', 'admin'), borrowController.clubApprove);

module.exports = router;
