const router = require('express').Router();
const auth = require('../middleware/authMiddleware');
const ctrl = require('../controllers/ticketController');

router.get('/me', auth, ctrl.getMyTickets);
router.get('/', auth, ctrl.getAll);
router.post('/', auth, ctrl.createTicket);
router.patch('/:id/status', auth, ctrl.updateStatus);
router.delete('/:id', auth, ctrl.deleteTicket);

module.exports = router;
