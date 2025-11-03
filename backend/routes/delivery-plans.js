const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');

// Get all active delivery plans
router.get('/', authMiddleware, async (req, res) => {
  try {
    const [plans] = await pool.execute(
      'SELECT * FROM DeliveryPlan WHERE IsActive = TRUE ORDER BY PlanID ASC'
    );

    res.json({ plans });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get specific delivery plan by ID
router.get('/:planID', authMiddleware, async (req, res) => {
  try {
    const { planID } = req.params;

    const [plans] = await pool.execute(
      'SELECT * FROM DeliveryPlan WHERE PlanID = ? AND IsActive = TRUE',
      [planID]
    );

    if (plans.length === 0) {
      return res.status(404).json({ message: 'Delivery plan not found' });
    }

    res.json({ plan: plans[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

