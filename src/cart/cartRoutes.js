const express = require('express');
const { getCart, updateCart, clearCart } = require('./cartController');
const verifyToken = require('../middleware/verifyToken');

const router = express.Router();

router.get('/', verifyToken, getCart);
router.put('/', verifyToken, updateCart);
router.delete('/', verifyToken, clearCart);

module.exports = router;
