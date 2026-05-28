const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const notificationController = require('../controllers/notificationController');

const router = express.Router();

router.get('/notifications', authMiddleware, notificationController.danhSach);
router.patch('/notifications/read-all', authMiddleware, notificationController.readAll);
router.patch('/notifications/:id/read', authMiddleware, notificationController.danhDauDaDoc);

module.exports = router;
