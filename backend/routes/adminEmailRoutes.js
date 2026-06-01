const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { sendBorrowWarning } = require('../controllers/adminEmailController');
const { listBorrowed } = require('../controllers/adminBorrowController');

const router = express.Router();

router.post('/emails/borrow-warning', authMiddleware, sendBorrowWarning);
router.get('/borrowed', authMiddleware, listBorrowed);

module.exports = router;
