const express = require('express');
const { requireAuth } = require('../middleware/auth');
const {
  createAccount,
  getMyAccount,
  getMyBalance,
  nameEnquiry,
} = require('../controllers/accountController');

const router = express.Router();

router.use(requireAuth);

router.post('/', createAccount);
router.get('/me', getMyAccount);
router.get('/me/balance', getMyBalance);
router.get('/name-enquiry/:accountNumber', nameEnquiry);

module.exports = router;
