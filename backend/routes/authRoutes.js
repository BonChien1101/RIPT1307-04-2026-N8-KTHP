const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const authController = require('../controllers/authController');

const router = express.Router();

router.post('/login', authController.dangNhap);
router.post('/register', authController.dangKy);
router.post('/reset-password', authController.resetMatKhau);
router.get('/me', authMiddleware, authController.thongTinToi);
router.put('/me', authMiddleware, authController.capNhatProfile);

module.exports = router;
