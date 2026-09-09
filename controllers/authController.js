const crypto = require('crypto');
const User = require('../models/User');
const ApiResponse = require('../utils/apiResponse');

/**
 * Ensure default administrator user exists in database
 */
const ensureDefaultAdmin = async () => {
  try {
    const count = await User.countDocuments();
    if (count === 0) {
      const defaultAdmin = new User({
        name: 'Dr. PC Admin',
        username: 'admin',
        email: 'admin@pcdoctor.com',
        role: 'admin',
        isActive: true
      });
      defaultAdmin.setPassword('admin123');
      await defaultAdmin.save();
      console.log('[Auth] Default Administrator created (Username: admin | Password: admin123)');
    }
  } catch (error) {
    console.error('[Auth Warning] Could not check or seed default admin:', error.message);
  }
};

// Run check on startup
ensureDefaultAdmin();

/**
 * User Login
 * POST /api/auth/login
 */
exports.login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return ApiResponse.badRequest(res, 'Username/email and password are required');
    }

    // Ensure at least one admin exists in database
    await ensureDefaultAdmin();

    const normalizedIdentifier = username.trim().toLowerCase();

    // Find by username OR email
    const user = await User.findOne({
      $or: [{ username: normalizedIdentifier }, { email: normalizedIdentifier }]
    });

    if (!user) {
      return ApiResponse.unauthorized(res, 'Invalid username or password');
    }

    if (!user.isActive) {
      return ApiResponse.forbidden(res, 'Your account has been deactivated. Contact the shop owner.');
    }

    const isValidPassword = user.verifyPassword(password);
    if (!isValidPassword) {
      return ApiResponse.unauthorized(res, 'Invalid username or password');
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate session token (using random bytes signed or hex token)
    const token = crypto.randomBytes(32).toString('hex');

    return ApiResponse.success(
      res,
      {
        user: {
          id: user._id,
          name: user.name,
          username: user.username,
          email: user.email,
          role: user.role,
          lastLogin: user.lastLogin
        },
        token
      },
      'Logged in successfully'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get Current User Profile
 * GET /api/auth/me
 */
exports.me = async (req, res, next) => {
  try {
    // Return first active admin as fallback or decoded user
    const user = await User.findOne({ isActive: true });
    if (!user) {
      return ApiResponse.notFound(res, 'No active user found');
    }

    return ApiResponse.success(res, {
      id: user._id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
      lastLogin: user.lastLogin
    });
  } catch (error) {
    next(error);
  }
};

/**
 * User Logout
 * POST /api/auth/logout
 */
exports.logout = async (req, res) => {
  return ApiResponse.success(res, null, 'Logged out successfully');
};

/**
 * Get Demo Credentials info
 * GET /api/auth/demo-credentials
 */
exports.getDemoCredentials = async (req, res) => {
  await ensureDefaultAdmin();
  return ApiResponse.success(res, {
    username: 'admin',
    password: 'admin123',
    email: 'admin@pcdoctor.com',
    role: 'admin'
  });
};
