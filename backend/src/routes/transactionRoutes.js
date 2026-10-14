const express = require('express');
const { initiateTransfer } = require('../controllers/transactionController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);
router.post('/', initiateTransfer);

module.exports = router;