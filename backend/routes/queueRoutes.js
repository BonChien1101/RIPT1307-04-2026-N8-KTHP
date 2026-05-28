const router = require('express').Router();
const auth = require('../middleware/authMiddleware');
const ctrl = require('../controllers/queueController');

router.post('/join', auth, ctrl.joinQueue);
router.get('/me', auth, ctrl.getMyQueue);
router.get('/equipment/:id', auth, ctrl.getEquipmentQueue);
router.delete('/:id', auth, ctrl.leaveQueue);

module.exports = router;
