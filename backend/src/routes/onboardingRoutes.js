const express = require('express');
const { registerBvn, registerNin } = require('../controllers/onboardingController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect); // every route below requires a token

router.post('/bvn', registerBvn);
router.post('/nin', registerNin);

module.exports = router;