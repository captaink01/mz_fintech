const nibss = require('../clients/nibssClient');
const ApiError = require('../utils/ApiError');

// Nibss expects "YYYY-MM-DD". Mongo stores Dates as ISO strings.
function formatDob(date) {
  return new Date(date).toISOString().split('T')[0];
}

// Reusable response shape. Whatever "state" the customer is in,
// the frontend gets the same fields so it can render consistently.
function customerView(customer) {
  return {
    id: customer._id,
    email: customer.email,
    firstName: customer.firstName,
    lastName: customer.lastName,
    isVerified: customer.isVerified,
    hasBvn: Boolean(customer.bvn),
    hasNin: Boolean(customer.nin),
  };
}

// POST /api/onboarding/bvn   body: { bvn }
exports.registerBvn = async (req, res, next) => {
  try {
    const { bvn } = req.body;
    const customer = req.customer; // from protect middleware

    if (!bvn) throw new ApiError(400, 'BVN is required');
    if (!/^\d{11}$/.test(bvn)) {
      throw new ApiError(400, 'BVN must be exactly 11 digits');
    }

    if (customer.bvn) {
      throw new ApiError(409, 'BVN already registered for this account');
    }

    // Call Nibss. Everything the endpoint needs, we already have
    // — except the BVN itself, which came from the request.
    await nibss.insertBvn({
      bvn,
      firstName: customer.firstName,
      lastName: customer.lastName,
      dob: formatDob(customer.dob),
      phone: customer.phone,
    });

    // Nibss accepted it. Now update OUR record via .save().
    customer.bvn = bvn;
    customer.isVerified = true;
    await customer.save();

    res.status(201).json({
      message: 'BVN registered successfully',
      customer: customerView(customer),
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/onboarding/nin   body: { nin }
exports.registerNin = async (req, res, next) => {
  try {
    const { nin } = req.body;
    const customer = req.customer;

    if (!nin) throw new ApiError(400, 'NIN is required');
    if (!/^\d{11}$/.test(nin)) {
      throw new ApiError(400, 'NIN must be exactly 11 digits');
    }

    if (customer.nin) {
      throw new ApiError(409, 'NIN already registered for this account');
    }

    await nibss.insertNin({
      nin,
      firstName: customer.firstName,
      lastName: customer.lastName,
      dob: formatDob(customer.dob),
    });

    customer.nin = nin;
    customer.isVerified = true;
    await customer.save();

    res.status(201).json({
      message: 'NIN registered successfully',
      customer: customerView(customer),
    });
  } catch (error) {
    next(error);
  }
};