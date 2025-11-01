const express = require('express');
const pool = require('../config/database');

const router = express.Router();

// Get all active banks
router.get('/', async (req, res) => {
  try {
    const [banks] = await pool.execute(
      'SELECT * FROM Bank WHERE IsActive = TRUE ORDER BY Name ASC'
    );

    res.json({ banks });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

