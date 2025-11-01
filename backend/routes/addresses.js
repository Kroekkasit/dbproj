const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Create address
router.post('/', authMiddleware, [
  body('Address').notEmpty(),
  body('District').notEmpty(),
  body('Subdistrict').notEmpty(),
  body('Province').notEmpty(),
  body('Country').notEmpty(),
  body('Name').notEmpty()
], async (req, res) => {
  try {
    if (req.user.type !== 'sender') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    const { Name, Address, District, Subdistrict, Province, Country, latitude, longitude } = req.body;

    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Check if location already exists
      const [existingLocations] = await connection.execute(
        `SELECT LocationID FROM Location 
         WHERE Address = ? AND District = ? AND Subdistrict = ? AND Province = ? AND Country = ?`,
        [Address, District, Subdistrict, Province, Country || 'Thailand']
      );

      let locationID;

      if (existingLocations.length > 0) {
        // Reuse existing location
        locationID = existingLocations[0].LocationID;
      } else {
        // Create new location
        const [result] = await connection.execute(
          `INSERT INTO Location (Address, District, Subdistrict, Province, Country, latitude, longitude)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [Address, District, Subdistrict, Province, Country || 'Thailand', latitude || null, longitude || null]
        );
        locationID = result.insertId;
      }

      // Create or update user-location association
      const [existingAssociations] = await connection.execute(
        'SELECT UserLocationID FROM UserLocation WHERE UserID = ? AND LocationID = ?',
        [req.user.userID, locationID]
      );

      if (existingAssociations.length > 0) {
        // Update existing association name
        await connection.execute(
          'UPDATE UserLocation SET Name = ? WHERE UserLocationID = ?',
          [Name, existingAssociations[0].UserLocationID]
        );
      } else {
        // Create new association
        await connection.execute(
          'INSERT INTO UserLocation (UserID, LocationID, Name) VALUES (?, ?, ?)',
          [req.user.userID, locationID, Name]
        );
      }

      await connection.commit();

      res.status(201).json({
        message: 'Address created successfully',
        location: {
          locationID,
          Name,
          Address,
          District,
          Subdistrict,
          Province
        }
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Address creation error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// Get user's address (primary/default address)
router.get('/me', authMiddleware, async (req, res) => {
  try {
    if (req.user.type !== 'sender') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Get the first user location association (or most recent)
    const [userLocations] = await pool.execute(
      `SELECT ul.Name, ul.LocationID, l.Address, l.District, l.Subdistrict, l.Province, l.Country, 
       l.latitude, l.longitude
       FROM UserLocation ul
       INNER JOIN Location l ON ul.LocationID = l.LocationID
       WHERE ul.UserID = ?
       ORDER BY ul.CreatedAt DESC
       LIMIT 1`,
      [req.user.userID]
    );

    if (userLocations.length === 0) {
      return res.json({ address: null });
    }

    res.json({ address: userLocations[0] });
  } catch (error) {
    console.error('Address creation error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// Update address (updates the primary/default address)
router.put('/me', authMiddleware, [
  body('Address').notEmpty(),
  body('District').notEmpty(),
  body('Subdistrict').notEmpty(),
  body('Province').notEmpty(),
  body('Name').notEmpty()
], async (req, res) => {
  try {
    if (req.user.type !== 'sender') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    const { Name, Address, District, Subdistrict, Province, Country, latitude, longitude } = req.body;

    // Get user's first location association
    const [userLocations] = await pool.execute(
      'SELECT LocationID FROM UserLocation WHERE UserID = ? ORDER BY CreatedAt DESC LIMIT 1',
      [req.user.userID]
    );

    if (userLocations.length === 0) {
      return res.status(404).json({ message: 'Address not found' });
    }

    const oldLocationID = userLocations[0].LocationID;

    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Check if new location already exists
      const [existingLocations] = await connection.execute(
        `SELECT LocationID FROM Location 
         WHERE Address = ? AND District = ? AND Subdistrict = ? AND Province = ? AND Country = ?`,
        [Address, District, Subdistrict, Province, Country || 'Thailand']
      );

      let locationID;

      if (existingLocations.length > 0) {
        locationID = existingLocations[0].LocationID;
      } else {
        // Create new location
        const [result] = await connection.execute(
          `INSERT INTO Location (Address, District, Subdistrict, Province, Country, latitude, longitude)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [Address, District, Subdistrict, Province, Country || 'Thailand', latitude || null, longitude || null]
        );
        locationID = result.insertId;
      }

      // Update or create association
      if (locationID === oldLocationID) {
        // Same location, just update the name
        await connection.execute(
          'UPDATE UserLocation SET Name = ? WHERE UserID = ? AND LocationID = ?',
          [Name, req.user.userID, locationID]
        );
      } else {
        // Different location, check if association exists
        const [existingAssociations] = await connection.execute(
          'SELECT UserLocationID FROM UserLocation WHERE UserID = ? AND LocationID = ?',
          [req.user.userID, locationID]
        );

        if (existingAssociations.length > 0) {
          // Update existing association
          await connection.execute(
            'UPDATE UserLocation SET Name = ? WHERE UserLocationID = ?',
            [Name, existingAssociations[0].UserLocationID]
          );
        } else {
          // Create new association and delete old one
          await connection.execute(
            'INSERT INTO UserLocation (UserID, LocationID, Name) VALUES (?, ?, ?)',
            [req.user.userID, locationID, Name]
          );
          await connection.execute(
            'DELETE FROM UserLocation WHERE UserID = ? AND LocationID = ?',
            [req.user.userID, oldLocationID]
          );
          // Delete old location if no one else is using it
          // Check if any other users are using this location, or if it's used by parcels, warehouses, or route stops
          const [otherUsers] = await connection.execute(
            'SELECT COUNT(*) as count FROM UserLocation WHERE LocationID = ?',
            [oldLocationID]
          );
          const [parcelLocations] = await connection.execute(
            'SELECT COUNT(*) as count FROM ParcelLocation WHERE LocationID = ?',
            [oldLocationID]
          );
          const [warehouses] = await connection.execute(
            'SELECT COUNT(*) as count FROM Warehouse WHERE LocationID = ?',
            [oldLocationID]
          );
          const [routeStops] = await connection.execute(
            'SELECT COUNT(*) as count FROM RouteStop WHERE LocationID = ?',
            [oldLocationID]
          );
          
          // Only delete if not used by anyone/anything else
          if (otherUsers[0].count === 0 && parcelLocations[0].count === 0 && 
              warehouses[0].count === 0 && routeStops[0].count === 0) {
            await connection.execute('DELETE FROM Location WHERE LocationID = ?', [oldLocationID]);
          }
        }
      }

      await connection.commit();

      res.json({ message: 'Address updated successfully' });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Address creation error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// Get all locations associated with the logged-in user (for creating parcels)
router.get('/locations', authMiddleware, async (req, res) => {
  try {
    if (req.user.type !== 'sender') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const [locations] = await pool.execute(
      `SELECT ul.UserLocationID, ul.Name, ul.LocationID, 
       l.Address, l.District, l.Subdistrict, l.Province, l.Country, 
       l.latitude, l.longitude, l.CreatedAt, l.UpdatedAt
       FROM UserLocation ul
       INNER JOIN Location l ON ul.LocationID = l.LocationID
       WHERE ul.UserID = ?
       ORDER BY ul.Name ASC`,
      [req.user.userID]
    );

    res.json({ locations });
  } catch (error) {
    console.error('Address creation error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// Get all addresses for the user (same as /locations but clearer name)
router.get('/all', authMiddleware, async (req, res) => {
  try {
    if (req.user.type !== 'sender') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const [locations] = await pool.execute(
      `SELECT ul.UserLocationID, ul.Name, ul.LocationID, 
       l.Address, l.District, l.Subdistrict, l.Province, l.Country, 
       l.latitude, l.longitude, ul.CreatedAt, ul.UpdatedAt
       FROM UserLocation ul
       INNER JOIN Location l ON ul.LocationID = l.LocationID
       WHERE ul.UserID = ?
       ORDER BY ul.CreatedAt DESC`,
      [req.user.userID]
    );

    res.json({ addresses: locations });
  } catch (error) {
    console.error('Get addresses error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// Update a specific address by UserLocationID
router.put('/:userLocationID', authMiddleware, [
  body('Address').notEmpty(),
  body('District').notEmpty(),
  body('Subdistrict').notEmpty(),
  body('Province').notEmpty(),
  body('Name').notEmpty()
], async (req, res) => {
  try {
    if (req.user.type !== 'sender') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    const { userLocationID } = req.params;
    const { Name, Address, District, Subdistrict, Province, Country, latitude, longitude } = req.body;

    // Verify the address belongs to the user
    const [userLocations] = await pool.execute(
      'SELECT LocationID FROM UserLocation WHERE UserLocationID = ? AND UserID = ?',
      [userLocationID, req.user.userID]
    );

    if (userLocations.length === 0) {
      return res.status(404).json({ message: 'Address not found' });
    }

    const oldLocationID = userLocations[0].LocationID;

    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Check if new location already exists
      const [existingLocations] = await connection.execute(
        `SELECT LocationID FROM Location 
         WHERE Address = ? AND District = ? AND Subdistrict = ? AND Province = ? AND Country = ?`,
        [Address, District, Subdistrict, Province, Country || 'Thailand']
      );

      let locationID;

      if (existingLocations.length > 0) {
        locationID = existingLocations[0].LocationID;
      } else {
        // Create new location
        const [result] = await connection.execute(
          `INSERT INTO Location (Address, District, Subdistrict, Province, Country, latitude, longitude)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [Address, District, Subdistrict, Province, Country || 'Thailand', latitude || null, longitude || null]
        );
        locationID = result.insertId;
      }

      // Update or create association
      if (locationID === oldLocationID) {
        // Same location, just update the name
        await connection.execute(
          'UPDATE UserLocation SET Name = ? WHERE UserLocationID = ?',
          [Name, userLocationID]
        );
      } else {
        // Different location, check if association exists
        const [existingAssociations] = await connection.execute(
          'SELECT UserLocationID FROM UserLocation WHERE UserID = ? AND LocationID = ?',
          [req.user.userID, locationID]
        );

        if (existingAssociations.length > 0) {
          // Delete the old association (user already has this location with different name)
          await connection.execute(
            'DELETE FROM UserLocation WHERE UserLocationID = ?',
            [userLocationID]
          );
          // Update the existing association's name
          await connection.execute(
            'UPDATE UserLocation SET Name = ? WHERE UserLocationID = ?',
            [Name, existingAssociations[0].UserLocationID]
          );
        } else {
          // Update association to point to new location
          await connection.execute(
            'UPDATE UserLocation SET LocationID = ?, Name = ? WHERE UserLocationID = ?',
            [locationID, Name, userLocationID]
          );
        }
      }

      await connection.commit();

      res.json({ message: 'Address updated successfully' });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Address update error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// Delete a specific address
router.delete('/:userLocationID', authMiddleware, async (req, res) => {
  try {
    if (req.user.type !== 'sender') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const { userLocationID } = req.params;

    // Verify the address belongs to the user
    const [userLocations] = await pool.execute(
      'SELECT LocationID FROM UserLocation WHERE UserLocationID = ? AND UserID = ?',
      [userLocationID, req.user.userID]
    );

    if (userLocations.length === 0) {
      return res.status(404).json({ message: 'Address not found' });
    }

    const locationID = userLocations[0].LocationID;

    // Delete the user-location association
    await pool.execute(
      'DELETE FROM UserLocation WHERE UserLocationID = ?',
      [userLocationID]
    );

    // Check if any other users are using this location, or if it's used by parcels, warehouses, or route stops
    const [otherUsers] = await pool.execute(
      'SELECT COUNT(*) as count FROM UserLocation WHERE LocationID = ?',
      [locationID]
    );
    const [parcelLocations] = await pool.execute(
      'SELECT COUNT(*) as count FROM ParcelLocation WHERE LocationID = ?',
      [locationID]
    );
    const [warehouses] = await pool.execute(
      'SELECT COUNT(*) as count FROM Warehouse WHERE LocationID = ?',
      [locationID]
    );
    const [routeStops] = await pool.execute(
      'SELECT COUNT(*) as count FROM RouteStop WHERE LocationID = ?',
      [locationID]
    );

    // Only delete if not used by anyone/anything else
    if (otherUsers[0].count === 0 && parcelLocations[0].count === 0 && 
        warehouses[0].count === 0 && routeStops[0].count === 0) {
      await pool.execute('DELETE FROM Location WHERE LocationID = ?', [locationID]);
    }

    res.json({ message: 'Address deleted successfully' });
  } catch (error) {
    console.error('Address deletion error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

module.exports = router;

