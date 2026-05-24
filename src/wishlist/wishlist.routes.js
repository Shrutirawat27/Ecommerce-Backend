const express = require('express');

const verifyToken = require('../middleware/verifyToken');

const {
  getWishlist,
  toggleWishlist
} = require('./wishlist.controller');

const router = express.Router();

router.get(
  '/',
  verifyToken,
  getWishlist
);

router.post(
  '/toggle',
  verifyToken,
  toggleWishlist
);

module.exports = router;