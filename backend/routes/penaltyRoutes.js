const router = require('express').Router();
const auth = require('../middleware/authMiddleware');
const ctrl = require('../controllers/penaltyController');

router.get('/me', auth, ctrl.getMyPenalties);
router.get('/', auth, ctrl.getAll);
router.post('/', auth, ctrl.createPenalty);
router.patch('/:id/pay', auth, ctrl.markPaid);

module.exports = router;
