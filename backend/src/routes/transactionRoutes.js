const express = require('express');
const {
  initiateTransfer,
  getTransactionStatus,
  listTransactions,
} = require('../controllers/transactionController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);
router.post('/', initiateTransfer);
router.get('/', listTransactions);          // ← new: LIST (must be before /:reference)
router.get('/:reference', getTransactionStatus);

module.exports = router;