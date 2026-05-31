const router = require('express').Router();
const auth = require('../middleware/authMiddleware');
const ctrl = require('../controllers/qrController');

router.get('/equipment/:id', auth, ctrl.generateQR);
router.post('/scan', auth, ctrl.scanQR);

module.exports = router;
