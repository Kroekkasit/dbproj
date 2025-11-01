const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');

const router = express.Router();

// Generate JWT Token
const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET || 'your_secret_key_here', {
    expiresIn: '7d'
  });
};

// Register Sender
router.post('/sender/register', [
  body('email').isEmail().normalizeEmail(),
  body('phone').notEmpty(),
  body('firstname').notEmpty().trim(),
  body('lastname').notEmpty().trim(),
  body('password').isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, phone, firstname, lastname, password } = req.body;

    // Check if user exists
    const [existingUser] = await pool.execute(
      'SELECT * FROM User WHERE email = ?',
      [email]
    );

    if (existingUser.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const [result] = await pool.execute(
      'INSERT INTO User (email, phone, firstname, lastname, password, Username) VALUES (?, ?, ?, ?, ?, ?)',
      [email, phone, firstname, lastname, hashedPassword, email]
    );

    const token = generateToken({
      userID: result.insertId,
      type: 'sender'
    });

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        userID: result.insertId,
        email,
        firstname,
        lastname,
        phone
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login Sender
router.post('/sender/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    const [users] = await pool.execute(
      'SELECT * FROM User WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const user = users[0];

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = generateToken({
      userID: user.UserID,
      type: 'sender'
    });

    res.json({
      message: 'Login successful',
      token,
      user: {
        userID: user.UserID,
        email: user.email,
        firstname: user.firstname,
        lastname: user.lastname,
        phone: user.phone,
        hasAddress: !!user.LocationID,
        balance: parseFloat(user.balance) || 0
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Register Carrier
router.post('/carrier/register', [
  body('email').isEmail().normalizeEmail(),
  body('phone').notEmpty(),
  body('firstname').notEmpty().trim(),
  body('lastname').notEmpty().trim(),
  body('password').isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, phone, firstname, lastname, password, vehInfo, vehLicense, EmploymentType } = req.body;

    const [existingCarrier] = await pool.execute(
      'SELECT * FROM Carrier WHERE email = ?',
      [email]
    );

    if (existingCarrier.length > 0) {
      return res.status(400).json({ message: 'Carrier already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await pool.execute(
      'INSERT INTO Carrier (email, phone, firstname, lastname, password, vehInfo, vehLicense, EmploymentType) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [email, phone, firstname, lastname, hashedPassword, vehInfo, vehLicense, EmploymentType]
    );

    const token = generateToken({
      carrierID: result.insertId,
      type: 'carrier'
    });

    res.status(201).json({
      message: 'Carrier registered successfully',
      token,
      carrier: {
        carrierID: result.insertId,
        email,
        firstname,
        lastname,
        phone
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login Carrier
router.post('/carrier/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    const [carriers] = await pool.execute(
      'SELECT * FROM Carrier WHERE email = ?',
      [email]
    );

    if (carriers.length === 0) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const carrier = carriers[0];

    const isMatch = await bcrypt.compare(password, carrier.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = generateToken({
      carrierID: carrier.CarrierID,
      type: 'carrier'
    });

    res.json({
      message: 'Login successful',
      token,
      carrier: {
        carrierID: carrier.CarrierID,
        email: carrier.email,
        firstname: carrier.firstname,
        lastname: carrier.lastname,
        phone: carrier.phone,
        isAvailable: carrier.isAvailable
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

