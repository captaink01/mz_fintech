const express = require('express');
const { createAccount, getMyAccount, getBalance, nameEnquiry,} = require('../controllers/accountController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.post('/', createAccount);
router.get('/me', getMyAccount);
router.get('/balance', getBalance);
router.get('/name-enquiry/:accountNumber', nameEnquiry);

module.exports = router;