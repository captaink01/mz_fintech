const express = require('express');

const router = express.Router();

router.use('/customers', require('./onboarding'));
router.use('/auth', require('./auth'));
router.use('/accounts', require('./accounts'));
router.use('/transfers', require('./transfers'));
router.use('/transactions', require('./transactions'));

module.exports = router;
