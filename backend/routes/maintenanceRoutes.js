const router = require('express').Router();
const auth = require('../middleware/authMiddleware');
const ctrl = require('../controllers/maintenanceController');

router.get('/alerts', auth, ctrl.getAlerts);
router.get('/equipment/:id', auth, ctrl.getEquipmentLogs);
router.get('/', auth, ctrl.getLogs);
router.post('/', auth, ctrl.addLog);
router.put('/:id', auth, ctrl.updateLog);

module.exports = router;
