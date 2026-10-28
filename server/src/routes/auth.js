const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const { login, register, getMe, logout } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { validate, loginSchema, registerSchema } = require('../middleware/validation');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 1000 : 10,
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/logout', logout);
router.get('/me', authenticate, getMe);

module.exports = router;

