const express = require('express');
const { requireAuth } = require('../middleware/auth');
const {
  getTransactionStatus,
  getMyTransactionHistory,
} = require('../controllers/transactionController');

const router = express.Router();

router.use(requireAuth);

router.get('/me', getMyTransactionHistory);
router.get('/:transactionId', getTransactionStatus);

module.exports = router;
