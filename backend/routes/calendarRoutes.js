const router = require('express').Router();
const auth = require('../middleware/authMiddleware');
const ctrl = require('../controllers/calendarController');

router.get('/events', auth, ctrl.getCalendarEvents);
router.get('/equipment/:id', auth, ctrl.getEquipmentSchedule);

module.exports = router;
