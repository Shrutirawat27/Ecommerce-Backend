const jwt = require('jsonwebtoken');
const express = require('express');
const multer = require('multer');

const User = require('./user.model');

const generateToken = require('../middleware/generateToken');
const verifyToken = require('../middleware/verifyToken');
const requireAdmin = require('../middleware/requireAdmin');

const { storage } = require('../../config/cloudinary');

const router = express.Router();

const upload = multer({
  storage,
  limits: {
    fileSize: 1024 * 1024 * 5
  }
});

const isProduction =
  process.env.NODE_ENV === 'production';

const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction
    ? 'None'
    : 'Lax'
};

/* REGISTER */
router.post('/register', async (req, res) => {

  try {

    const {
      username,
      email,
      password
    } = req.body;

    const user = new User({
      username,
      email,
      password
    });

    await user.save();

    res.status(201).json({
      message: 'User registered successfully!'
    });

  } catch (error) {

    console.error(
      'Error registering user',
      error
    );

    res.status(500).json({
      message: 'Error registering user'
    });
  }
});

/* LOGIN */
router.post('/login', async (req, res) => {

  try {

    const {
      email,
      password
    } = req.body;

    const user = await User.findOne({
      email
    });

    if (!user) {

      return res.status(404).json({
        message: 'User not found'
      });
    }

    const isMatch =
      await user.comparePassword(password);

    if (!isMatch) {

      return res.status(401).json({
        message: 'Password not match'
      });
    }

    const {
      accessToken,
      refreshToken
    } = await generateToken(
      user._id,
      user.role
    );

    res.cookie(
      'token',
      accessToken,
      cookieOptions
    );

    res.cookie(
      'refreshToken',
      refreshToken,
      {
        ...cookieOptions,
        maxAge:
          7 *
          24 *
          60 *
          60 *
          1000
      }
    );

    res.status(200).json({
      message:
        'Logged in successfully!',
      user: {
        _id: user._id,
        email: user.email,
        username: user.username,
        role: user.role,
        profileImage:
          user.profileImage,
        bio: user.bio,
        profession:
          user.profession
      }
    });

  } catch (error) {

    console.error(
      'Error logging user',
      error
    );

    res.status(500).json({
      message: 'Error logging user'
    });
  }
});

/* REFRESH TOKEN */
router.post(
  '/refresh-token',
  async (req, res) => {

    try {

      const refreshToken =
        req.cookies.refreshToken;

      if (!refreshToken) {

        return res.status(401).json({
          message:
            'Refresh token is required'
        });
      }

      const refreshSecret =
        process.env
          .REFRESH_TOKEN_SECRET ||
        process.env.JWT_SECRET_KEY +
          '_refresh';

      const decoded = jwt.verify(
        refreshToken,
        refreshSecret
      );

      const user =
        await User.findById(
          decoded.userId
        );

      if (!user) {

        return res.status(404).json({
          message: 'User not found'
        });
      }

      const {
        accessToken,
        refreshToken:
          newRefreshToken
      } = await generateToken(
        user._id,
        user.role
      );

      res.cookie(
        'token',
        accessToken,
        cookieOptions
      );

      res.cookie(
        'refreshToken',
        newRefreshToken,
        {
          ...cookieOptions,
          maxAge:
            7 *
            24 *
            60 *
            60 *
            1000
        }
      );

      res.status(200).json({
        message:
          'Token refreshed successfully'
      });

    } catch (error) {

      console.error(
        'Error refreshing token:',
        error
      );

      res.status(401).json({
        message:
          'Invalid refresh token'
      });
    }
  }
);

/* LOGOUT */
router.post(
  '/logout',
  (req, res) => {

    res.clearCookie(
      'token',
      cookieOptions
    );

    res.clearCookie(
      'refreshToken',
      cookieOptions
    );

    res.status(200).json({
      message:
        'Logged out successfully!'
    });
  }
);

/* DELETE USER */
router.delete(
  '/users/:_id',
  verifyToken,
  requireAdmin,
  async (req, res) => {

    try {

      const { _id } =
        req.params;

      const user =
        await User.findByIdAndDelete(
          _id
        );

      if (!user) {

        return res.status(404).json({
          message:
            'User not found'
        });
      }

      res.status(200).json({
        message:
          'User deleted successfully'
      });

    } catch (error) {

      console.error(
        'Error deleting user',
        error
      );

      res.status(500).json({
        message:
          'Error deleting user'
      });
    }
  }
);

/* GET USERS */
router.get(
  '/users',
  verifyToken,
  requireAdmin,
  async (req, res) => {

    try {

      const users =
        await User.find(
          {},
          'id email role'
        ).sort({
          createdAt: -1
        });

      res.status(200).json(
        users
      );

    } catch (error) {

      console.error(
        'Error fetching users',
        error
      );

      res.status(500).json({
        message:
          'Error fetching users'
      });
    }
  }
);

/* UPDATE USER ROLE */
router.put(
  '/users/:_id',
  verifyToken,
  requireAdmin,
  async (req, res) => {

    try {

      const { _id } =
        req.params;

      const { role } =
        req.body;

      const user =
        await User.findByIdAndUpdate(
          _id,
          { role },
          { new: true }
        );

      if (!user) {

        return res.status(404).json({
          message:
            'User not found'
        });
      }

      res.status(200).json({
        message:
          'User role updated',
        user
      });

    } catch (error) {

      console.error(
        'Error updating role',
        error
      );

      res.status(500).json({
        message:
          'Error updating user role'
      });
    }
  }
);

/* EDIT PROFILE */
router.patch(
  '/edit-profile',
  verifyToken,
  upload.single(
    'profileImage'
  ),
  async (req, res) => {

    try {

      const user =
        await User.findById(
          req.user._id
        );

      if (!user) {

        return res.status(404).json({
          message:
            'User not found'
        });
      }

      const {
        username,
        profileImageUrl,
        bio,
        profession
      } = req.body;

      if (
        username !== undefined
      ) {
        user.username =
          username;
      }

      if (
        bio !== undefined
      ) {
        user.bio = bio;
      }

      if (
        profession !== undefined
      ) {
        user.profession =
          profession;
      }

      if (
        req.file &&
        req.file.path
      ) {
        user.profileImage =
          req.file.path;
      } else if (
        profileImageUrl
      ) {
        user.profileImage =
          profileImageUrl;
      }

      await user.save();

      res.status(200).json({
        message:
          'Profile updated successfully!',
        user: {
          _id: user._id,
          email: user.email,
          username:
            user.username,
          role: user.role,
          profileImage:
            user.profileImage,
          bio: user.bio,
          profession:
            user.profession
        }
      });

    } catch (error) {

      console.error(
        'Error updating profile:',
        error
      );

      res.status(500).json({
        message:
          'Error updating profile'
      });
    }
  }
);

/* CURRENT USER */
router.get(
  '/current',
  verifyToken,
  async (req, res) => {

    try {

      const user =
        await User.findById(
          req.user._id
        );

      if (!user) {

        return res.status(404).json({
          message:
            'User not found'
        });
      }

      res.status(200).json({
        success: true,
        user: {
          _id: user._id,
          email: user.email,
          username:
            user.username,
          role: user.role,
          profileImage:
            user.profileImage,
          bio: user.bio,
          profession:
            user.profession
        }
      });

    } catch (error) {

      console.error(
        'Error fetching user:',
        error
      );

      res.status(500).json({
        message:
          'Error fetching user'
      });
    }
  }
);

module.exports = router;