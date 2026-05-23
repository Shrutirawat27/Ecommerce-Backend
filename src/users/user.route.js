const jwt = require('jsonwebtoken');
const express = require('express');
const User = require('./user.model');
const generateToken = require('../middleware/generateToken');
const verifyToken = require('../middleware/verifyToken');
const requireAdmin = require('../middleware/requireAdmin');
const multer = require('multer');
const { cloudinary, storage } = require('../../config/cloudinary');

const router = express.Router();

const upload = multer({
  storage,
  limits: {
    fileSize: 1024 * 1024 * 5
  }
});

// Register
router.post('/register', async (req, res) => {
  try {

    const { username, email, password } = req.body;

    const user = new User({
      email,
      username,
      password
    });

    await user.save();

    res.status(201).send({
      message: "User registered successfully!"
    });

  } catch (error) {

    console.error("Error registering user", error);

    res.status(500).send({
      message: "Error registering user"
    });
  }
});

// Login
router.post('/login', async (req, res) => {

  const { email, password } = req.body;

  try {

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).send({
        message: "User not found"
      });
    }

    const isMatch =
      await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).send({
        message: "Password not match"
      });
    }

    const {
      accessToken,
      refreshToken
    } = await generateToken(
      user._id,
      user.role
    );

    const isProduction =
      process.env.NODE_ENV === "production";

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'None' : 'Lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.cookie('token', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'None' : 'Lax'
    });

    res.status(200).send({
      message: "Logged in successfully!",
      user: {
        _id: user._id,
        email: user.email,
        username: user.username,
        role: user.role,
        profileImage: user.profileImage,
        bio: user.bio,
        profession: user.profession
      }
    });

  } catch (error) {

    console.error("Error logging user", error);

    res.status(500).send({
      message: "Error logging user"
    });
  }
});

// Refresh token
router.post('/refresh-token', async (req, res) => {
  try {

    const refreshToken =
      req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        message: 'Refresh token is required'
      });
    }

    const refreshSecret =
      process.env.REFRESH_TOKEN_SECRET ||
      process.env.JWT_SECRET_KEY + '_refresh';

    const decoded = jwt.verify(
      refreshToken,
      refreshSecret
    );

    const user = await User.findById(
      decoded.userId
    );

    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    const {
      accessToken,
      refreshToken: newRefreshToken
    } = await generateToken(
      user._id,
      user.role
    );

    const isProduction =
      process.env.NODE_ENV === "production";

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'None' : 'Lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.cookie('token', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'None' : 'Lax'
    });

    res.status(200).json({
      message: 'Token refreshed successfully'
    });

  } catch (error) {

    console.error('Error refreshing token:', error);

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        message:
          'Refresh token expired, please login again'
      });
    }

    res.status(401).json({
      message: 'Invalid refresh token'
    });
  }
});

// Admin login
router.post('/admin/login', async (req, res) => {

  const { email, password } = req.body;

  try {

    if (
      email !== process.env.admin_email ||
      password !== process.env.admin_password
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    const refreshSecret =
      process.env.REFRESH_TOKEN_SECRET ||
      process.env.JWT_SECRET_KEY + '_refresh';

    const accessToken = jwt.sign(
      {
        email,
        role: 'admin'
      },
      process.env.JWT_SECRET_KEY,
      {
        expiresIn: '24h'
      }
    );

    const refreshToken = jwt.sign(
      {
        email,
        role: 'admin'
      },
      refreshSecret,
      {
        expiresIn: '7d'
      }
    );

    const isProduction =
      process.env.NODE_ENV === "production";

    res.cookie('token', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'None' : 'Lax'
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'None' : 'Lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.status(200).json({
      success: true,
      message: "Admin login successful"
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

// Logout
router.post("/logout", (req, res) => {

  const isProduction =
    process.env.NODE_ENV === "production";

  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "None" : "Lax"
  });

  res.clearCookie("token", {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "None" : "Lax"
  });

  return res.status(200).send({
    message: "Logged out successfully!"
  });
});

// Delete user
router.delete(
  "/users/:_id",
  verifyToken,
  requireAdmin,
  async (req, res) => {

    try {

      const { _id } = req.params;

      const user =
        await User.findByIdAndDelete(_id);

      if (!user) {
        return res.status(404).send({
          message: "User not found"
        });
      }

      res.status(200).send({
        message: "User deleted successfully"
      });

    } catch (error) {

      console.error("Error deleting user", error);

      res.status(500).send({
        message: "Error deleting user"
      });
    }
  }
);

// Get all users
router.get(
  "/users",
  verifyToken,
  requireAdmin,
  async (req, res) => {

    try {

      const users = await User.find(
        {},
        "id email role"
      ).sort({
        createdAt: -1
      });

      res.status(200).send(users);

    } catch (error) {

      console.error("Error fetching users", error);

      res.status(500).send({
        message: "Error fetching users"
      });
    }
  }
);

// Update user role
router.put(
  "/users/:_id",
  verifyToken,
  requireAdmin,
  async (req, res) => {

    try {

      const { _id } = req.params;

      const { role } = req.body;

      const user =
        await User.findByIdAndUpdate(
          _id,
          { role },
          { new: true }
        );

      if (!user) {
        return res.status(404).send({
          message: "User not found"
        });
      }

      res.status(200).send({
        message: "User role updated",
        user
      });

    } catch (error) {

      console.error("Error updating role", error);

      res.status(500).send({
        message: "Error updating user role"
      });
    }
  }
);

// Update profile
router.patch(
  "/edit-profile",
  verifyToken,
  upload.single("profileImage"),
  async (req, res) => {

    try {

      const userId = req.user._id;

      const {
        username,
        profileImageUrl,
        bio,
        profession
      } = req.body;

      const user =
        await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          message: "User not found"
        });
      }

      if (username !== undefined) {
        user.username = username;
      }

      if (bio !== undefined) {
        user.bio = bio;
      }

      if (profession !== undefined) {
        user.profession = profession;
      }

      if (req.file && req.file.path) {
        user.profileImage = req.file.path;
      } else if (profileImageUrl) {
        user.profileImage = profileImageUrl;
      }

      await user.save();

      res.status(200).json({
        message:
          "Profile updated successfully!",
        user: {
          _id: user._id,
          email: user.email,
          username: user.username,
          role: user.role,
          profileImage: user.profileImage,
          bio: user.bio,
          profession: user.profession
        }
      });

    } catch (error) {

      console.error(
        "Error updating profile:",
        error
      );

      res.status(500).json({
        message: "Error updating profile",
        error: error.message
      });
    }
  }
);

// Get current user
router.get(
  "/current",
  verifyToken,
  async (req, res) => {

    try {

      const userId = req.user._id;

      const user =
        await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          message: "User not found"
        });
      }

      res.status(200).json({
        success: true,
        user: {
          _id: user._id,
          email: user.email,
          username: user.username,
          role: user.role,
          profileImage: user.profileImage,
          bio: user.bio,
          profession: user.profession
        }
      });

    } catch (error) {

      console.error(
        "Error fetching user:",
        error
      );

      res.status(500).json({
        message: "Error fetching user",
        error: error.message
      });
    }
  }
);

module.exports = router;