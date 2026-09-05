const crypto = require('crypto');

/**
 * Generates a syntactically valid 11-digit BVN/NIN for TESTING ONLY.
 * The assignment explicitly forbids using real BVN/NIN numbers, so every
 * identity registered through this system is synthetic.
 */
function generateFakeKycId() {
  let digits = '';
  // First digit non-zero so it always renders as a clean 11-digit string.
  digits += String(crypto.randomInt(1, 10));
  for (let i = 0; i < 10; i += 1) {
    digits += String(crypto.randomInt(0, 10));
  }
  return digits;
}

module.exports = { generateFakeKycId };
