const express = require('express');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Get notifications for sender
router.get('/sender', authMiddleware, async (req, res) => {
  try {
    if (req.user.type !== 'sender') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const [notifications] = await pool.execute(
      `SELECT n.*, p.TrackingNumber
       FROM Notification n
       LEFT JOIN Parcel p ON n.ParcelID = p.ParcelID
       WHERE n.UserID = ?
       ORDER BY n.CreatedAt DESC
       LIMIT 50`,
      [req.user.userID]
    );

    res.json({ notifications });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get notifications for carrier
router.get('/carrier', authMiddleware, async (req, res) => {
  try {
    if (req.user.type !== 'carrier') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const [notifications] = await pool.execute(
      `SELECT n.*, p.TrackingNumber
       FROM Notification n
       LEFT JOIN Parcel p ON n.ParcelID = p.ParcelID
       WHERE n.CarrierID = ?
       ORDER BY n.CreatedAt DESC
       LIMIT 50`,
      [req.user.carrierID]
    );

    res.json({ notifications });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark notification as read
router.put('/:notificationID/read', authMiddleware, async (req, res) => {
  try {
    const { notificationID } = req.params;

    // Check ownership
    if (req.user.type === 'sender') {
      await pool.execute(
        'UPDATE Notification SET IsRead = TRUE WHERE NotificationID = ? AND UserID = ?',
        [notificationID, req.user.userID]
      );
    } else if (req.user.type === 'carrier') {
      await pool.execute(
        'UPDATE Notification SET IsRead = TRUE WHERE NotificationID = ? AND CarrierID = ?',
        [notificationID, req.user.carrierID]
      );
    } else {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark all notifications as read
router.put('/read-all', authMiddleware, async (req, res) => {
  try {
    if (req.user.type === 'sender') {
      await pool.execute(
        'UPDATE Notification SET IsRead = TRUE WHERE UserID = ?',
        [req.user.userID]
      );
    } else if (req.user.type === 'carrier') {
      await pool.execute(
        'UPDATE Notification SET IsRead = TRUE WHERE CarrierID = ?',
        [req.user.carrierID]
      );
    } else {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

