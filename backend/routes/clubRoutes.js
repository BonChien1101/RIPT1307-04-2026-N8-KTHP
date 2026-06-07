const router = require('express').Router();
const auth = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const ctrl = require('../controllers/clubController');

router.get('/', auth, ctrl.getAll);
router.get('/my-requests', auth, requireRole('club_leader', 'admin'), ctrl.getClubRequests);
router.get('/:id', auth, ctrl.getOne);
router.get('/:id/members', auth, ctrl.getMembers);
router.post('/', auth, requireRole('admin'), ctrl.create);
router.put('/:id', auth, requireRole('admin'), ctrl.update);
router.delete('/:id', auth, requireRole('admin'), ctrl.remove);
router.post('/:id/members', auth, requireRole('admin'), ctrl.addMember);

module.exports = router;