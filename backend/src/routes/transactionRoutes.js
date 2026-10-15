const express = require('express');
const { initiateTransfer, getTransactionStatus } = require('../controllers/transactionController');
const { protect } = require('../middleware/authMiddleware');




const router = express.Router();

router.use(protect);
router.post('/', initiateTransfer);
router.get('/:reference', getTransactionStatus);

module.exports = router;