const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');
const { calculatePrice, calculateDeliveryDate } = require('../utils/calculations');

const router = express.Router();

// Generate tracking number
const generateTrackingNumber = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Calculate price and delivery date (preview)
router.post('/calculate', authMiddleware, [
  body('weight').isFloat({ min: 0.1 }),
  body('dimension_x').isFloat({ min: 0.1 }),
  body('dimension_y').isFloat({ min: 0.1 }),
  body('dimension_z').isFloat({ min: 0.1 }),
  body('destProvince').notEmpty()
], async (req, res) => {
  try {
    if (req.user.type !== 'sender') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { weight, dimension_x, dimension_y, dimension_z, destProvince } = req.body;

    // Get user's origin province from their most recent location
    const [userLocations] = await pool.execute(
      `SELECT l.Province
       FROM UserLocation ul
       INNER JOIN Location l ON ul.LocationID = l.LocationID
       WHERE ul.UserID = ?
       ORDER BY ul.CreatedAt DESC
       LIMIT 1`,
      [req.user.userID]
    );

    if (userLocations.length === 0 || !userLocations[0].Province) {
      return res.status(400).json({ message: 'Please add your address with province first' });
    }

    const originProvince = userLocations[0].Province;

    const price = await calculatePrice(weight, dimension_x, dimension_y, dimension_z, originProvince, destProvince);
    const deliveryDate = await calculateDeliveryDate(originProvince, destProvince);

    res.json({
      price,
      estimatedDeliveryDate: deliveryDate.toISOString()
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create Parcel
router.post('/', authMiddleware, [
  body('receiverName').notEmpty(),
  body('receiverPhone').notEmpty(),
  body('orgLocationID').isInt(),
  body('destAddress').notEmpty(),
  body('destDistrict').notEmpty(),
  body('destSubdistrict').notEmpty(),
  body('destProvince').notEmpty(),
  body('itemType').notEmpty().isIn(['Food', 'Frozen', 'Electronics', 'Clothing', 'Documents', 'Other']),
  body('SelectedPackageID').custom((value, { req }) => {
    if (req.body.useOwnPackage === true) {
      // If using own package, SelectedPackageID can be null or not provided
      return true;
    } else {
      // If not using own package, SelectedPackageID must be provided and be an integer
      if (value === null || value === undefined || value === '') {
        throw new Error('SelectedPackageID is required when not using own package');
      }
      if (!Number.isInteger(Number(value))) {
        throw new Error('SelectedPackageID must be an integer');
      }
      return true;
    }
  }),
  body('useOwnPackage').isBoolean()
], async (req, res) => {
  try {
    if (req.user.type !== 'sender') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      receiverName,
      receiverPhone,
      orgLocationID,
      destAddress,
      destDistrict,
      destSubdistrict,
      destProvince,
      destCountry = 'Thailand',
      itemType,
      SelectedPackageID,
      useOwnPackage
    } = req.body;

    // Check user balance and validate selected origin location
    const [users] = await pool.execute(
      `SELECT balance FROM User WHERE UserID = ?`,
      [req.user.userID]
    );

    // Get the selected origin location's province
    const [orgLocations] = await pool.execute(
      `SELECT l.Province 
       FROM Location l
       INNER JOIN UserLocation ul ON l.LocationID = ul.LocationID
       WHERE l.LocationID = ? AND ul.UserID = ?`,
      [orgLocationID, req.user.userID]
    );

    if (orgLocations.length === 0) {
      return res.status(400).json({ message: 'Selected pickup location not found or not associated with your account' });
    }

    if (!orgLocations[0].Province) {
      return res.status(400).json({ message: 'Selected location missing province information' });
    }

    const originProvince = orgLocations[0].Province;
    const trackingNumber = generateTrackingNumber();

    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      let packagePrice = 0;
      let selectedPackageId = null;

      // If user selected a package, charge for it
      if (!useOwnPackage && SelectedPackageID) {
        const [packages] = await connection.execute(
          'SELECT Price FROM PackageType WHERE PackageTypeID = ? AND IsActive = TRUE',
          [SelectedPackageID]
        );

        if (packages.length === 0) {
          await connection.rollback();
          return res.status(400).json({ message: 'Invalid package selected' });
        }

        packagePrice = parseFloat(packages[0].Price);
        selectedPackageId = SelectedPackageID;

        // Check if user has sufficient balance for package
        if (users[0].balance < packagePrice) {
          await connection.rollback();
          return res.status(400).json({ 
            message: 'Insufficient balance for package',
            required: packagePrice,
            current: users[0].balance
          });
        }

        // Deduct package price
        await connection.execute(
          'UPDATE User SET balance = balance - ? WHERE UserID = ?',
          [packagePrice, req.user.userID]
        );

        // Create transaction record for package
        await connection.execute(
          `INSERT INTO Transaction (UserID, Type, Amount, Status, Description)
           VALUES (?, ?, ?, ?, ?)`,
          [req.user.userID, 'Package', packagePrice, 'Completed', `Package purchase for parcel ${trackingNumber}`]
        );
      }

      // Check if destination location already exists
      const [existingDestLocations] = await connection.execute(
        `SELECT LocationID FROM Location 
         WHERE Address = ? AND District = ? AND Subdistrict = ? AND Province = ? AND Country = ?`,
        [destAddress, destDistrict, destSubdistrict, destProvince, destCountry || 'Thailand']
      );

      let destLocationID;

      if (existingDestLocations.length > 0) {
        // Reuse existing destination location
        destLocationID = existingDestLocations[0].LocationID;
      } else {
        // Create new destination location
        const [destLocationResult] = await connection.execute(
          `INSERT INTO Location (Address, District, Subdistrict, Province, Country)
           VALUES (?, ?, ?, ?, ?)`,
          [destAddress, destDistrict, destSubdistrict, destProvince, destCountry || 'Thailand']
        );
        destLocationID = destLocationResult.insertId;
      }

      // Create parcel WITHOUT price (will be calculated after carrier measures)
      const [result] = await connection.execute(
        `INSERT INTO Parcel (SenderID, TrackingNumber, receiverName, receiverPhone, 
         itemType, SelectedPackageID, PackagePrice, Status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending')`,
        [req.user.userID, trackingNumber, receiverName, receiverPhone, itemType, selectedPackageId, packagePrice]
      );

      // Create ParcelLocation associations
      await connection.execute(
        'INSERT INTO ParcelLocation (ParcelID, LocationID, LocationType) VALUES (?, ?, ?)',
        [result.insertId, orgLocationID, 'Origin']
      );

      await connection.execute(
        'INSERT INTO ParcelLocation (ParcelID, LocationID, LocationType) VALUES (?, ?, ?)',
        [result.insertId, destLocationID, 'Destination']
      );

      // Create initial shipment event
      await connection.execute(
        'INSERT INTO ShipmentEvent (ParcelID, EventType, Status, Description, LocationID) VALUES (?, ?, ?, ?, ?)',
        [result.insertId, 'Created', 'Pending', 'Parcel created - awaiting carrier pickup', orgLocationID]
      );

      // Create route for this parcel
      const [routeResult] = await connection.execute(
        `INSERT INTO Route (ParcelID, Status, RouteDate)
         VALUES (?, 'Planning', DATE_ADD(NOW(), INTERVAL 1 DAY))`,
        [result.insertId]
      );
      const routeID = routeResult.insertId;

      // Get random warehouses (2-4 warehouses) for route stops
      // First check how many warehouses are available
      const [warehouseCount] = await connection.execute(
        'SELECT COUNT(*) as count FROM Warehouse WHERE IsActive = TRUE'
      );
      
      const availableWarehouseCount = warehouseCount[0].count;
      
      let warehouses = [];
      if (availableWarehouseCount > 0) {
        // Calculate random number between 2 and 4 (inclusive), but not more than available
        const maxWarehouses = Math.min(availableWarehouseCount, 4);
        const minWarehouses = Math.min(2, availableWarehouseCount);
        const numberOfWarehouses = Math.floor(Math.random() * (maxWarehouses - minWarehouses + 1)) + minWarehouses;
        
        // MySQL doesn't support parameterized LIMIT, so we must use string interpolation
        // But we validate numberOfWarehouses is a safe integer first
        const safeLimit = parseInt(numberOfWarehouses, 10);
        if (isNaN(safeLimit) || safeLimit < 1 || safeLimit > 100) {
          throw new Error('Invalid warehouse limit value');
        }
        
        // Use string interpolation for LIMIT (safe because we validated the value)
        const warehouseQuery = `SELECT w.WarehouseID, w.Name, w.LocationID, l.Province
                                 FROM Warehouse w
                                 INNER JOIN Location l ON w.LocationID = l.LocationID
                                 WHERE w.IsActive = TRUE
                                 ORDER BY RAND()
                                 LIMIT ${safeLimit}`;
        
        const [warehouseResults] = await connection.execute(warehouseQuery);
        warehouses = warehouseResults;
      }

      // Create route stops
      // First stop: Origin location
      await connection.execute(
        `INSERT INTO RouteStop (RouteID, ParcelID, LocationID, Sequence, StopStatus, ETA)
         VALUES (?, ?, ?, 1, 'Pending', DATE_ADD(NOW(), INTERVAL 2 HOUR))`,
        [routeID, result.insertId, orgLocationID]
      );

      // Middle stops: Random warehouses
      let sequence = 2;
      for (const warehouse of warehouses) {
        const hoursOffset = sequence * 6; // Each stop 6 hours apart
        await connection.execute(
          `INSERT INTO RouteStop (RouteID, ParcelID, LocationID, WarehouseID, Sequence, StopStatus, ETA)
           VALUES (?, ?, ?, ?, ?, 'Pending', DATE_ADD(NOW(), INTERVAL ? HOUR))`,
          [routeID, result.insertId, warehouse.LocationID, warehouse.WarehouseID, sequence, hoursOffset]
        );
        sequence++;
      }

      // Last stop: Destination location
      await connection.execute(
        `INSERT INTO RouteStop (RouteID, ParcelID, LocationID, Sequence, StopStatus, ETA)
         VALUES (?, ?, ?, ?, 'Pending', DATE_ADD(NOW(), INTERVAL ? HOUR))`,
        [routeID, result.insertId, destLocationID, sequence, sequence * 6]
      );

      await connection.commit();

      res.status(201).json({
        message: 'Parcel created successfully',
        parcel: {
          parcelID: result.insertId,
          trackingNumber,
          packagePrice
        }
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

// Get all parcels for sender
router.get('/sender', authMiddleware, async (req, res) => {
  try {
    if (req.user.type !== 'sender') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const [parcels] = await pool.execute(
      `SELECT p.*, 
       ol.Address as orgAddress, ol.District as orgDistrict, ol.Province as orgProvince,
       dl.Address as destAddress, dl.District as destDistrict, dl.Province as destProvince,
       pa.Status as assignmentStatus, pa.CarrierID,
       c.firstname as carrierFirstName, c.lastname as carrierLastName
       FROM Parcel p
       LEFT JOIN ParcelLocation pol ON p.ParcelID = pol.ParcelID AND pol.LocationType = 'Origin'
       LEFT JOIN Location ol ON pol.LocationID = ol.LocationID
       LEFT JOIN ParcelLocation pdl ON p.ParcelID = pdl.ParcelID AND pdl.LocationType = 'Destination'
       LEFT JOIN Location dl ON pdl.LocationID = dl.LocationID
       LEFT JOIN ParcelAssignment pa ON p.ParcelID = pa.ParcelID
       LEFT JOIN Carrier c ON pa.CarrierID = c.CarrierID
       WHERE p.SenderID = ?
       ORDER BY p.CreatedAt DESC`,
      [req.user.userID]
    );

    res.json({ parcels });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get parcel by tracking number
router.get('/track/:trackingNumber', async (req, res) => {
  try {
    const { trackingNumber } = req.params;

    const [parcels] = await pool.execute(
      `SELECT p.*, 
       ol.Address as orgAddress, ol.District as orgDistrict, ol.Province as orgProvince,
       dl.Address as destAddress, dl.District as destDistrict, dl.Province as destProvince,
       pa.Status as assignmentStatus, pa.CarrierID
       FROM Parcel p
       LEFT JOIN ParcelLocation pol ON p.ParcelID = pol.ParcelID AND pol.LocationType = 'Origin'
       LEFT JOIN Location ol ON pol.LocationID = ol.LocationID
       LEFT JOIN ParcelLocation pdl ON p.ParcelID = pdl.ParcelID AND pdl.LocationType = 'Destination'
       LEFT JOIN Location dl ON pdl.LocationID = dl.LocationID
       LEFT JOIN ParcelAssignment pa ON p.ParcelID = pa.ParcelID
       WHERE p.TrackingNumber = ?`,
      [trackingNumber]
    );

    if (parcels.length === 0) {
      return res.status(404).json({ message: 'Parcel not found' });
    }

    // Get shipment events
    const [events] = await pool.execute(
      `SELECT se.*, l.Address, l.District, l.Province
       FROM ShipmentEvent se
       LEFT JOIN Location l ON se.LocationID = l.LocationID
       WHERE se.ParcelID = ?
       ORDER BY se.EventTime ASC`,
      [parcels[0].ParcelID]
    );

    // Exclude price information for public tracking
    const { Price, ...parcelWithoutPrice } = parcels[0];

    res.json({
      parcel: parcelWithoutPrice,
      events
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get parcel by ID
router.get('/:parcelID', authMiddleware, async (req, res) => {
  try {
    const { parcelID } = req.params;

    const [parcels] = await pool.execute(
      `SELECT p.*, 
       ol.Address as orgAddress, ol.District as orgDistrict, ol.Province as orgProvince,
       dl.Address as destAddress, dl.District as destDistrict, dl.Province as destProvince,
       pa.Status as assignmentStatus, pa.CarrierID,
       c.firstname as carrierFirstName, c.lastname as carrierLastName,
       pt.Name as packageName, pt.Type as packageType, pt.Size as packageSize,
       pt.dimension_x as packageDimensionX, pt.dimension_y as packageDimensionY, pt.dimension_z as packageDimensionZ,
       pt.Price as packageTypePrice
       FROM Parcel p
       LEFT JOIN ParcelLocation pol ON p.ParcelID = pol.ParcelID AND pol.LocationType = 'Origin'
       LEFT JOIN Location ol ON pol.LocationID = ol.LocationID
       LEFT JOIN ParcelLocation pdl ON p.ParcelID = pdl.ParcelID AND pdl.LocationType = 'Destination'
       LEFT JOIN Location dl ON pdl.LocationID = dl.LocationID
       LEFT JOIN ParcelAssignment pa ON p.ParcelID = pa.ParcelID
       LEFT JOIN Carrier c ON pa.CarrierID = c.CarrierID
       LEFT JOIN PackageType pt ON p.SelectedPackageID = pt.PackageTypeID
       WHERE p.ParcelID = ?`,
      [parcelID]
    );

    if (parcels.length === 0) {
      return res.status(404).json({ message: 'Parcel not found' });
    }

    // Check authorization
    if (req.user.type === 'sender' && parcels[0].SenderID !== req.user.userID) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Get shipment events
    const [events] = await pool.execute(
      `SELECT se.*, l.Address, l.District, l.Province
       FROM ShipmentEvent se
       LEFT JOIN Location l ON se.LocationID = l.LocationID
       WHERE se.ParcelID = ?
       ORDER BY se.EventTime ASC`,
      [parcelID]
    );

    res.json({
      parcel: parcels[0],
      events
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Notify carriers about available parcel
router.post('/:parcelID/notify', authMiddleware, async (req, res) => {
  try {
    if (req.user.type !== 'sender') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const { parcelID } = req.params;

    // Check if parcel belongs to sender
    const [parcels] = await pool.execute(
      'SELECT * FROM Parcel WHERE ParcelID = ? AND SenderID = ?',
      [parcelID, req.user.userID]
    );

    if (parcels.length === 0) {
      return res.status(404).json({ message: 'Parcel not found' });
    }

    // Get available carriers near the origin location
    const parcel = parcels[0];
    const [carriers] = await pool.execute(
      'SELECT CarrierID FROM Carrier WHERE isAvailable = TRUE'
    );

    // Create notifications for all available carriers
    const notifications = carriers.map(carrier => [
      null, // UserID
      carrier.CarrierID,
      'ParcelAvailable',
      'New Parcel Available',
      `A new parcel (${parcel.TrackingNumber}) is available for delivery`,
      false, // IsRead
      parcelID
    ]);

    if (notifications.length > 0) {
      await pool.query(
        `INSERT INTO Notification (UserID, CarrierID, Type, Title, Message, IsRead, ParcelID)
         VALUES ?`,
        [notifications]
      );
    }

    // Check if assignment already exists
    const [existingAssignments] = await pool.execute(
      'SELECT AssignmentID FROM ParcelAssignment WHERE ParcelID = ?',
      [parcelID]
    );

    // Create assignment record with pending status if it doesn't exist
    if (existingAssignments.length === 0) {
      await pool.execute(
        'INSERT INTO ParcelAssignment (ParcelID, Status) VALUES (?, ?)',
        [parcelID, 'Pending']
      );
    }

    // Keep status as 'Pending' (will change when carrier accepts)

    res.json({
      message: 'Carriers notified successfully',
      notifiedCount: carriers.length
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

