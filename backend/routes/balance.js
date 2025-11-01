const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Get user balance
router.get('/', authMiddleware, async (req, res) => {
  try {
    if (req.user.type !== 'sender') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const [users] = await pool.execute(
      'SELECT balance FROM User WHERE UserID = ?',
      [req.user.userID]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ balance: parseFloat(users[0].balance) || 0 });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Topup balance
router.post('/topup', authMiddleware, [
  body('amount').isFloat({ min: 1 }),
  body('bankID').isInt(),
  body('reference').optional()
], async (req, res) => {
  try {
    if (req.user.type !== 'sender') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { amount, bankID, reference } = req.body;

    // Verify bank exists
    const [banks] = await pool.execute(
      'SELECT * FROM Bank WHERE BankID = ? AND IsActive = TRUE',
      [bankID]
    );

    if (banks.length === 0) {
      return res.status(400).json({ message: 'Invalid bank' });
    }

    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Update user balance
      await connection.execute(
        'UPDATE User SET balance = balance + ? WHERE UserID = ?',
        [amount, req.user.userID]
      );

      // Create transaction record
      const [transactionResult] = await connection.execute(
        `INSERT INTO Transaction (UserID, BankID, Type, Amount, Status, Reference, Description)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          req.user.userID,
          bankID,
          'Topup',
          amount,
          'Completed',
          reference || `TOPUP-${Date.now()}`,
          `Topup via ${banks[0].Name}`
        ]
      );

      // Get updated balance
      const [users] = await connection.execute(
        'SELECT balance FROM User WHERE UserID = ?',
        [req.user.userID]
      );

      await connection.commit();

      res.json({
        message: 'Topup successful',
        transactionID: transactionResult.insertId,
        amount: parseFloat(amount),
        newBalance: parseFloat(users[0].balance)
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get transaction history
router.get('/transactions', authMiddleware, async (req, res) => {
  try {
    if (req.user.type !== 'sender') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const [transactions] = await pool.execute(
      `SELECT t.*, b.Name as BankName
       FROM Transaction t
       LEFT JOIN Bank b ON t.BankID = b.BankID
       WHERE t.UserID = ?
       ORDER BY t.CreatedAt DESC
       LIMIT 50`,
      [req.user.userID]
    );

    res.json({ transactions });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

