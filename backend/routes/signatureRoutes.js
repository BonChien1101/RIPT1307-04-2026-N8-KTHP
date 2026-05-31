const router = require('express').Router();
const auth = require('../middleware/authMiddleware');
const ctrl = require('../controllers/signatureController');

router.post('/', auth, ctrl.saveSignature);
router.get('/:requestId', auth, ctrl.getSignature);

module.exports = router;
