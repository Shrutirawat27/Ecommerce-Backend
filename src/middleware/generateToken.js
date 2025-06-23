const jwt = require('jsonwebtoken');

// Generate JWT token
const generateToken = (userId, role) => {
  const secret = process.env.JWT_SECRET_KEY;
  const refreshSecret = process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET_KEY + '_refresh';

  if (!secret) {
    throw new Error('JWT_SECRET_KEY is not defined in the environment variables');
  }

  // Generate access token (short-lived)
  const accessToken = jwt.sign(
    { userId, role }, // Payload: Storing user ID and role
    secret,
    { expiresIn: '24h' } // Extended to 24 hours for better usability
  );

  // Generate refresh token (long-lived)
  const refreshToken = jwt.sign(
    { userId, role },
    refreshSecret,
    { expiresIn: '7d' } // 7 days
  );

  return { accessToken, refreshToken };
};

module.exports = generateToken;
