const jwt = require('jsonwebtoken');

const generateToken = (userId, role) => {
  const secret = process.env.JWT_SECRET_KEY;
  const refreshSecret = process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET_KEY + '_refresh';

  if (!secret) {
    throw new Error('JWT_SECRET_KEY is not defined in the environment variables');
  }

  const accessToken = jwt.sign(
    { userId, role },
    secret,
    { expiresIn: '24h' } 
  );

  const refreshToken = jwt.sign(
    { userId, role },
    refreshSecret,
    { expiresIn: '7d' } 
  );

  return { accessToken, refreshToken };
};

module.exports = generateToken;