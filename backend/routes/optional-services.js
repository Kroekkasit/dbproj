const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');

// Get all active optional services
router.get('/', authMiddleware, async (req, res) => {
  try {
    const [services] = await pool.execute(
      'SELECT * FROM OptionalService WHERE IsActive = TRUE ORDER BY ServiceID ASC'
    );

    res.json({ services });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get specific optional service by ID
router.get('/:serviceID', authMiddleware, async (req, res) => {
  try {
    const { serviceID } = req.params;

    const [services] = await pool.execute(
      'SELECT * FROM OptionalService WHERE ServiceID = ? AND IsActive = TRUE',
      [serviceID]
    );

    if (services.length === 0) {
      return res.status(404).json({ message: 'Optional service not found' });
    }

    res.json({ service: services[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

