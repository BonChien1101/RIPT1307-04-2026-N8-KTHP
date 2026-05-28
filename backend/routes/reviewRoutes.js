const router = require('express').Router();
const auth = require('../middleware/authMiddleware');
const ctrl = require('../controllers/reviewController');

router.get('/pending', auth, ctrl.getMyPendingReviews);
router.get('/equipment/:id', auth, ctrl.getEquipmentReviews);
router.post('/', auth, ctrl.addReview);

module.exports = router;
