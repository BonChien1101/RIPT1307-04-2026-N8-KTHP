const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const equipmentController = require('../controllers/equipmentController');

const router = express.Router();

router.get('/', authMiddleware, equipmentController.danhSach);
router.get('/:id', authMiddleware, equipmentController.chiTiet);

router.post('/', authMiddleware, requireRole('admin'), equipmentController.taoMoi);
router.put('/:id', authMiddleware, requireRole('admin'), equipmentController.capNhat);
router.delete('/:id', authMiddleware, requireRole('admin'), equipmentController.xoa);

module.exports = router;
