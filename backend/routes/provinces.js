const express = require('express');
const pool = require('../config/database');

const router = express.Router();

// Get all provinces
router.get('/', async (req, res) => {
  try {
    const [provinces] = await pool.execute(
      'SELECT * FROM Province ORDER BY Name ASC'
    );

    res.json({ provinces });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

