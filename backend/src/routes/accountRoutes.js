const express = require('express');
const { createAccount, getMyAccount, getBalance } = require('../controllers/accountController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.post('/', createAccount);
router.get('/me', getMyAccount);
router.get('/balance', getBalance);

module.exports = router;