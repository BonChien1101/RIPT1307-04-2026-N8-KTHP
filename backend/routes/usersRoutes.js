const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const authController = require('../controllers/authController');

const router = express.Router();

router.get('/', authMiddleware, requireRole('admin'), authController.layDanhSachNguoiDung);
router.get('/:id', authMiddleware, requireRole('admin'), authController.layChiTietNguoiDung);
router.post('/', authMiddleware, requireRole('admin'), authController.taoNguoiDung);
router.put('/:id', authMiddleware, requireRole('admin'), authController.capNhatNguoiDung);
router.delete('/:id', authMiddleware, requireRole('admin'), authController.xoaNguoiDung);

module.exports = router;