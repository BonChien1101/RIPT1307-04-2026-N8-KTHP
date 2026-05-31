const router = require('express').Router();
const auth = require('../middleware/authMiddleware');
const ctrl = require('../controllers/exportController');

router.get('/borrow/:requestId', auth, ctrl.exportBorrowPDF);
router.get('/borrows', auth, ctrl.exportBorrowsExcel);
router.get('/statistics', auth, ctrl.exportStatisticsExcel);

module.exports = router;
