const express = require('express');
const pool = require('../config/database');

const router = express.Router();

// Get all active package types
router.get('/', async (req, res) => {
  try {
    const [packages] = await pool.execute(
      'SELECT * FROM PackageType WHERE IsActive = TRUE ORDER BY Type, Size'
    );

    res.json({ packages });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

