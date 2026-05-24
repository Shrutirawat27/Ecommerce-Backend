const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const JWT_SECRET =
  process.env.JWT_SECRET_KEY;

const verifyToken = (
  req,
  res,
  next
) => {

  const token =
    req.cookies?.token ||
    req.headers.authorization?.split(' ')[1];

  if (!token) {

    return res.status(401).json({
      message: 'Token is required'
    });
  }

  try {

    const decoded =
      jwt.verify(
        token,
        JWT_SECRET
      );

    req.user = {
      _id:
        new mongoose.Types.ObjectId(
          decoded.userId || decoded.id
        ),
      role: decoded.role
    };

    next();

  } catch (error) {

    console.error(
      'Token Verification Error:',
      error
    );

    if (
      error.name ===
      'TokenExpiredError'
    ) {

      return res.status(401).json({
        message:
          'Token has expired',
        needsRefresh: true
      });
    }

    if (
      error.name ===
      'JsonWebTokenError'
    ) {

      return res.status(401).json({
        message: 'Invalid token'
      });
    }

    return res.status(401).json({
      message:
        'Error while verifying token'
    });
  }
};

module.exports = verifyToken;