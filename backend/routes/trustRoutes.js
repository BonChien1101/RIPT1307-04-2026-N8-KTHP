const router = require('express').Router();
const auth = require('../middleware/authMiddleware');
const ctrl = require('../controllers/trustController');

router.get('/me', auth, ctrl.getMyTrust);
router.get('/', auth, ctrl.getAllTrust);

module.exports = router;
