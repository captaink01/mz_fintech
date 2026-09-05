const express = require('express');
const { onboardCustomer } = require('../controllers/onboardingController');

const router = express.Router();

// No auth required -- this IS the entry point that establishes identity.
router.post('/onboard', onboardCustomer);

module.exports = router;
