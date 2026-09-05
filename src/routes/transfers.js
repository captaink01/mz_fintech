const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { initiateTransfer } = require('../controllers/transferController');

const router = express.Router();

router.use(requireAuth);

router.post('/', initiateTransfer);

module.exports = router;
