exports.register = async (req, res, next) => {
  try {
    const { email, phone, password, firstName, lastName } = req.body;
    
    // basic validation
    if (!email || !phone || !password || !firstName || !lastName) {
      return res.status(400).json({ message: 'All fields required' });
    }

    const existing = await Customer.findOne({ $or: [{ email }, { phone }] });
    if (existing) {
      return res.status(409).json({ message: 'Email or phone already registered' });
    }

    const customer = await Customer.create({ email, phone, password, firstName, lastName });

    res.status(201).json({
      message: 'Registration successful',
      customer: {
        id: customer._id,
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
        isVerified: customer.isVerified,
      },
    });
  } catch (error) {
    next(error);
  }
};


exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }

    const customer = await Customer.findOne({ email }).select('+password');
    if (!customer) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await customer.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(customer._id);

    res.status(200).json({
      message: 'Login successful',
      token,
      customer: {
        id: customer._id,
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
        isVerified: customer.isVerified,
      },
    });
  } catch (error) {
    next(error);
  }
};


exports.getMe = async (req, res) => {
  res.status(200).json({
    customer: {
      id: req.customer._id,
      email: req.customer.email,
      firstName: req.customer.firstName,
      lastName: req.customer.lastName,
      isVerified: req.customer.isVerified,
      hasBvn: !!req.customer.bvn,
      hasNin: !!req.customer.nin,
    },
  });
};